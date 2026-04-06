cmake_minimum_required(VERSION 3.20)
project(quant_engine_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(quant_engine
    src/ast.cpp
    src/errors.cpp
    src/error_handler.cpp
    src/lexer.cpp
    src/parser.cpp
    src/coefficient_extractor.cpp
    src/normalizer.cpp
    src/constraint_engine.cpp
    src/solver.cpp
    src/polynomial_solver.cpp
    src/result_formatter.cpp
    src/engine_runner.cpp
)

target_include_directories(quant_engine PUBLIC include)

if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(quant_engine PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_executable(quant_engine_cli src/main.cpp)
target_link_libraries(quant_engine_cli PRIVATE quant_engine)
