//! Differential test against the shipped application.
//!
//! `tests/fixtures/testpoints.csv` is the corpus exported from
//! `app/data/dataset.js` — every one of the 1,895 test points, with the same
//! fields the browser solver sees. The expected verdicts below were captured by
//! driving the real app in headless Chromium, not by running this crate. If the
//! two implementations ever disagree, this test fails and the disagreement is
//! visible rather than assumed away.

use ignis_core::{coverage, o2_envelope, Verdict};
use std::collections::BTreeMap;

/// `phase` as the app names it, from the fixture's `phase` column.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum Phase {
    Solid,
    Droplet,
    Gas,
    Aerosol,
    Dust,
    Na,
}

impl Phase {
    fn parse(s: &str) -> Option<Phase> {
        Some(match s {
            "solid" => Phase::Solid,
            "droplet" => Phase::Droplet,
            "gas" => Phase::Gas,
            "aerosol" => Phase::Aerosol,
            "dust" => Phase::Dust,
            "n/a" => Phase::Na,
            _ => return None,
        })
    }
}

struct Corpus {
    /// phase -> points that record both axes, which is the app's solver pool.
    pools: BTreeMap<Phase, Vec<ignis_core::TestPoint>>,
    /// phase -> every oxygen reading, pressure present or not. The app derives
    /// its ceiling from this, not from the pool.
    class_o2: BTreeMap<Phase, Vec<f64>>,
    /// phase -> every row in the class, for the "no measurements" branch.
    class_sizes: BTreeMap<Phase, usize>,
}

fn load() -> Corpus {
    let raw = include_str!("fixtures/testpoints.csv");
    let mut pools: BTreeMap<Phase, Vec<ignis_core::TestPoint>> = BTreeMap::new();
    let mut class_o2: BTreeMap<Phase, Vec<f64>> = BTreeMap::new();
    let mut class_sizes: BTreeMap<Phase, usize> = BTreeMap::new();

    for line in raw.lines().skip(1) {
        let f: Vec<&str> = line.split(',').collect();
        if f.len() < 7 {
            continue;
        }
        let phase = match Phase::parse(f[2]) {
            Some(p) => p,
            None => continue,
        };
        *class_sizes.entry(phase).or_insert(0) += 1;
        let (o2, p) = (f[4], f[5]);
        if o2.is_empty() {
            continue;
        }
        let Ok(o2) = o2.parse::<f64>() else { continue };
        class_o2.entry(phase).or_default().push(o2);
        let Ok(p) = p.parse::<f64>() else { continue };
        pools
            .entry(phase)
            .or_default()
            .push(ignis_core::TestPoint { o2, p });
    }
    Corpus { pools, class_o2, class_sizes }
}

/// Verdicts captured from the running application, EN and PL alike — the state
/// and title are language-independent once the strings are stripped.
#[test]
fn matches_the_application() {
    let c = load();

    let solid = &c.pools[&Phase::Solid];
    let droplet = &c.pools[&Phase::Droplet];

    // Guard the fixture itself: if the export drifts, this fails before the
    // behavioural assertions do, and says which number moved.
    assert_eq!(c.class_sizes[&Phase::Solid], 264, "solid class size");
    assert_eq!(solid.len(), 252, "solid points with both axes");
    assert_eq!(c.class_sizes[&Phase::Droplet], 369, "droplet class size");
    assert_eq!(droplet.len(), 360, "droplet points with both axes");

    struct Case {
        pool: &'static str,
        p: f64,
        o2: f64,
        verdict: Verdict,
        in_tol: usize,
        bracketed: bool,
    }

    let cases = [
        // 1.013 bar / 24% — 11 in tolerance but nothing at or above that
        // oxygen, so it must not be "covered".
        Case { pool: "solid", p: 1.013, o2: 0.24, verdict: Verdict::Partial, in_tol: 11, bracketed: false },
        // 1.013 bar / 22% — genuinely covered.
        Case { pool: "solid", p: 1.013, o2: 0.22, verdict: Verdict::Covered, in_tol: 138, bracketed: true },
        // 1.013 bar / 5% — below the envelope; names the floor, not the ceiling.
        Case { pool: "solid", p: 1.013, o2: 0.05, verdict: Verdict::Blind, in_tol: 0, bracketed: false },
        // 0.5 bar / 20% droplet — bracketed by 3 tests, not covered.
        Case { pool: "droplet", p: 0.5, o2: 0.20, verdict: Verdict::Partial, in_tol: 3, bracketed: true },
        // 0.703 bar / 26.5% droplet — covered by 6.
        Case { pool: "droplet", p: 0.703, o2: 0.265, verdict: Verdict::Covered, in_tol: 6, bracketed: true },
        // 0.703 bar / 26.5% solid — the headline gap. Blind.
        Case { pool: "solid", p: 0.703, o2: 0.265, verdict: Verdict::Blind, in_tol: 0, bracketed: false },
        // 1.013 bar / 20.9% solid — cabin air, covered.
        Case { pool: "solid", p: 1.013, o2: 0.209, verdict: Verdict::Covered, in_tol: 131, bracketed: true },
    ];

    for case in cases {
        let pool = match case.pool {
            "solid" => solid,
            "droplet" => droplet,
            other => panic!("unknown pool {other}"),
        };
        let r = coverage(pool, case.p, case.o2);
        let label = format!("{} bar / {}% {}", case.p, case.o2 * 100.0, case.pool);
        assert_eq!(r.verdict, case.verdict, "{label}: verdict");
        assert_eq!(r.in_tolerance, case.in_tol, "{label}: in_tolerance");
        assert_eq!(r.bracketed, case.bracketed, "{label}: bracketed");
        assert_eq!(r.usable, pool.len(), "{label}: usable");
    }

    // The envelope the UI prints, from the class rather than the pool.
    let (solid_floor, solid_ceiling) = o2_envelope(&c.class_o2[&Phase::Solid]).unwrap();
    assert!((solid_ceiling - 0.2272).abs() < 1e-9, "solid ceiling {solid_ceiling}");
    assert!((solid_floor - 0.136).abs() < 1e-9, "solid floor {solid_floor}");
    let (_, droplet_ceiling) = o2_envelope(&c.class_o2[&Phase::Droplet]).unwrap();
    assert!((droplet_ceiling - 0.34).abs() < 1e-9, "droplet ceiling {droplet_ceiling}");
}

/// The corpus's own headline, asserted through the crate rather than restated.
#[test]
fn no_solid_point_is_above_the_lunar_nominal() {
    let c = load();
    let solid = &c.pools[&Phase::Solid];
    let (_, ceiling) = o2_envelope(&c.class_o2[&Phase::Solid]).unwrap();
    assert!(
        (ceiling - 0.2272).abs() < 1e-9,
        "solid oxygen ceiling is {ceiling}"
    );
    assert!(
        solid.iter().all(|r| r.o2 <= 0.265),
        "a solid point sits above the 26.5% lunar nominal"
    );
    // And the pressure axis never moved: every documented solid point is at
    // cabin air.
    let lo = solid.iter().map(|r| r.p).fold(f64::MAX, f64::min);
    let hi = solid.iter().map(|r| r.p).fold(f64::MIN, f64::max);
    assert!((lo - 0.9829).abs() < 1e-4, "solid pressure floor is {lo}");
    assert!((hi - 1.0257).abs() < 1e-4, "solid pressure ceiling is {hi}");
}
