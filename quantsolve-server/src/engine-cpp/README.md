# QuantSolve Engine C++

Production-grade C++ port of `src/engine/*.js` with parity-focused behavior.

## Build Core (CMake)

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

This generates CLI executable:
- `src/engine-cpp/build/quant_engine_cli.exe`

## Runtime Backend Modes

Server uses `src/engine/engineAdapter.js` with three backends:

- `ENGINE_BACKEND=js` (default): existing JS engine
- `ENGINE_BACKEND=cpp_cli`: calls `quant_engine_cli.exe` (no node-gyp needed)
- `ENGINE_BACKEND=cpp`: Node native addon (`.node`) via node-gyp

Recommended now:

```bash
ENGINE_BACKEND=cpp npm run dev
```

If C++ backend fails, adapter automatically falls back to JS.

CLI backend is now opt-in only. To allow it:

```bash
ENGINE_BACKEND=cpp_cli
ENGINE_ALLOW_CPP_CLI=true
```

Without `ENGINE_ALLOW_CPP_CLI=true`, the adapter routes `cpp_cli` to `cpp` (N-API).

## Optional Addon Build (Advanced)

From `quantsolve-server/`:

```bash
npm install
npm run build:addon
```

This generates:
- `quantsolve-server/build/Release/quantsolve_engine.node`

## Layout

- `include/quantsolve/`: public headers
- `src/`: engine implementation
- `addon/binding.cpp`: Node N-API bridge
- `src/main.cpp`: CLI bridge entrypoint

JS engine files remain intact.

## N-API Setup (Windows Fast Path)

From `quantsolve-server/`:

```bash
npm run check:napi
```

If MSVC/SDK are missing, run:

```bash
npm run fix:napi
```

Then build addon:

```bash
npm install
npm run build:addon
```

Activate N-API backend:

```bash
ENGINE_BACKEND=cpp npm run dev
```

You should see startup logs indicating configured and active backend.

## Runtime Tuning

Useful environment variables:

- `ENGINE_CACHE_MAX` (default `300`): max cache entries (LRU)
- `ENGINE_CACHE_TTL_MS` (default `120000`): cache TTL in ms
- `LOG_ENGINE_METRICS` (default `true`): per-request metric logs
- `ENGINE_METRICS_MAX_SAMPLES` (default `2000`): rolling latency sample size

Metrics endpoint:

- `GET /metrics` returns backend, cache stats, and request latency/cache/fallback metrics.
