//! Unit-safe normalization and coverage verdicts for NASA PSI microgravity
//! combustion data.
//!
//! The PSI tables are not comparable as published. This crate is the part of
//! the IGNIS build that has to get the units right, extracted so it can be
//! reused without re-deriving the hazards:
//!
//! * three pressure units (atm, bar, mmHg) plus free text like `"1 atm"`
//! * two oxygen conventions (mole fraction and percent), sometimes in the same
//!   column across accessions
//! * missing-value sentinels: `***`, `n/a`, and a literal `0` that means
//!   "not recorded", not vacuum
//! * planned test matrices (`"21; 26.5; 40"`) that look like a number
//! * approximation prefixes (`~ 22.1`, `≈22.1`, `<0.5`)
//!
//! Every function that can reject a value returns `Option`, never a silently
//! coerced default. That is the whole point: a parser that guesses is worse
//! than one that declines.
//!
//! # Example
//!
//! ```
//! use ignis_core::{parse_num, to_bar, to_fraction, OxygenUnit, PressureUnit};
//!
//! assert_eq!(parse_num("~ 22.1"), Some(22.1));
//! assert_eq!(parse_num("21; 26.5; 40"), None);   // a matrix, not a reading
//! assert_eq!(to_bar("1 atm", PressureUnit::AtmText), Some(1.01325));
//! assert_eq!(to_fraction("26.5", OxygenUnit::Percent), Some(0.265));
//! ```

#![forbid(unsafe_code)]

/// The README's examples are doctested, so a snippet that stops compiling
/// fails `cargo test` instead of quietly lying to the next reader.
#[doc = include_str!("../README.md")]
#[cfg(doctest)]
pub struct ReadmeDoctests;

/// Pressure units that appear in the PSI corpus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PressureUnit {
    Atm,
    Bar,
    MmHg,
    Psi,
    /// Free-text column where only some cells carry the word "atm".
    AtmText,
}

/// Oxygen units that appear in the PSI corpus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OxygenUnit {
    /// Mole fraction, e.g. `0.265`.
    Fraction,
    /// Percent by volume, e.g. `26.5`.
    Percent,
}

pub const ATM_BAR: f64 = 1.01325;
pub const PSI_BAR: f64 = 0.068_947_6;
pub const MMHG_BAR: f64 = 0.001_333_22;

/// Nothing in PSI ran below this. A value under it is a sentinel, not vacuum.
pub const MIN_PLAUSIBLE_BAR: f64 = 0.05;

/// Parse a cell to a number, or decline.
///
/// Declines on: empty, `***`, `n/a`, `na`, `-`, any cell containing `;` (a
/// planned matrix of conditions, not one measurement), and anything that does
/// not start with a number after stripping an approximation prefix.
///
/// Accepts a decimal comma, because several accessions were exported on a
/// European locale.
pub fn parse_num(v: &str) -> Option<f64> {
    let s = v.trim().replace(',', ".");
    let s = s.trim();
    if s.is_empty() || matches!(s.to_ascii_lowercase().as_str(), "***" | "n/a" | "na" | "-") {
        return None;
    }
    if s.contains(';') {
        return None;
    }
    // "~ 22.1", "≈22.1", "<0.5", ">3" — an approximation of a real reading.
    let s = s.trim_start_matches(['~', '≈', '<', '>']).trim_start();
    let end = s
        .char_indices()
        .find(|(i, c)| {
            !(c.is_ascii_digit()
                || *c == '.'
                || *c == '-'
                || *c == '+'
                || ((*c == 'e' || *c == 'E') && *i > 0))
        })
        .map(|(i, _)| i)
        .unwrap_or(s.len());
    let head = &s[..end];
    // Require a digit: "." and "-" would otherwise parse as garbage or fail
    // obscurely.
    if !head.chars().any(|c| c.is_ascii_digit()) {
        return None;
    }
    head.parse::<f64>().ok().filter(|x| x.is_finite())
}

/// Convert a pressure cell to bar, or decline.
///
/// Returns `None` for unparseable cells and for anything below
/// [`MIN_PLAUSIBLE_BAR`] — FLEX row C11M201 records pressure as a literal `0`,
/// which is a missing-value sentinel rather than vacuum.
pub fn to_bar(v: &str, unit: PressureUnit) -> Option<f64> {
    let x = parse_num(v)?;
    let bar = match unit {
        PressureUnit::Atm => x * ATM_BAR,
        PressureUnit::Bar => x,
        PressureUnit::MmHg => x * MMHG_BAR,
        PressureUnit::Psi => x * PSI_BAR,
        PressureUnit::AtmText => {
            if v.to_ascii_lowercase().contains("atm") {
                x * ATM_BAR
            } else {
                return None;
            }
        }
    };
    if bar < MIN_PLAUSIBLE_BAR {
        return None;
    }
    Some(bar)
}

/// Convert an oxygen cell to a mole fraction in `(0, 1]`, or decline.
///
/// A percent value that leaked past its unit label is caught by the magnitude
/// test: anything above 1.5 cannot be a fraction, so it is divided by 100.
pub fn to_fraction(v: &str, unit: OxygenUnit) -> Option<f64> {
    let mut x = parse_num(v)?;
    if unit == OxygenUnit::Percent {
        x /= 100.0;
    }
    if x > 1.5 {
        x /= 100.0;
    }
    if !(x > 0.0 && x <= 1.0) {
        return None;
    }
    // Four decimals is the corpus's own precision; rounding here keeps the
    // integer-tolerance comparison in `coverage` from seeing binary noise.
    Some((x * 10_000.0).round() / 10_000.0)
}

/// One normalized test point.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TestPoint {
    /// Oxygen as a mole fraction.
    pub o2: f64,
    /// Chamber pressure in bar.
    pub p: f64,
}

/// How much the corpus supports a queried atmosphere.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    /// Enough points in tolerance and a real two-sided bracket.
    Covered,
    /// Some evidence, but not enough to call the atmosphere measured.
    Partial,
    /// No evidence at this condition.
    Blind,
}

/// The full result of a coverage query.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Coverage {
    pub verdict: Verdict,
    /// Points within ±15 % pressure and ±1.5 pp oxygen.
    pub in_tolerance: usize,
    /// Points usable for this material class (both axes present).
    pub usable: usize,
    /// Whether the query sits inside a real two-sided box of measurements.
    pub bracketed: bool,
    /// Nearest point by the weighted log-distance, if any.
    pub nearest: Option<TestPoint>,
    /// Pressure distance to the nearest point, in percent.
    pub pressure_gap_pct: f64,
    /// Oxygen distance to the nearest point, in percentage points.
    pub oxygen_gap_pp: f64,
}

/// The oxygen range a material class actually reached, as `(floor, ceiling)`.
///
/// Takes every oxygen reading in the class, **including rows that record no
/// pressure**. That asymmetry is the point: a row saying "this class was run at
/// 34 % oxygen" is evidence about the ceiling even when the pressure cell is
/// blank, so deriving the envelope from the solver pool would understate it.
/// Pass the same slice you would filter to build the pool, before the pressure
/// filter.
///
/// Returns `None` for an empty class.
pub fn o2_envelope(class_o2: &[f64]) -> Option<(f64, f64)> {
    let floor = class_o2.iter().copied().fold(f64::MAX, f64::min);
    let ceiling = class_o2.iter().copied().fold(f64::MIN, f64::max);
    if class_o2.is_empty() {
        None
    } else {
        Some((floor, ceiling))
    }
}

/// Pressure tolerance: ±15 %, compared in log space so it is symmetric.
pub const TOL_PRESSURE_LOG: f64 = 0.139_762_0; // ln(1.15)

/// Oxygen tolerance: ±1.5 percentage points.
///
/// Compared in integer ten-thousandths. `0.265 - 0.25` is
/// `0.015000000000000013` in binary, which would put six tests sitting exactly
/// on the tolerance edge *outside* it.
pub const TOL_OXYGEN_UNITS: i64 = 150;

/// Minimum points in tolerance before an atmosphere counts as covered.
pub const MIN_COVERED: usize = 5;

/// Query the corpus for an atmosphere and a set of points from one material
/// class.
///
/// `pool` must already be filtered to the class and to points that record both
/// axes. An empty pool yields [`Verdict::Blind`] with zero distances.
pub fn coverage(pool: &[TestPoint], p: f64, o2: f64) -> Coverage {
    // `is_nan` first, because `!(p > 0.0)` and `p <= 0.0` disagree on NaN and
    // the negative-comparison spelling trips clippy. A NaN query is a blind
    // query, not a panic.
    if pool.is_empty() || p.is_nan() || o2.is_nan() || p <= 0.0 || o2 <= 0.0 {
        return Coverage {
            verdict: Verdict::Blind,
            in_tolerance: 0,
            usable: 0,
            bracketed: false,
            nearest: None,
            pressure_gap_pct: 0.0,
            oxygen_gap_pp: 0.0,
        };
    }

    let o2_units = (o2 * 10_000.0).round() as i64;
    let in_tolerance = pool
        .iter()
        .filter(|r| {
            (r.p / p).ln().abs() <= TOL_PRESSURE_LOG
                && ((r.o2 * 10_000.0).round() as i64 - o2_units).abs() <= TOL_OXYGEN_UNITS
        })
        .count();

    // A bracket needs both quadrants: something at or above this oxygen and at
    // or below this pressure, AND something at or below this oxygen and at or
    // above this pressure. One quadrant is not a bracket — it let a 5 % oxygen
    // query pass because 121 tests sit above 5 %.
    let above = pool.iter().any(|r| r.o2 >= o2 && r.p <= p * 1.15);
    let below = pool.iter().any(|r| r.o2 <= o2 && r.p >= p / 1.15);
    let bracketed = above && below;

    // Distance weights the axes so one decade of pressure is comparable to
    // roughly a third of the oxygen range.
    let dist = |r: &TestPoint| ((r.p / p).ln().powi(2) + ((r.o2 - o2) * 3.0).powi(2)).sqrt();
    let nearest = pool
        .iter()
        .copied()
        .min_by(|a, b| dist(a).partial_cmp(&dist(b)).unwrap_or(std::cmp::Ordering::Equal));

    // Covered needs both enough points AND a real bracket. Five tests just
    // under the ceiling is not coverage of a point above it.
    let verdict = if in_tolerance >= MIN_COVERED && bracketed {
        Verdict::Covered
    } else if in_tolerance >= 1 || bracketed {
        Verdict::Partial
    } else {
        Verdict::Blind
    };

    let (pressure_gap_pct, oxygen_gap_pp) = match nearest {
        Some(n) => ((n.p - p).abs() / p * 100.0, (n.o2 - o2).abs() * 100.0),
        None => (0.0, 0.0),
    };

    Coverage {
        verdict,
        in_tolerance,
        usable: pool.len(),
        bracketed,
        nearest,
        pressure_gap_pct,
        oxygen_gap_pp,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    #[test]
    fn sentinels_decline() {
        for v in ["", "  ", "***", "n/a", "NA", "-", "abc"] {
            assert_eq!(parse_num(v), None, "{v:?} should decline");
        }
    }

    #[test]
    fn planned_matrix_is_not_a_number() {
        // Taking the first number turns a list of four conditions into one.
        assert_eq!(parse_num("21; 26.5; 40"), None);
        assert_eq!(parse_num("26.5"), Some(26.5));
    }

    #[test]
    fn approximation_prefixes_are_readings() {
        assert_eq!(parse_num("~ 22.1"), Some(22.1));
        assert_eq!(parse_num("≈22.1"), Some(22.1));
        assert_eq!(parse_num("<0.5"), Some(0.5));
        // Anchoring at the first digit silently discarded eight Saffire readings.
    }

    #[test]
    fn decimal_comma_is_accepted() {
        assert_eq!(parse_num("26,5"), Some(26.5));
    }

    #[test]
    fn pressure_units_convert() {
        assert!(close(to_bar("1 atm", PressureUnit::Atm).unwrap(), 1.01325));
        assert!(close(to_bar("760", PressureUnit::MmHg).unwrap(), 1.013_247_2));
        assert!(close(to_bar("14.85", PressureUnit::Psi).unwrap(), 1.023_871_86));
        assert_eq!(to_bar("1 atm", PressureUnit::AtmText), Some(1.01325));
        assert_eq!(to_bar("1.0", PressureUnit::AtmText), None);
    }

    #[test]
    fn literal_zero_is_a_sentinel_not_vacuum() {
        assert_eq!(to_bar("0", PressureUnit::Bar), None);
        assert_eq!(to_bar("0.03", PressureUnit::Bar), None);
    }

    #[test]
    fn oxygen_units_convert() {
        assert_eq!(to_fraction("26.5", OxygenUnit::Percent), Some(0.265));
        assert_eq!(to_fraction("0.265", OxygenUnit::Fraction), Some(0.265));
        // A percent that leaked past a fraction label is caught by magnitude.
        assert_eq!(to_fraction("26.5", OxygenUnit::Fraction), Some(0.265));
        assert_eq!(to_fraction("0", OxygenUnit::Percent), None);
        assert_eq!(to_fraction("150", OxygenUnit::Percent), None);
    }

    #[test]
    fn empty_pool_is_blind() {
        let c = coverage(&[], 0.703, 0.265);
        assert_eq!(c.verdict, Verdict::Blind);
        assert_eq!(c.usable, 0);
        assert!(c.nearest.is_none());
    }

    #[test]
    fn tolerance_edge_is_inclusive() {
        // 0.25 vs 0.265 is exactly 1.5 pp. In binary that difference is
        // 0.015000000000000013, so a float comparison excludes the edge.
        let pool = vec![TestPoint { o2: 0.25, p: 1.0 }];
        let c = coverage(&pool, 1.0, 0.265);
        assert_eq!(c.in_tolerance, 1);
    }

    #[test]
    fn one_quadrant_is_not_a_bracket() {
        // Every point above the query oxygen, none below it.
        let pool: Vec<TestPoint> = (0..10)
            .map(|i| TestPoint { o2: 0.20 + i as f64 * 0.001, p: 1.0 })
            .collect();
        let c = coverage(&pool, 1.0, 0.05);
        assert!(!c.bracketed, "10 points above 5% is not a bracket");
        assert_eq!(c.verdict, Verdict::Blind);
    }

    #[test]
    fn covered_needs_both_tolerance_and_bracket() {
        // Tight bracket, plenty in tolerance.
        let mut pool = Vec::new();
        for i in 0..8 {
            pool.push(TestPoint { o2: 0.20, p: 0.98 + i as f64 * 0.001 });
            pool.push(TestPoint { o2: 0.30, p: 0.98 + i as f64 * 0.001 });
        }
        let c = coverage(&pool, 1.0, 0.265);
        assert!(c.bracketed);
        assert_eq!(c.in_tolerance, 0);
        assert_eq!(c.verdict, Verdict::Partial);

        let tight = vec![
            TestPoint { o2: 0.26, p: 1.0 },
            TestPoint { o2: 0.27, p: 1.0 },
            TestPoint { o2: 0.265, p: 1.0 },
            TestPoint { o2: 0.26, p: 1.0 },
            TestPoint { o2: 0.27, p: 1.0 },
            TestPoint { o2: 0.25, p: 1.0 },
            TestPoint { o2: 0.28, p: 1.0 },
        ];
        let c = coverage(&tight, 1.0, 0.265);
        assert_eq!(c.in_tolerance, 7);
        assert!(c.bracketed);
        assert_eq!(c.verdict, Verdict::Covered);
    }

    #[test]
    fn ceiling_and_floor_come_from_the_class_not_the_pool() {
        // A row with oxygen but no pressure is still evidence about the
        // ceiling. Deriving the envelope from the solver pool understates it —
        // the gas class really does have 32 such rows.
        let class_o2 = [0.136, 0.227, 0.34];
        let (floor, ceiling) = o2_envelope(&class_o2).unwrap();
        assert!(close(floor, 0.136));
        assert!(close(ceiling, 0.34), "ceiling must include the pressure-less row");

        assert_eq!(o2_envelope(&[]), None);
    }

    #[test]
    fn nan_query_is_blind_not_a_panic() {
        let pool = vec![TestPoint { o2: 0.20, p: 1.0 }];
        assert_eq!(coverage(&pool, f64::NAN, 0.20).verdict, Verdict::Blind);
        assert_eq!(coverage(&pool, 1.0, f64::NAN).verdict, Verdict::Blind);
    }
}
