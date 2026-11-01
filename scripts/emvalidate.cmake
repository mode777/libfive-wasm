# scripts/emvalidate.cmake — post-project validation and flavor flags.
#
# Included through -DCMAKE_PROJECT_INCLUDE, i.e. after the vendored top-level
# project() call, which is the first point where command-line -D variables are
# visible. The initial-cache file (scripts/emcache.cmake) is processed earlier
# and therefore cannot validate them.

foreach(var EIGEN_INCLUDE_DIRS Boost_INCLUDE_DIRS LIBFIVE_WASM_INCLUDE_DIR)
    if("${${var}}" STREQUAL "")
        message(FATAL_ERROR
            "${var} must be supplied by scripts/build-wasm.sh "
            "(the vendored header roots are build/deps/{eigen,boost} and "
            "wasm/include)")
    endif()
    if(NOT IS_ABSOLUTE "${${var}}")
        message(FATAL_ERROR "${var} must be an absolute path, got: ${${var}}")
    endif()
    if(NOT EXISTS "${${var}}")
        message(FATAL_ERROR "${var} does not exist: ${${var}}; run "
            "scripts/fetch-deps.sh or scripts/vendor-libfive.sh first")
    endif()
endforeach()

if(NOT EXISTS "${LIBFIVE_WASM_INCLUDE_DIR}/libfive_wasm/interval_rounding.hpp")
    message(FATAL_ERROR
        "LIBFIVE_WASM_INCLUDE_DIR does not contain the software interval "
        "rounding header: ${LIBFIVE_WASM_INCLUDE_DIR}")
endif()

if(LIBFIVE_WASM_DEBUG)
    string(APPEND CMAKE_C_FLAGS " -O0 -g4")
    string(APPEND CMAKE_CXX_FLAGS " -O0 -g4")
else()
    # Release flavor: measured to shrink the module by ~2% with the tests green.
    string(APPEND CMAKE_C_FLAGS " -flto")
    string(APPEND CMAKE_CXX_FLAGS " -flto")
endif()
