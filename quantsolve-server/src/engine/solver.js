// engine/solver.js
// Three-layer pruning strategy:
//   Layer 1: Budget ceiling      — maxVal = floor(remaining / coeff)
//   Layer 2: Suffix min/max      — precomputed O(1) remainder-bounds check
//   Layer 3: Parity step         — step=2 for even/odd constraints

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

// ─── Viability probe ───────────────────────────────────────────────────────────
// Runs a fast DFS counting actual pruned nodes — NOT the naive Cartesian product.
// This correctly allows large equations like 10a+15b+20c+50d+5e=1000 that look
// enormous (1.4B naive) but prune down to ~350K real nodes in practice.
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

// ─── Main solve ───────────────────────────────────────────────────────────────
function solve(coeffs, target, userConstraints = {}, options = {}) {
    const {
        buildConstraints,
        applyExactValues,
    } = require("./constraintEngine");

    // 1. Exact-value substitution — pin variables and reduce the system
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
                count: 1,
                totalFound: 1,
                capped: false,
            };
        return { solutions: [], count: 0, totalFound: 0, capped: false };
    }

    // 2. Constraints for the reduced system
    const constraints = buildConstraints(
        reducedCoeffs,
        reducedTarget,
        userConstraints,
    );

    // 3. GCD pre-filter — O(V log M), instant rejection
    const g = gcdArray(Object.values(reducedCoeffs));
    if (reducedTarget % g !== 0) throw new EngineError(ErrorCode.NO_SOLUTIONS);

    // 4. Sort by coefficient descending — maximises early pruning
    const orderedVars = Object.keys(reducedCoeffs).sort(
        (a, b) => reducedCoeffs[b] - reducedCoeffs[a],
    );
    const orderedCoeffs = orderedVars.map((v) => reducedCoeffs[v]);
    const orderedConstraints = orderedVars.map((v) => constraints[v]);
    const n = orderedVars.length;

    // 5. Suffix min/max arrays — O(V) precompute, O(1) per node
    const suffixMin = new Array(n + 1).fill(0);
    const suffixMax = new Array(n + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        const c = orderedConstraints[i];
        suffixMin[i] = suffixMin[i + 1] + orderedCoeffs[i] * c.lo;
        suffixMax[i] = suffixMax[i + 1] + orderedCoeffs[i] * c.hi;
    }

    // 6. Viability check — actual pruned DFS probe (not naive product)
    if (
        !isSearchSpaceViable(
            orderedCoeffs,
            orderedConstraints,
            reducedTarget,
            suffixMax,
        )
    ) {
        throw new EngineError(ErrorCode.UNBOUNDED_SEARCH);
    }

    // 7. Backtracker
    const limit = options.limit || 1000;
    const results = [];
    let totalFound = 0;

    function backtrack(depth, remaining, partial) {
        // Layer 2: suffix bounds
        if (remaining < suffixMin[depth] || remaining > suffixMax[depth])
            return;

        const v = orderedVars[depth];
        const coeff = orderedCoeffs[depth];
        const c = orderedConstraints[depth];

        // Layer 1: budget ceiling
        const effectiveHi = Math.min(c.hi, Math.floor(remaining / coeff));
        if (c.start > effectiveHi) return;

        if (depth === n - 1) {
            // Base case: check exact zero remainder
            for (let xi = c.start; xi <= effectiveHi; xi += c.step) {
                if (remaining - coeff * xi === 0) {
                    totalFound++;
                    if (results.length < limit)
                        results.push({
                            ...partial,
                            [v]: xi,
                            ...fixedAssignments,
                        });
                }
            }
            return;
        }

        // Layer 3: parity step is baked into c.step (1 or 2)
        for (let xi = c.start; xi <= effectiveHi; xi += c.step) {
            if (results.length >= limit && totalFound > limit) return;
            backtrack(depth + 1, remaining - coeff * xi, {
                ...partial,
                [v]: xi,
            });
        }
    }

    backtrack(0, reducedTarget, {});

    const capped = totalFound > limit;

    // 8. Sort by original equation variable order
    const originalOrder = Object.keys(coeffs);
    results.sort((a, b) => {
        for (const varName of originalOrder) {
            const diff = (a[varName] ?? 0) - (b[varName] ?? 0);
            if (diff !== 0) return diff;
        }
        return 0;
    });

    return {
        solutions: results,
        count: results.length,
        totalFound: capped
            ? `${limit}+ (${totalFound} found, capped)`
            : totalFound,
        capped,
    };
}

module.exports = solve;
