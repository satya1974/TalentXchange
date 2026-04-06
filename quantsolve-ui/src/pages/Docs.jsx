const reqSample = `{
  "equation": "10x + 20y = 100",
  "constraints": {
    "x": { "min": 0, "max": 10, "even": true },
    "y": { "exact": 3 }
  },
  "page": 1,
  "pageSize": 50
}`;

const resSample = `{
  "success": true,
  "totalFound": 6,
  "page": 1,
  "totalPages": 1,
  "hasMore": false,
  "solutions": [
    { "x": 0, "y": 5 },
    { "x": 2, "y": 4 }
  ],
  "meta": {
    "variableCount": 2,
    "constraintCount": 0,
    "astDepth": 4
  }
}`;

const errorItems = [
    ["EMPTY_INPUT", "Equation is missing or blank"],
    ["INVALID_CHARACTER", "Unsupported symbol in input"],
    ["NON_LINEAR_TERM", "Non-linear expression detected"],
    ["NO_SOLUTIONS", "No valid integer solution exists"],
    ["UNBOUNDED_SEARCH", "Search space too broad without limits"],
];

export default function Docs() {
    return (
        <div className="container-pro py-8 md:py-12 space-y-6">
            <div className="max-w-3xl">
                <span className="pill">Developer Docs</span>
                <h1 className="section-title mt-2">API contract and integration guide</h1>
                <p className="muted mt-1">
                    Input, output, constraints, and common failure modes for
                    backend and frontend integration.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="panel p-4">
                    <h2 className="font-bold text-lg">Supported Inputs</h2>
                    <ul className="mt-2 text-sm muted list-disc pl-5 space-y-1">
                        <li>Linear equations with multiple variables</li>
                        <li>Parentheses + implicit multiplication</li>
                        <li>Multi-character variable names</li>
                        <li>Division by constants only</li>
                    </ul>
                </div>
                <div className="panel p-4">
                    <h2 className="font-bold text-lg">Constraint Types</h2>
                    <ul className="mt-2 text-sm muted list-disc pl-5 space-y-1">
                        <li>min / max bounds</li>
                        <li>exact pinning</li>
                        <li>even / odd parity</li>
                        <li>page / pageSize pagination</li>
                    </ul>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <div className="panel p-4">
                    <h3 className="font-bold mb-2">POST /solve Request</h3>
                    <pre className="codebox mono">{reqSample}</pre>
                </div>
                <div className="panel p-4">
                    <h3 className="font-bold mb-2">Response Schema</h3>
                    <pre className="codebox mono">{resSample}</pre>
                </div>
            </div>

            <div className="panel p-4">
                <h3 className="font-bold mb-3">Common Error Codes</h3>
                <div className="grid md:grid-cols-2 gap-2">
                    {errorItems.map(([code, meaning]) => (
                        <div key={code} className="panel-soft p-3">
                            <div className="font-semibold text-sm">{code}</div>
                            <div className="text-sm muted mt-1">{meaning}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
