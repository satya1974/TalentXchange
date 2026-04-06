#pragma once

#include "quantsolve/errors.hpp"
#include "quantsolve/types.hpp"

#include <exception>

namespace quantsolve {

ErrorPayload handle_error(const std::exception& err);

} // namespace quantsolve
