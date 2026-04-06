{
  "targets": [
    {
      "target_name": "quantsolve_engine",
      "sources": [
        "src/engine-cpp/addon/binding.cpp",
        "src/engine-cpp/src/ast.cpp",
        "src/engine-cpp/src/errors.cpp",
        "src/engine-cpp/src/error_handler.cpp",
        "src/engine-cpp/src/lexer.cpp",
        "src/engine-cpp/src/parser.cpp",
        "src/engine-cpp/src/coefficient_extractor.cpp",
        "src/engine-cpp/src/normalizer.cpp",
        "src/engine-cpp/src/constraint_engine.cpp",
        "src/engine-cpp/src/solver.cpp",
        "src/engine-cpp/src/polynomial_solver.cpp",
        "src/engine-cpp/src/result_formatter.cpp",
        "src/engine-cpp/src/engine_runner.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src/engine-cpp/include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ],
      "cflags_cc": [
        "-std=c++20"
      ],
      "conditions": [
        [
          "OS=='win'",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "AdditionalOptions": [
                  "/std:c++20",
                  "/EHsc"
                ]
              }
            }
          }
        ]
      ]
    }
  ]
}
