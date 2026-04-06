#pragma once

#include "quantsolve/types.hpp"

#include <string>

namespace quantsolve {

EngineResponse run_engine(const std::string& input,
                          const UserConstraints& user_constraints = {},
                          const SolveOptions& options = {});

} // namespace quantsolve
