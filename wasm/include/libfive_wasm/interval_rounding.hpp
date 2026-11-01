/*
libfive-wasm: software rounding policy for boost::numeric::interval

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

#pragma once

#include <cmath>
#include <limits>

/*
 *  Boost.Numeric.Interval components, minus <boost/numeric/interval/hw_rounding.hpp>.
 *
 *  Boost 1.92's wasm platform config defines BOOST_NO_FENV_H, which makes
 *  hw_rounding.hpp fail with "Please specify rounding control mechanism". The
 *  hardware rounding policies it installs are no-ops under wasm in any case,
 *  and this file selects a software policy instead, so the aggregator header
 *  is replaced by its components (the same list, without hw_rounding).
 */
#include <boost/numeric/interval/interval.hpp>
#include <boost/numeric/interval/policies.hpp>
#include <boost/numeric/interval/rounding.hpp>
#include <boost/numeric/interval/rounded_arith.hpp>
#include <boost/numeric/interval/rounded_transc.hpp>
#include <boost/numeric/interval/constants.hpp>
#include <boost/numeric/interval/checking.hpp>
#include <boost/numeric/interval/compare.hpp>
#include <boost/numeric/interval/utility.hpp>
#include <boost/numeric/interval/arith.hpp>
#include <boost/numeric/interval/arith2.hpp>
#include <boost/numeric/interval/arith3.hpp>
#include <boost/numeric/interval/transc.hpp>

/*
 *  Software-rounded interval policies for libfive-wasm (AD-015, AD-023).
 *
 *  WebAssembly has no floating-point rounding-mode control: Emscripten stubs
 *  the fenv entry points, so Boost's rounded_*_std policies silently produce
 *  bounds that are not widened at all. Boost's rounded_*_exact policies are
 *  equally unusable: with Boost 1.92 they return the plain, unrounded result
 *  from both directions.
 *
 *  These policies instead widen every result outward by one representable
 *  value (std::nextafter). Inputs are float; the computation is carried out in
 *  double, whose error is many orders of magnitude smaller than one float ulp,
 *  so stepping one float ulp outward covers both the arithmetic rounding and
 *  the libm error. No rounding-mode state is read or written.
 *
 *  Used as, mirroring libfive's upstream alias:
 *
 *      using I = boost::numeric::interval<float,
 *          boost::numeric::interval_lib::policies<
 *              boost::numeric::interval_lib::save_state_nothing<
 *                  libfive_wasm::rounded_transc_soft<float>>,
 *              boost::numeric::interval_lib::checking_base<float>>>;
 */

namespace libfive_wasm {

template <class T>
inline T widen_down(T x)
{
    return std::nextafter(x, -std::numeric_limits<T>::infinity());
}

template <class T>
inline T widen_up(T x)
{
    return std::nextafter(x, std::numeric_limits<T>::infinity());
}

template <class T>
struct rounded_arith_soft
    : boost::numeric::interval_lib::rounding_control<T>
{
    typedef typename boost::numeric::interval_lib::rounding_control<T>
        ::rounding_mode rounding_mode;

    // No hardware rounding mode is available (or changed), so the state hooks
    // are deliberately no-ops.
    void init() { }
    void downward() { }
    void upward() { }
    void to_nearest() { }

    template <class U> T conv_down(const U& v)
    {
        return widen_down(static_cast<T>(v));
    }

    template <class U> T conv_up(const U& v)
    {
        return widen_up(static_cast<T>(v));
    }

    T add_down(const T& x, const T& y)
    {
        return widen_down(static_cast<T>(
            static_cast<double>(x) + static_cast<double>(y)));
    }

    T add_up(const T& x, const T& y)
    {
        return widen_up(static_cast<T>(
            static_cast<double>(x) + static_cast<double>(y)));
    }

    T sub_down(const T& x, const T& y)
    {
        return widen_down(static_cast<T>(
            static_cast<double>(x) - static_cast<double>(y)));
    }

    T sub_up(const T& x, const T& y)
    {
        return widen_up(static_cast<T>(
            static_cast<double>(x) - static_cast<double>(y)));
    }

    T mul_down(const T& x, const T& y)
    {
        return widen_down(static_cast<T>(
            static_cast<double>(x) * static_cast<double>(y)));
    }

    T mul_up(const T& x, const T& y)
    {
        return widen_up(static_cast<T>(
            static_cast<double>(x) * static_cast<double>(y)));
    }

    T div_down(const T& x, const T& y)
    {
        return widen_down(static_cast<T>(
            static_cast<double>(x) / static_cast<double>(y)));
    }

    T div_up(const T& x, const T& y)
    {
        return widen_up(static_cast<T>(
            static_cast<double>(x) / static_cast<double>(y)));
    }

    T median(const T& x, const T& y)
    {
        return static_cast<T>(
            (static_cast<double>(x) + static_cast<double>(y)) / 2.0);
    }

    T sqrt_down(const T& x)
    {
        return widen_down(static_cast<T>(std::sqrt(static_cast<double>(x))));
    }

    T sqrt_up(const T& x)
    {
        return widen_up(static_cast<T>(std::sqrt(static_cast<double>(x))));
    }

    T int_down(const T& x)
    {
        return static_cast<T>(std::floor(static_cast<double>(x)));
    }

    T int_up(const T& x)
    {
        return static_cast<T>(std::ceil(static_cast<double>(x)));
    }
};

template <class T, class Rounding = rounded_arith_soft<T> >
struct rounded_transc_soft : Rounding
{
#define LIBFIVE_WASM_TRANSC(name)                                         \
    T name##_down(const T& x)                                             \
    {                                                                     \
        return libfive_wasm::widen_down(static_cast<T>(                   \
            std::name(static_cast<double>(x))));                          \
    }                                                                     \
    T name##_up(const T& x)                                               \
    {                                                                     \
        return libfive_wasm::widen_up(static_cast<T>(                     \
            std::name(static_cast<double>(x))));                          \
    }

    LIBFIVE_WASM_TRANSC(exp)
    LIBFIVE_WASM_TRANSC(log)
    LIBFIVE_WASM_TRANSC(sin)
    LIBFIVE_WASM_TRANSC(cos)
    LIBFIVE_WASM_TRANSC(tan)
    LIBFIVE_WASM_TRANSC(asin)
    LIBFIVE_WASM_TRANSC(acos)
    LIBFIVE_WASM_TRANSC(atan)
    LIBFIVE_WASM_TRANSC(sinh)
    LIBFIVE_WASM_TRANSC(cosh)
    LIBFIVE_WASM_TRANSC(tanh)
    LIBFIVE_WASM_TRANSC(asinh)
    LIBFIVE_WASM_TRANSC(acosh)
    LIBFIVE_WASM_TRANSC(atanh)

#undef LIBFIVE_WASM_TRANSC
};

}   // namespace libfive_wasm
