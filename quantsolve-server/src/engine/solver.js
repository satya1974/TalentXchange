// engine/solver.js
// Three-layer pruning strategy:
//   Layer 1: Budget ceiling      — maxVal = floor(remaining / coeff)
//   Layer 2: Suffix min/max      — precomputed O(1) remainder-bounds check
//   Layer 3: Parity step         — step=2 for even/odd constraints
//
// DESIGN: Solver finds ALL valid combinations — no hard cap.
// Response is PAGINATED. Caller sends page + pageSize; response is small.
// totalFound always = the TRUE complete count of all valid combinations.

const { EngineError, ErrorCode } = require("./errors");

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}
function gcdArray(arr) {
    return arr.reduce((acc, val) => gcd(acc, val));
}

function isSearchSpaceViable(
    orderedCoeffs,
    orderedConstraints,
    target,
    suffixMax,
) {
    const n = orderedCoeffs.length;
    let nodesVisited = 0;
    const NODE_LIMIT = 10_000_000;

    function probe(depth, remaining) {
        nodesVisited++;
        if (nodesVisited > NODE_LIMIT) return;
        if (remaining < 0 || remaining > suffixMax[depth]) return;
        if (depth === n - 1) return;
        const c = orderedConstraints[depth];
        const coeff = orderedCoeffs[depth];
        const hi = Math.min(c.hi, Math.floor(remaining / coeff));
        for (let xi = c.start; xi <= hi; xi += c.step) {
            probe(depth + 1, remaining - coeff * xi);
            if (nodesVisited > NODE_LIMIT) return;
        }
    }

    probe(0, target);
    return nodesVisited <= NODE_LIMIT;
}

function solve(coeffs, target, userConstraints = {}, options = {}) {
    const {
        buildConstraints,
        applyExactValues,
    } = require("./constraintEngine");

    // 1. Exact-value substitution
    const rawConstraints = buildConstraints(coeffs, target, userConstraints);
    const { reducedCoeffs, reducedTarget, fixedAssignments } = applyExactValues(
        coeffs,
        target,
        rawConstraints,
    );

    if (Object.keys(reducedCoeffs).length === 0) {
        if (reducedTarget === 0)
            return {
                solutions: [fixedAssignments],
                totalFound: 1,
                page: 1,
                pageSize: 1,
                totalPages: 1,
                hasMore: false,
                capped: false,
            };
        return {
            solutions: [],
            totalFound: 0,
            page: 1,
            pageSize: 50,
            totalPages: 0,
            hasMore: false,
            capped: false,
        };
    }

    // 2. Constraints for reduced system
    const constraints = buildConstraints(
        reducedCoeffs,
        reducedTarget,
        userConstraints,
    );

    // 3. GCD pre-filter — instant rejection O(V log M)
    const g = gcdArray(Object.values(reducedCoeffs));
    if (reducedTarget % g !== 0) throw new EngineError(ErrorCode.NO_SOLUTIONS);

    // 4. Sort by coefficient descending — maximises early pruning
    const orderedVars = Object.keys(reducedCoeffs).sort(
        (a, b) => reducedCoeffs[b] - reducedCoeffs[a],
    );
    const orderedCoeffsArr = orderedVars.map((v) => reducedCoeffs[v]);
    const orderedConstraints = orderedVars.map((v) => constraints[v]);
    const n = orderedVars.length;

    // 5. Suffix min/max precompute — O(V), O(1) per node
    const suffixMin = new Array(n + 1).fill(0);
    const suffixMax = new Array(n + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        const c = orderedConstraints[i];
        suffixMin[i] = suffixMin[i + 1] + orderedCoeffsArr[i] * c.lo;
        suffixMax[i] = suffixMax[i + 1] + orderedCoeffsArr[i] * c.hi;
    }

    // 6. Viability check — DFS probe, not naive Cartesian product
    if (
        !isSearchSpaceViable(
            orderedCoeffsArr,
            orderedConstraints,
            reducedTarget,
            suffixMax,
        )
    ) {
        throw new EngineError(ErrorCode.UNBOUNDED_SEARCH);
    }

    // 7. Backtracker — finds ALL valid combinations (no cap)
    const allResults = [];

    function backtrack(depth, remaining, partial) {
        // Layer 2: suffix bounds prune
        if (remaining < suffixMin[depth] || remaining > suffixMax[depth])
            return;

        const v = orderedVars[depth];
        const coeff = orderedCoeffsArr[depth];
        const c = orderedConstraints[depth];

        // Layer 1: budget ceiling
        const effectiveHi = Math.min(c.hi, Math.floor(remaining / coeff));
        if (c.start > effectiveHi) return;

        if (depth === n - 1) {
            // Base case: check exact zero remainder (Layer 3 parity baked into c.step)
            for (let xi = c.start; xi <= effectiveHi; xi += c.step) {
                if (remaining - coeff * xi === 0) {
                    allResults.push({
                        ...partial,
                        [v]: xi,
                        ...fixedAssignments,
                    });
                }
            }
            return;
        }

        for (let xi = c.start; xi <= effectiveHi; xi += c.step) {
            backtrack(depth + 1, remaining - coeff * xi, {
                ...partial,
                [v]: xi,
            });
        }
    }

    backtrack(0, reducedTarget, {});

    // 8. Sort by original equation variable order
    const originalOrder = Object.keys(coeffs);
    allResults.sort((a, b) => {
        for (const varName of originalOrder) {
            const diff = (a[varName] ?? 0) - (b[varName] ?? 0);
            if (diff !== 0) return diff;
        }
        return 0;
    });

    const totalFound = allResults.length;

    // 9. Paginate — only send the requested page in the HTTP response.
    //    This keeps response size tiny regardless of how many total solutions exist.
    //    The frontend fetches subsequent pages on demand (scroll / page button).
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(200, Math.max(1, options.pageSize || 50));
    const startIdx = (page - 1) * pageSize;
    const pageSolutions = allResults.slice(startIdx, startIdx + pageSize);
    const totalPages = Math.ceil(totalFound / pageSize) || 1;

    return {
        solutions: pageSolutions, // only this page — small response
        totalFound, // true total (e.g. 352,800 for 5-var example)
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
        capped: false, // never capped — always paginated
    };
}

module.exports = solve;
