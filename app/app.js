/* IGNIS — everything is computed from window.DATASET at load. No hardcoded figures. */
(() => {
  const D = window.DATASET;
  const T = window.TELEMETRY;
  const SI = window.INSIGHTS || {};
  if (!D) { document.body.innerHTML = '<p style="padding:40px;font-family:monospace">dataset.js missing — run scripts/build_dataset.py</p>'; return; }

  const ROWS = D.testpoints;
  const PHASE_COLOR = { solid: '#f59e0b', droplet: '#38bdf8', gas: '#a78bfa', aerosol: '#34d399', dust: '#94a3b8', emulator: '#fb923c' };
  // The challenge's own numbers are the primary reference point: lunar oxygen
  // "will likely be 30% or greater, with a corresponding pressure of 10.2 psi
  // or less", suits "filled with 100% oxygen to only 4.3 psi". Both come from
  // build_dataset.py so the map, the card and the solver quote one definition.
  const CH = D.challenge;
  const CH_P = CH.pressure_bar, CH_O2 = CH.o2_frac, CH_TOL = CH.tolerance, SUIT_P = CH.suit_pressure_bar;
  // NASA's Artemis Surface Habitat reference design, the second marker: nominal
  // 10.2 psia / 26.5% O2, capability 8.2 psia / 34% O2 (NTRS 20220000245).
  const LUNAR_P = 0.703, LUNAR_O2 = 0.265;
  const ALT_P = 0.565, ALT_O2 = 0.34;
  // Solver tolerances, module-level so the plan and the verdict quote the same
  // numbers. Oxygen is compared in integer ten-thousandths: 0.265 - 0.25 is
  // 0.015000000000000013 in binary, which would put six tests sitting exactly
  // on the tolerance edge outside it and contradict the sentence that names one
  // of them as "1.5 pp away".
  const TOL_O2 = 150, TOL_P = Math.log(1.15);
  // ONE definition of "inside the challenge envelope", shared by the map and
  // the export note. It is the challenge's sentence: oxygen >= 30%, pressure
  // <= 10.2 psi, and the 4.3 psi suit as the floor ("10.2 psi or less" has no
  // lower bound of its own and would swallow every vacuum test). The pressure
  // ceiling carries the ±tolerance the band is drawn with, so FLEX at 0.726 bar
  // is inside the box the caption describes. build_dataset.py counts
  // D.challenge.envelope with this same rule; the two must agree.
  const CH_WIN = { pLo: SUIT_P, pHi: CH_P * (1 + CH_TOL), o2Lo: CH_O2, o2Hi: 1 };
  const inChallenge = r => r.p != null && r.o2 != null
    && r.p >= CH_WIN.pLo && r.p <= CH_WIN.pHi
    && r.o2 >= CH_WIN.o2Lo && r.o2 <= CH_WIN.o2Hi;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, a = {}, ...kids) => {
    const n = document.createElement(t);
    for (const k in a) {
      if (k === 'class') n.className = a[k];
      else if (k === 'html') n.innerHTML = a[k];
      else n.setAttribute(k, a[k]);
    }
    kids.flat().forEach(k => n.append(k));
    return n;
  };
  // Free-text fields (fuel, material) come straight from the NASA CSVs and are
  // routed through innerHTML in the tooltip — escape them at the sink.
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- language ---------------- */
  // Two languages, no key table: every string is an (en, pl) pair at its own call
  // site, so a missing translation cannot silently fall back to English.
  const LANG_KEY = 'ignis.lang';
  let LANG = 'en';
  try { if (localStorage.getItem(LANG_KEY) === 'pl') LANG = 'pl'; } catch (e) { /* file:// may deny storage */ }
  const L = (en, pl) => LANG === 'pl' ? pl : en;
  const LOC = () => LANG === 'pl' ? 'pl-PL' : 'en-US';
  // Locale-aware numbers: pl-PL gives "22,2", en-US gives "22.2".
  const fmt = (n, d = 0) => {
    if (n == null) return '—';
    const s = n.toLocaleString(LOC(), { minimumFractionDigits: d, maximumFractionDigits: d });
    // pl-PL's ICU default only groups from five digits up, but Polish typography
    // writes "1 911" — so add the separator to a four-digit integer part.
    return LANG === 'pl' ? s.replace(/^(-?)(\d)(\d{3})(?=\D|$)/, '$1$2 $3') : s;
  };

  /* ---------------- derived facts ---------------- */
  const both = ROWS.filter(r => r.o2 != null && r.p != null);
  const solid = ROWS.filter(r => r.ph === 'solid');
  const solidO2 = solid.filter(r => r.o2 != null);
  // 252 of the 264 solid points end up with a chamber pressure: 121 from the test
  // table (BASS publishes it in its as-run matrix), 131 from a documented value
  // elsewhere in the corpus. All 252 sit at one atmosphere, so the oxygen axis is
  // where the corpus actually runs out.
  const solidP = solid.filter(r => r.p != null);
  // Pressure the test table omits but the corpus documents elsewhere — BASS-II's
  // summary report, Saffire-I's sensor workbook. Counting only the table column
  // turns a documented 1 atm into a missing value, which is a false finding.
  const PDOC = D.lunar.pressure_doc;
  const solidDocP = PDOC.in_table + Object.values(PDOC.documented_elsewhere).reduce((a, b) => a + b, 0);
  const solidNoP = solid.filter(r => r.p == null);
  const solidMaxO2 = Math.max(...solidO2.map(r => r.o2));
  const solidMinO2 = Math.min(...solidO2.map(r => r.o2));
  const solidPMin = Math.min(...solidP.map(r => r.p));
  const solidPMax = Math.max(...solidP.map(r => r.p));
  const solidAbove = solidO2.filter(r => r.o2 >= CH_O2);
  // Droplet tests near the design pressure, and the subset that is also at or
  // above 26.5% O2. Only the second number is evidence for a lunar cabin.
  const DP_TOL = 0.03;   // bar, the same window build_dataset.py uses for the design-point cohort
  const flexNearRows = ROWS.filter(r => r.ph === 'droplet' && r.p != null && Math.abs(r.p - LUNAR_P) <= DP_TOL);
  const flexNear = flexNearRows.length;
  const flexHighRows = flexNearRows.filter(r => r.o2 != null && r.o2 >= LUNAR_O2);
  const flexHighMinO2 = Math.min(...flexHighRows.map(r => r.o2));
  const flexHighMaxO2 = Math.max(...flexHighRows.map(r => r.o2));
  // The one place the corpus records what happened near the design pressure:
  // 17 FLEX droplets, none self-extinguished; 29 in the same nitrogen-diluted
  // series held at cabin air, 14 self-extinguished. Computed by build_dataset.py.
  const DP = D.lunar.design_point;
  const ext = o => (o && o.outcomes && o.outcomes.Extinction) || 0;
  const RAW = D.investigations.reduce((a, i) => a + i.raw_rows, 0);

  const PHASE_NAME = { solid: ['solid material', 'materiał stały'], droplet: ['liquid droplet', 'kropla cieczy'], gas: ['gaseous fuel', 'paliwo gazowe'], aerosol: ['smoke / aerosol', 'dym / aerozol'], dust: ['dust', 'pył'], emulator: ['material-flammability emulator', 'emulator palności materiałów'] };
  // Polish short labels are the adjectival form the Atlas filter chips use, so
  // a count reads correctly next to them ("66 gazowe · 17 kropelkowe").
  const PHASE_SHORT = { solid: ['solid', 'stałe'], droplet: ['droplet', 'kropelkowe'], gas: ['gas', 'gazowe'], aerosol: ['aerosol', 'aerozol'], dust: ['dust', 'pył'], emulator: ['emulator', 'emulator'], 'n/a': ['n/a', 'nd.'] };
  const PILLAR = { prevention: ['prevention', 'zapobieganie'], suppression: ['suppression', 'gaszenie'], detection: ['detection', 'wykrywanie'] };
  // Polish counts three ways: 1 punkt, 2-4 punkty, 5+ punktów — and 22 takes the
  // 2-4 form again, so the last digit decides unless it is 12-14.
  const plFew = n => /[2-4]$/.test(n) && !/1[2-4]$/.test(n);
  const plPts = (n, one = 'punkt leży', few = 'punkty leżą', many = 'punktów leży') =>
    n === 1 ? one : plFew(n) ? few : many;
  const phaseName = p => { const v = PHASE_NAME[p]; return v ? L(v[0], v[1]) : p; };
  const phaseShort = p => { const v = PHASE_SHORT[p]; return v ? L(v[0], v[1]) : p; };
  const pillarName = p => { const v = PILLAR[p]; return v ? L(v[0], v[1]) : p; };
  // "N solid-material test points" needs a genitive in Polish; a parenthetical
  // label would read as an aside and break the sentence.
  const PHASE_FOR = { solid: 'dla materiału stałego', droplet: 'dla paliwa kropelkowego', gas: 'dla paliwa gazowego', aerosol: 'dla dymu / aerozolu', dust: 'dla pyłu', emulator: 'dla emulatora palności' };
  // The English side has the same problem the Polish one does: "emulator-material
  // test points" is not a thing anyone says.
  const PHASE_EN = { solid: 'solid-material', droplet: 'droplet', gas: 'gaseous-fuel', aerosol: 'smoke / aerosol', dust: 'dust', emulator: 'emulator' };
  const phaseFor = p => LANG === 'pl' ? (PHASE_FOR[p] || p) : (PHASE_EN[p] || `${p}-material`);
  // Polish counts the noun, not the label: "43 punktów testowych", not "43 punktów
  // testowych dla emulatora palności", which reads like a category name.
  const plPhasePts = (n, p) => {
    const base = { solid: ['punkt materiału stałego', 'punkty materiału stałego', 'punktów materiału stałego'],
                   emulator: ['punkt emulatora palności', 'punkty emulatora palności', 'punktów emulatora palności'],
                   droplet: ['punkt paliwa kropelkowego', 'punkty paliwa kropelkowego', 'punktów paliwa kropelkowego'],
                   gas: ['punkt paliwa gazowego', 'punkty paliwa gazowego', 'punktów paliwa gazowego'],
                   aerosol: ['punkt dymu / aerozolu', 'punkty dymu / aerozolu', 'punktów dymu / aerozolu'],
                   dust: ['punkt pyłu', 'punkty pyłu', 'punktów pyłu'] }[p] || ['punkt', 'punkty', 'punktów'];
    return n === 1 ? base[0] : plFew(n) ? base[1] : base[2];
  };

  /* ---------------- hero ---------------- */
  const renderHero = () => {
    document.querySelectorAll('#hs-ceil').forEach(n => { n.textContent = fmt(solidMaxO2 * 100, 1) + '%'; });
    $('#hs-tests').textContent = fmt(ROWS.length);
    $('#hs-gap').textContent = solidAbove.length;
    $('#hs-gap-l').textContent = L(`solid points at ${fmt(CH_O2 * 100, 0)}% O₂ or above`, `punktów stałych przy ${fmt(CH_O2 * 100, 0)}% O₂ lub więcej`);
    document.querySelectorAll('.hs-gn').forEach(n => { n.textContent = fmt(D.lunar.gap_nominal_pp, 1); });
    document.querySelectorAll('.hs-gc').forEach(n => { n.textContent = fmt(D.lunar.gap_capability_pp, 1); });
    document.querySelectorAll('.n-tp').forEach(n => { n.textContent = fmt(ROWS.length); });
    $('#hs-files').textContent = fmt(D.meta.files);
    $('#hs-size').textContent = L(`source files · ${fmt(D.meta.gigabytes, 1)} GB`, `plików źródłowych · ${fmt(D.meta.gigabytes, 1)} GB`);
    $('#mc-ceiling').textContent = fmt(solidMaxO2 * 100, 1) + '%';
    $('#mc-solid').textContent = fmt(solid.length);
    $('#mc-blind').textContent = fmt(solidP.length);
    $('#mc-nop').textContent = fmt(solidNoP.length);
    $('#mc-prange').textContent = `${fmt(PDOC.min_bar, 2)}–${fmt(PDOC.max_bar, 2)} bar`;
    $('#flex-near').textContent = fmt(flexNear);
    $('#flex-high').textContent = fmt(flexHighRows.length);
    if (DP) {
      $('#flex-high2').textContent = fmt(DP.design.tests);
      $('#dp-ext').textContent = fmt(ext(DP.design));
      $('#dp-air').textContent = fmt(ext(DP.air));
      $('#dp-air-n').textContent = fmt(DP.air.tests);
    }
    $('#foot-meta').textContent = L(
      `${fmt(D.meta.investigations)} accessions with a test table · ${fmt(D.meta.tables)} tables · ${fmt(D.meta.testpoints)} test points · ${fmt(both.length)} with O2 + pressure`,
      `${fmt(D.meta.investigations)} zmapowanych akcesji · ${fmt(D.meta.tables)} tabel · ${fmt(D.meta.testpoints)} punktów testowych · ${fmt(both.length)} z O2 + ciśnieniem`);
  };

  /* ---------------- takeaways ---------------- */
  // Findings first: the three results that change a design decision, then the
  // gap that keeps them analogues. One number, one conclusion, one limit and
  // the accession each rests on — every figure read from the dataset.
  const renderTakeaways = () => {
    const host = $('#takeaway-cards');
    if (!host) return;
    const sn = D.pillars.suppression.solid_notes;
    const PV = D.pillars.prevention;
    const det = SI['PSI-102'] && SI['PSI-102'].conclusion;
    // The particle size is read out of the verified SAME quote, not typed here.
    const nm = det ? (det.q.match(/below (\d+) nm/) || [])[1] : null;
    const link = id => `<a class="tk-link" href="#atlas-${id}" data-src-kind="inv" data-src-id="${id}">${L('Source', 'Źródło')}: ${esc((INV_BY[id] || {}).acronym || id)} · ${id} →</a>`;
    const rowLink = (id, acr, rn) => `<a class="ask-row" href="#takeaways" data-src-kind="row" data-src-id="${id}" data-src-row="${rn}">${esc(acr)}, ${L('row', 'wiersz')} ${rn}</a>`;
    const cards = [];
    const SGT = D.outside_psi.sofie_gel;
    if (sn) cards.push({
      tag: L('a · Suppression', 'a · Gaszenie'),
      n: `${fmt(sn.nitrogen_recorded_failing)}/${fmt(sn.nitrogen_attempts)}`,
      k: L('attempts to put a burning solid out with nitrogen that left the flame lit', 'prób zgaszenia palącej się próbki azotem, po których płomień się utrzymał'),
      c: L(`A signal worth testing at cabin scale: cutting the air flow may matter more than which inert gas is carried — in ${fmt(sn.failed_ended_flow_off)} of those ${fmt(sn.nitrogen_recorded_failing)} the flame went out when the air flow was turned off.`,
           `Sygnał do sprawdzenia w skali kabiny: odcięcie przepływu powietrza może znaczyć więcej niż wybór gazu obojętnego — w ${fmt(sn.failed_ended_flow_off)} z tych ${fmt(sn.nitrogen_recorded_failing)} przypadków płomień zgasł po wyłączeniu przepływu.`),
      lim: L(`BASS operator log entries at ${fmt(sn.o2_range[0] * 100, 1)}–${fmt(sn.o2_range[1] * 100, 1)}% O₂ and cabin pressure — an operator's log, not a controlled comparison.`,
             `Wpisy z dziennika operatora BASS przy ${fmt(sn.o2_range[0] * 100, 1)}–${fmt(sn.o2_range[1] * 100, 1)}% O₂ i ciśnieniu kabinowym — dziennik operatora, nie porównanie kontrolowane.`),
      id: 'PSI-26',
    });
    if (DP) cards.push({
      tag: L('b · Design atmosphere', 'b · Atmosfera projektowa'),
      n: `${fmt(ext(DP.design))}/${fmt(DP.design.tests)}`,
      k: L(`FLEX droplets that self-extinguished within ${fmt(DP_TOL, 2)} bar of ${fmt(LUNAR_P, 3)} bar, at ${fmt(flexHighMinO2 * 100, 0)}–${fmt(flexHighMaxO2 * 100, 0)}% O₂`,
           `kropel FLEX, które samozgasły w granicach ${fmt(DP_TOL, 2)} bar od ${fmt(LUNAR_P, 3)} bar, przy ${fmt(flexHighMinO2 * 100, 0)}–${fmt(flexHighMaxO2 * 100, 0)}% O₂`),
      c: L(`Do not count on the lower-pressure, oxygen-richer cabin letting a flame die out on its own: against ${fmt(ext(DP.air))} of ${fmt(DP.air.tests)} in the same nitrogen series at cabin air, none did.`,
           `Nie zakładaj, że w kabinie o niższym ciśnieniu i bogatszej w tlen płomień zgaśnie sam: wobec ${fmt(ext(DP.air))} z ${fmt(DP.air.tests)} w tej samej serii azotowej przy powietrzu kabinowym nie zgasła żadna.`),
      lim: L('Liquid droplets, not cabin materials, and pressure and oxygen both differ between the cohorts — an analogue, not a controlled comparison.',
             'Krople cieczy, nie materiały kabiny, a ciśnienie i tlen różnią się między kohortami — analogia, nie porównanie kontrolowane.'),
      id: DP.investigation,
    });
    if (det && nm) cards.push({
      tag: L('c · Detection', 'c · Wykrywanie'),
      n: `${nm} nm`,
      k: L('below this size: a substantial portion of the smoke particles, per the SAME final report', 'poniżej tego rozmiaru: znaczna część cząstek dymu, według raportu końcowego SAME'),
      c: L('Specify detectors for sub-micron smoke and for slower transport: the report finds that mixing dominates smoke transport and detection times are longer than in normal gravity.',
           'Dobieraj czujki do dymu poniżej mikrometra i wolniejszego transportu: raport stwierdza, że transport dymu zdominowany jest przez mieszanie, a czas wykrycia jest dłuższy niż w normalnej grawitacji.'),
      q: det,
      lim: L('The SAME tables record no oxygen level or pressure, so nothing ties this result to the habitat atmosphere.',
             'Tabele SAME nie zapisują poziomu tlenu ani ciśnienia, więc nic nie wiąże tego wyniku z atmosferą habitatu.'),
      id: 'PSI-102',
    });
    cards.push({
      tag: L('d · The gap', 'd · Luka'), gap: true,
      n: `${fmt(PV.solid_ceiling_pct, 1)}%`,
      k: L(`highest oxygen any solid-material test reached (${rowLink(PV.solid_ceiling_at.investigation, PV.solid_ceiling_at.acronym, PV.solid_ceiling_at.row)}), against the challenge's ${fmt(CH_O2 * 100, 0)}%`,
           `najwyższy tlen w teście materiału stałego (${rowLink(PV.solid_ceiling_at.investigation, PV.solid_ceiling_at.acronym, PV.solid_ceiling_at.row)}), wobec ${fmt(CH_O2 * 100, 0)}% z challenge'u`),
      c: L(`No solid material in PSI has been burned in the top ${fmt(CH.gap_pp, 1)} points of the challenge's oxygen range — so a–c are analogues, not an answer for the materials a habitat interior is made of.`,
           `Żadnego materiału stałego w PSI nie spalono w górnych ${fmt(CH.gap_pp, 1)} punktach zakresu tlenu z challenge'u — dlatego a–c są analogiami, a nie odpowiedzią dla materiałów wnętrza habitatu.`),
      lim: L(`Every solid test with a documented pressure ran at ${fmt(PDOC.min_bar, 2)}–${fmt(PDOC.max_bar, 2)} bar. A gap in the open archive: ${SGT.name} burned PMMA on the ${SGT.where} up to ${fmt(SGT.o2_pct[1])}% O₂, but its points are not in PSI.`,
             `Każdy test materiału stałego z udokumentowanym ciśnieniem pracował przy ${fmt(PDOC.min_bar, 2)}–${fmt(PDOC.max_bar, 2)} bar. To luka w otwartym archiwum: ${SGT.name} spalał PMMA na ${SGT.where} do ${fmt(SGT.o2_pct[1])}% O₂, ale jego punktów nie ma w PSI.`),
      id: PV.solid_ceiling_at.investigation,
    });
    host.innerHTML = '';
    cards.forEach(c => host.append(el('article', { class: 'tk' + (c.gap ? ' tk-gap' : ''), html:
      `<span class="tag">${c.tag}</span><div class="tk-n">${c.n}</div><div class="tk-k">${c.k}</div>` +
      `<p class="tk-c">${c.c}</p>` +
      // The limit (and the verified quote, where there is one) is one click away, so the card reads as number + suggestion.
      `<details class="tk-qd"><summary>${c.q ? L('Limit and verified quote', 'Ograniczenie i cytat zweryfikowany') : L('Limit', 'Ograniczenie')}</summary>` +
      (c.q ? `<p class="tk-q src-link" role="button" tabindex="0" data-src-kind="quote" data-src-id="${c.id}" data-src-field="conclusion">“${esc(c.q.q)}”<small>${esc(c.q.f)} · <u>${L('open source', 'otwórz źródło')}</u></small></p>` : '') +
      `<p class="tk-lim"><b>${L('Limit', 'Ograniczenie')}:</b> ${c.lim}</p></details>${link(c.id)}` })));
  };
  const INV_BY = Object.fromEntries(D.investigations.map(i => [i.id, i]));

  /* ---------------- funnel ---------------- */
  const renderFunnel = () => {
    const steps = [
      { n: RAW, label: L(`Rows in the ${fmt(D.meta.tables)} published tables`, `Wiersze w ${fmt(D.meta.tables)} opublikowanych tabelach`),
        note: L('as published by NASA PSI', 'w postaci opublikowanej przez NASA PSI') },
      { n: ROWS.length, label: L('Test points', 'Punkty testowe'),
        note: L('rows that parse into a point — BRE turns 18 test-day rows into 43 points, one per oxygen level', 'wiersze dające punkt — BRE zamienia 18 wierszy dni testowych w 43 punkty, po jednym na poziom tlenu') },
      { n: solid.length, label: L('Solid-material test points', 'Punkty testowe materiałów stałych'),
        note: L('fabric, film, plastic — the habitat interior', 'tkanina, folia, plastik — wnętrze habitatu'), kept: true },
      { n: solidO2.length, label: L('Solid points that record an oxygen level', 'Punkty stałe z zapisanym poziomem tlenu'),
        note: L(`the other ${fmt(solid.length - solidO2.length)} carry no oxygen value at all`, `pozostałe ${fmt(solid.length - solidO2.length)} nie mają żadnej wartości tlenu`) },
      { n: solidAbove.length, label: L('Solid points at or above the challenge’s lunar level', 'Punkty stałe na poziomie księżycowym z challenge lub wyżej'),
        note: L(`the highest solid-material point in the corpus is ${fmt(solidMaxO2 * 100, 1)}%; the challenge puts lunar oxygen at ${fmt(CH_O2 * 100, 1)}% or more`, `najwyższy punkt stały w korpusie to ${fmt(solidMaxO2 * 100, 1)}%; challenge podaje tlen księżycowy na ${fmt(CH_O2 * 100, 1)}% lub więcej`), zero: true },
    ];
    const maxN = steps[0].n;
    const chart = $('#funnel-chart');
    chart.innerHTML = '';
    steps.forEach(s => {
      const row = el('div', { class: 'f-row' + (s.zero ? ' zero' : s.kept ? ' kept' : '') });
      row.append(el('div', { class: 'f-num' }, fmt(s.n)));
      const bar = el('div', { class: 'f-bar' });
      const fill = el('div', { class: 'f-fill' });
      fill.style.transform = `scaleX(${Math.max(0.004, s.n / maxN)})`;
      bar.append(fill);
      row.append(bar);
      row.append(el('div', { class: 'f-label', html: `<b>${s.label}</b>${s.note}` }));
      chart.append(row);
    });

    // Where the rows between "published" and "counted" actually go. Named, not
    // summarised. BRE is excluded from `drop`: it turns 18 rows into 43 points,
    // so its difference is negative and subtracting it would understate the loss.
    const drop = (id) => { const i = D.investigations.find(x => x.id === id); return i && i.id !== 'PSI-20' ? i.raw_rows - i.rows : 0; };
    const unmapped = drop('PSI-21') + drop('PSI-22') + drop('PSI-23');
    const F = D.funnel;
    const fn = $('#funnel-note');
    if (fn) fn.innerHTML = L(
      `${fmt(F.published_rows)} published rows, ${fmt(F.rejected_rows)} rejected for a named cause, ${fmt(F.rows_kept)} rows that become test points — ` +
        `and <strong>${fmt(F.test_points)}</strong> test points, because BRE's ${fmt(F.bre_rows)} test-day rows each list several oxygen levels and become ` +
        `${fmt(F.bre_points)} points. That ${fmt(F.bre_expansion)}-point difference is the whole gap between the row count and the point count. ` +
        `The ${fmt(F.rejected_rows)}: ${fmt(F.rejected_by_cause.blank)} empty rows at the tail of the CFI-G inverse-flame sheet, ` +
        `${fmt(unmapped)} in the CLD Flame, E-FIELD and s-Flame tables whose columns this build does not map, ` +
        `${fmt(F.rejected_by_cause.summary_sheet)} in the cross-experiment summary sheet (a digest, not a test table), ` +
        `and ${fmt(F.rejected_by_cause.saffire)} Saffire rows, ${fmt(F.pretest_rows)} of them pre-test flow-visualisation records.`,
      `${fmt(F.published_rows)} opublikowanych wierszy, ${fmt(F.rejected_rows)} odrzuconych z nazwaną przyczyną, ${fmt(F.rows_kept)} wierszy, które dają punkty testowe — ` +
        `i <strong>${fmt(F.test_points)}</strong> punktów testowych, bo ${fmt(F.bre_rows)} wierszy dni testowych BRE wymienia po kilka poziomów tlenu i daje ` +
        `${fmt(F.bre_points)} punktów. Ta różnica ${fmt(F.bre_expansion)} punktów to cała luka między liczbą wierszy a liczbą punktów. ` +
        `Te ${fmt(F.rejected_rows)}: ${fmt(F.rejected_by_cause.blank)} pustych wierszy na końcu arkusza płomienia odwrotnego CFI-G, ` +
        `${fmt(unmapped)} w tabelach CLD Flame, E-FIELD i s-Flame, których kolumn ta kompilacja nie mapuje, ` +
        `${fmt(F.rejected_by_cause.summary_sheet)} w arkuszu zbiorczym między eksperymentami (streszczenie, nie tabela testów), ` +
        `i ${fmt(F.rejected_by_cause.saffire)} wierszy Saffire, z czego ${fmt(F.pretest_rows)} to zapisy wizualizacji przepływu sprzed testu.`);
  };

  /* ---------------- map ---------------- */
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (t, a = {}) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) n.setAttribute(k, a[k]);
    return n;
  };
  // Left margin has to hold a tick label AND a rotated axis title; at 78 they
  // overlapped and the "(log)" cut through "2.0 bar".
  const W = 1000, H = 700, M = { l: 104, r: 34, t: 30, b: 172 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const P_MIN = 0.4, P_MAX = 5.6;
  const O2_MAX = 90;
  const xOf = o2 => M.l + (o2 * 100 / O2_MAX) * PW;
  const yOf = p => M.t + PH * (1 - Math.log(p / P_MIN) / Math.log(P_MAX / P_MIN));
  const svg = $('#map-svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // One tooltip for the whole chart, built once and reused across renders.
  const tip = el('div', {
    style: 'position:fixed;pointer-events:none;z-index:99;display:none;background:#12151a;border:1px solid #2a313c;padding:8px 11px;font-family:var(--mono);font-size:11px;line-height:1.5;color:#e7eaef;max-width:260px;white-space:nowrap'
  });
  document.body.append(tip);
  svg.addEventListener('mousemove', e => {
    const t = e.target.closest('[data-tip]');
    if (!t) { tip.style.display = 'none'; return; }
    tip.innerHTML = t.dataset.tip;
    tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX + 14, innerWidth - 280) + 'px';
    tip.style.top = (e.clientY + 16) + 'px';
  });
  svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

  const renderMap = () => {
    svg.innerHTML = '';

    // The envelope is the challenge's own sentence, drawn from the one shared
    // definition above: oxygen >= 30%, pressure <= 10.2 psi, with the 4.3 psi
    // suit as the floor — "10.2 psi or less" has no lower bound on its own and
    // would swallow every vacuum test. FLEX sits at 0.702-0.726 bar against a
    // 0.703 bar ceiling, so the box carries the tolerance it is drawn with and
    // the caption states it.
    const WIN = CH_WIN;
    svg.append(svgEl('rect', {
      // Clipped at the plot's floor: below it are the axis labels, not pressure.
      x: xOf(WIN.o2Lo), y: yOf(WIN.pHi), width: xOf(WIN.o2Hi) - xOf(WIN.o2Lo), height: Math.min(yOf(WIN.pLo), M.t + PH) - yOf(WIN.pHi),
      fill: 'rgba(255,106,31,.09)', stroke: 'rgba(255,106,31,.42)', 'stroke-width': 1, 'stroke-dasharray': '5 4',
    }));
    const inEnv = both.filter(inChallenge);
    const envBy = {};
    inEnv.forEach(r => { envBy[r.ph] = (envBy[r.ph] || 0) + 1; });
    const envList = Object.entries(envBy).map(([k, v]) => `${v} ${phaseShort(k)}`).join(' · ') || L('no points', 'brak punktów');
    // Caption goes inside the band's empty area; the point count goes in the
    // section lede so no label sits on top of the dots.
    const zl = svgEl('text', { x: xOf(LUNAR_O2) + 12, y: yOf(LUNAR_P) + 18, fill: '#ff6a1f', 'font-size': 12.5, 'letter-spacing': '1.1' });
    // Two short lines inside the band, not one long one: the caption used to run
    // several times the width of the rectangle it was labelling.
    const zl1 = svgEl('text', { x: xOf(0.66), y: yOf(CH_P) + 24, fill: '#ff6a1f', 'font-size': 12.5, 'letter-spacing': '1.1' });
    zl1.textContent = L('CHALLENGE', 'OBWIEDNIA');
    svg.append(zl1);
    zl.textContent = L('ENVELOPE', 'Z CHALLENGE');
    zl.setAttribute('x', String(xOf(0.66)));
    zl.setAttribute('y', String(yOf(CH_P) + 38));
    zl.setAttribute('letter-spacing', '1.1');
    svg.append(zl);
    const envNote = $('#env-note');
    if (envNote) envNote.innerHTML = L(
      `<strong>${fmt(inEnv.length)}</strong> measured points fall inside this band — ${envList}. ` +
        `The challenge puts lunar oxygen at 30% or more, at 10.2 psi or less; the box also stops at the 4.3 psi suit, because the sentence has no lower bound. ` +
        `FLEX sits at 0.702–0.726 bar, so the box is drawn with a ±${fmt(CH_TOL * 100, 0)}% pressure tolerance and says so. ` +
        `No solid-material point is inside it: all ${fmt(solidDocP)} solid points with a documented pressure ran at ` +
        `${fmt(PDOC.min_bar, 2)}–${fmt(PDOC.max_bar, 2)} bar, and none above ${fmt(solidMaxO2 * 100, 1)}% O2. ` +
        `The dotted curve holds the challenge atmosphere's oxygen partial pressure, ${fmt(CH.ppo2_bar, 2)} bar: ${fmt(CH.solid_at_ppo2)} of the ${fmt(CH.solid_with_both)} solid tests with both values reach it, near 1 bar. ` +
        `So the amount of oxygen was tested; its share of the gas was not — and NASA certifies spacecraft materials at 30% O₂ and 10.2 psia because oxygen concentration is the primary driver (Hirsch et al., NTRS 20090012334; Harper et al., NTRS 20160001047). ` +
        `The hollow circles are the ${fmt(D.campaign.tests)} suggested tests (${fmt(D.campaign.classes.length)} material classes at each condition) — a plan, not data.`,
      `<strong>${fmt(inEnv.length)}</strong> zmierzonych punktów wpada w to pole — ${envList}. ` +
        `Challenge podaje tlen księżycowy na 30% lub więcej, przy 10,2 psi lub mniej; pole kończy się też na skafandrze 4,3 psi, bo to zdanie nie ma dolnej granicy. ` +
        `FLEX pracuje przy 0,702–0,726 bar, więc pole jest rysowane z tolerancją ciśnienia ±${fmt(CH_TOL * 100, 0)}% i mówi to wprost. ` +
        `Żaden punkt materiału stałego w nim nie leży: wszystkie ${fmt(solidDocP)} punkty stałe z udokumentowanym ciśnieniem pracowały przy ` +
        `${fmt(PDOC.min_bar, 2)}–${fmt(PDOC.max_bar, 2)} bar, żaden powyżej ${fmt(solidMaxO2 * 100, 1)}% O2. ` +
        `Kropkowana krzywa to stałe ciśnienie cząstkowe tlenu atmosfery z challenge'u, ${fmt(CH.ppo2_bar, 2)} bar: osiąga je ${fmt(CH.solid_at_ppo2)} z ${fmt(CH.solid_with_both)} testów stałych z obiema wartościami, przy około 1 bar. ` +
        `Ilość tlenu była więc testowana; jego udział w gazie — nie. NASA certyfikuje materiały statków przy 30% O₂ i 10,2 psia, bo to stężenie tlenu jest głównym czynnikiem (Hirsch i in., NTRS 20090012334; Harper i in., NTRS 20160001047). ` +
        `Puste kółka to ${fmt(D.campaign.tests)} sugerowanych testów (${fmt(D.campaign.classes.length)} klas materiałów w każdym warunku) — plan, nie dane.`);

    // grid
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(v => {
      const x = xOf(v / 100);   // xOf takes a fraction, not a percentage
      svg.append(svgEl('line', { x1: x, y1: M.t, x2: x, y2: M.t + PH, stroke: '#1d222a', 'stroke-width': 1 }));
      const t = svgEl('text', { x, y: M.t + PH + 24, fill: '#8b93a0', 'font-size': 13, 'text-anchor': 'middle' });
      t.textContent = v + '%';
      svg.append(t);
    });
    [0.5, 0.7, 1, 1.5, 2, 3, 5].forEach(v => {
      const y = yOf(v);
      svg.append(svgEl('line', { x1: M.l, y1: y, x2: M.l + PW, y2: y, stroke: '#1d222a', 'stroke-width': 1 }));
      const t = svgEl('text', { x: M.l - 12, y: y + 4, fill: '#8b93a0', 'font-size': 13, 'text-anchor': 'end' });
      t.textContent = fmt(v, 1) + ' bar';
      svg.append(t);
    });
    // axis titles
    const xt = svgEl('text', { x: M.l + PW / 2, y: M.t + PH + 54, fill: '#b3bac5', 'font-size': 14, 'text-anchor': 'middle', 'letter-spacing': '1.5' });
    xt.textContent = L('OXYGEN CONCENTRATION', 'STĘŻENIE TLENU');
    svg.append(xt);
    const yt = svgEl('text', { x: 16, y: M.t + PH / 2, fill: '#b3bac5', 'font-size': 14, 'text-anchor': 'middle', 'letter-spacing': '1.5', transform: `rotate(-90 16 ${M.t + PH / 2})` });
    yt.textContent = L('CHAMBER PRESSURE (log)', 'CIŚNIENIE W KOMORZE (log)');
    svg.append(yt);

    // ---- equal oxygen partial pressure: o2 × p = the challenge's ----
    // Drawn from the two challenge numbers only. It runs through the solid
    // cluster near 1 bar: the amount of oxygen was tested, its fraction was not.
    const PP = CH.ppo2_bar;
    const ppPts = [];
    for (let k = 0; k <= 80; k++) {
      const o2 = PP / P_MAX + (Math.min(O2_MAX / 100, PP / P_MIN) - PP / P_MAX) * k / 80;
      ppPts.push(`${k ? 'L' : 'M'}${xOf(o2).toFixed(1)},${yOf(PP / o2).toFixed(1)}`);
    }
    const ppPath = svgEl('path', { d: ppPts.join(' '), fill: 'none', stroke: '#cbd5e1', 'stroke-width': 1.6, 'stroke-dasharray': '1.5 4.5', 'stroke-linecap': 'round', opacity: .85 });
    svg.append(ppPath);
    // Labelled where the curve leaves the plot, inside the box's empty floor.
    const ppO = 0.5;
    const ppL = svgEl('text', { x: xOf(ppO) + 10, y: yOf(PP / ppO) - 2, fill: '#cbd5e1', 'font-size': 12.5, 'letter-spacing': '.6' });
    ppL.textContent = L(`O₂ PARTIAL PRESSURE ${fmt(PP, 2)} bar`, `CIŚN. CZĄSTKOWE O₂ ${fmt(PP, 2)} bar`);
    svg.append(ppL);

    // points
    const pts = svgEl('g');
    both.forEach(r => {
      const c = svgEl('circle', {
        cx: xOf(r.o2), cy: yOf(r.p), r: 3.1,
        fill: PHASE_COLOR[r.ph] || '#94a3b8', opacity: .5,
      });
      // A row whose pressure came from a report rather than the test table has
      // to say so in the tooltip, or the map shows a measurement that was never
      // made at that condition.
      const pSrc = r.pd ? L(' <span style="color:#8b93a0">(from the report, not a per-test reading)</span>',
                            ' <span style="color:#8b93a0">(z raportu, nie z pomiaru per test)</span>') : '';
      c.dataset.tip = `${esc(r.a)} · ${esc(r.i)}<br>O2 ${fmt(r.o2 * 100, 1)}% · ${fmt(r.p, 3)} bar${pSrc}<br>${esc(phaseName(r.ph))}${r.fu ? ' · ' + esc(r.fu) : ''}${r.m ? ' · ' + esc(r.m) : ''}`;
      pts.append(c);
    });
    svg.append(pts);

    // ---- the suggested campaign: hollow, so it never reads as data ----
    const camp = D.campaign;
    const conds = [];
    camp.cells.forEach(c => { if (!conds.some(x => x[0] === c.o2_pct && x[1] === c.p_bar)) conds.push([c.o2_pct, c.p_bar]); });
    conds.forEach(([o, p]) => {
      const c = svgEl('circle', { cx: xOf(o / 100), cy: yOf(p), r: 8, fill: 'rgba(8,9,11,.6)', stroke: '#e7eaef', 'stroke-width': 1.8, 'stroke-dasharray': '3 2.2' });
      c.dataset.tip = L(`suggested test condition — a plan, not data<br>${fmt(o, 1)}% O₂ · ${fmt(p, 3)} bar<br>${fmt(camp.classes.length)} material classes, ${fmt(camp.replicates)} test each`,
        `sugerowany warunek testu — plan, nie dane<br>${fmt(o, 1)}% O₂ · ${fmt(p, 3)} bar<br>${fmt(camp.classes.length)} klas materiałów, po ${fmt(camp.replicates)} teście`);
      svg.append(c);
    });
    const lowP = Math.min(...conds.map(x => x[1])), hiO = Math.max(...conds.map(x => x[0]));
    const hiP = Math.max(...conds.map(x => x[1]));
    const pl = svgEl('text', { x: xOf(hiO / 100) + 14, y: yOf(hiP) - 12, fill: '#e7eaef', 'font-size': 13, 'letter-spacing': '.8', stroke: '#08090b', 'stroke-width': 3, 'paint-order': 'stroke' });
    pl.textContent = L(`PLAN · ${fmt(camp.tests)} TESTS`, `PLAN · ${fmt(camp.tests)} TESTÓW`);
    svg.append(pl);

    // ---- the solid strip: the points with no pressure anywhere ----
    // 252 solid points plot normally on the 1 bar line, 131 of them from a
    // documented value outside the test table. The 12 with no pressure anywhere
    // have no y coordinate at all, so they are parked here rather than dropped.
    const stripY = M.t + PH + 108;
    svg.append(svgEl('line', { x1: M.l, y1: stripY - 30, x2: M.l + PW, y2: stripY - 30, stroke: '#2a313c', 'stroke-width': 1, 'stroke-dasharray': '3 5' }));
    const npO2 = solidNoP.filter(r => r.o2 != null);
    const npLo = Math.min(...npO2.map(r => r.o2)), npHi = Math.max(...npO2.map(r => r.o2));
    const band = svgEl('rect', {
      x: xOf(npLo), y: stripY - 6, width: xOf(npHi) - xOf(npLo), height: 12,
      fill: 'rgba(245,158,11,.28)', stroke: '#f59e0b', 'stroke-width': 1,
    });
    band.dataset.tip = L(
      `${solidNoP.length} solid-material tests<br>O2 ${fmt(npLo * 100, 1)}–${fmt(npHi * 100, 1)}%<br>pressure: not recorded anywhere`,
      `${solidNoP.length} testów materiałów stałych<br>O2 ${fmt(npLo * 100, 1)}–${fmt(npHi * 100, 1)}%<br>ciśnienie: nigdzie nie zapisane`);
    svg.append(band);

    const st1 = svgEl('text', { x: xOf(npLo) - 10, y: stripY + 4, fill: '#f59e0b', 'font-size': 12.5, 'letter-spacing': '.6', 'text-anchor': 'end' });
    st1.textContent = L(`SOLID · ${solidNoP.length}`, `STAŁE · ${solidNoP.length}`);
    svg.append(st1);
    const st2 = svgEl('text', { x: xOf(CH_O2) + 14, y: stripY + 4, fill: '#8b93a0', 'font-size': 12.5 });
    st2.textContent = L('← these tests record no pressure anywhere, so they have no place on the chart',
      '← te testy nigdzie nie zapisują ciśnienia, więc nie mają miejsca na wykresie');
    svg.append(st2);
    const st3 = svgEl('text', { x: xOf(npLo) - 10, y: stripY - 16, fill: '#8b93a0', 'font-size': 12, 'text-anchor': 'end' });
    st3.textContent = L(`other ${solidP.length} at ${fmt(solidPMin, 2)}–${fmt(solidPMax, 2)} bar ↑`,
      `pozostałe ${solidP.length} przy ${fmt(solidPMin, 2)}–${fmt(solidPMax, 2)} bar ↑`);
    svg.append(st3);

    // ---- the wall at the solid ceiling ----
    svg.append(svgEl('line', {
      x1: xOf(solidMaxO2), y1: M.t, x2: xOf(solidMaxO2), y2: stripY + 10,
      stroke: '#f59e0b', 'stroke-width': 1.5, 'stroke-dasharray': '6 4', opacity: .8,
    }));
    const wt = svgEl('text', { x: xOf(solidMaxO2) - 8, y: M.t + 12, fill: '#f59e0b', 'font-size': 13, 'letter-spacing': '.8', 'text-anchor': 'end' });
    wt.textContent = L(`SOLIDS STOP ${fmt(solidMaxO2 * 100, 1)}%`, `STAŁE KOŃCZĄ SIĘ ${fmt(solidMaxO2 * 100, 1)}%`);
    svg.append(wt);

    // ---- the challenge line, and the gap to the solid ceiling ----
    svg.append(svgEl('line', {
      x1: xOf(CH_O2), y1: M.t, x2: xOf(CH_O2), y2: stripY + 10,
      stroke: '#ff6a1f', 'stroke-width': 1.5,
    }));
    const rt = svgEl('text', { x: xOf(CH_O2) + 8, y: M.t + 12, fill: '#ff6a1f', 'font-size': 13, 'letter-spacing': '.8' });
    // 30% is the challenge's "likely" level, not a requirement. Calling it one
    // turns a stated expectation into a threshold the data failed to meet.
    rt.textContent = L(`CHALLENGE ${fmt(CH_O2 * 100, 0)}%+`, `CHALLENGE ${fmt(CH_O2 * 100, 0)}%+`);
    svg.append(rt);

    // ---- the gap annotation, placed in the empty top band ----
    const gy = M.t + 58;
    svg.append(svgEl('line', { x1: xOf(solidMaxO2), y1: gy, x2: xOf(CH_O2), y2: gy, stroke: '#ef4444', 'stroke-width': 1.5 }));
    [xOf(solidMaxO2), xOf(CH_O2)].forEach(x =>
      svg.append(svgEl('line', { x1: x, y1: gy - 6, x2: x, y2: gy + 6, stroke: '#ef4444', 'stroke-width': 1.5 })));
    // Two lines, not one: the bracket is only ~77 viewBox units wide, and
    // "7.3 pp untested" / "7,3 pp nieprzetestowane" is wider than that.
    const gx = (xOf(solidMaxO2) + xOf(CH_O2)) / 2;
    // paint-order knocks the dashed ceiling line out from behind the label
    // instead of letting it strike through the number.
    const knockout = { stroke: '#08090b', 'stroke-width': 3, 'paint-order': 'stroke' };
    const gt = svgEl('text', { x: gx, y: gy + 17, fill: '#ef4444', 'font-size': 14, 'text-anchor': 'middle', 'letter-spacing': '.6', 'font-weight': 600, ...knockout });
    gt.textContent = `${fmt((CH_O2 - solidMaxO2) * 100, 1)} pp`;
    svg.append(gt);
    const gt2 = svgEl('text', { x: gx, y: gy + 30, fill: '#ef4444', 'font-size': 12, 'text-anchor': 'middle', 'letter-spacing': '.4', ...knockout });
    gt2.textContent = L('not in PSI', 'brak w PSI');
    svg.append(gt2);

    // legend
    const lg = $('#map-legend');
    lg.innerHTML = '';
    lg.append(el('p', { class: 'lg-h' }, L('Each dot is one test: oxygen across, chamber pressure up. Colour = material class.', 'Każda kropka to jeden test: tlen w poziomie, ciśnienie w komorze w pionie. Kolor = klasa materiału.')));
    ['solid', 'emulator', 'droplet', 'gas', 'aerosol'].forEach(k => {
      const n = both.filter(r => r.ph === k).length;
      if (!n) return;   // a class with no point on this chart has no place in its legend
      lg.append(el('span', {}, el('i', { style: `background:${PHASE_COLOR[k]}` }), phaseName(k), el('b', {}, fmt(n))));
    });
    lg.append(el('span', {}, el('i', { style: 'background:transparent;border:1px solid #f59e0b;border-radius:0' }),
      L('strip under the axis: solid tests with no pressure recorded', 'pasek pod osią: testy stałe bez zapisanego ciśnienia'), el('b', {}, fmt(solidNoP.length))));
    lg.append(el('span', {}, el('i', { style: 'background:rgba(255,106,31,.18);border:1px dashed #ff6a1f;border-radius:0' }),
      L('orange box: the challenge atmosphere (30%+ O₂, 10.2 psi or less)', 'pomarańczowe pole: atmosfera z challenge\'u (30%+ O₂, 10,2 psi lub mniej)'), el('b', {}, fmt(both.filter(inChallenge).length))));
    lg.append(el('span', {}, el('i', { style: 'background:transparent;border-top:2px dotted #cbd5e1;border-radius:0;height:0;margin-top:7px' }),
      L(`dotted curve: the challenge's oxygen partial pressure (${fmt(CH.ppo2_bar, 2)} bar) — solid tests that reach it`, `kropkowana krzywa: ciśnienie cząstkowe O₂ z challenge'u (${fmt(CH.ppo2_bar, 2)} bar) — testy stałe, które je osiągają`), el('b', {}, fmt(CH.solid_at_ppo2))));
    lg.append(el('span', {}, el('i', { style: 'background:transparent;border:1.5px dashed #e7eaef' }),
      L('hollow circle: a suggested test condition — a plan, not data (tests)', 'puste kółko: sugerowany warunek testu — plan, nie dane (testy)'), el('b', {}, fmt(D.campaign.tests))));
  };

  /* ---------------- flow map ---------------- */
  // The same test tables carry an air-flow setting, and 245 solid-material rows
  // have both axes. BASS-II's column is not a number but the operator's log of
  // the setting through the test ("5 down to ext"), so the marker shape says
  // what the log recorded and the tooltip keeps the raw cell. Nothing here is
  // interpreted: a point with no annotation is drawn as "no outcome recorded".
  const renderFlowMap = () => {
    const host = $('#flow-svg');
    if (!host) return;
    const W2 = 1000, H2 = 520, M2 = { l: 100, r: 34, t: 26, b: 78 };
    const PW2 = W2 - M2.l - M2.r, PH2 = H2 - M2.t - M2.b;
    host.setAttribute('viewBox', `0 0 ${W2} ${H2}`);
    host.innerHTML = '';
    // Solid material by default: it is the class the challenge is about, and
    // 247 of the 501 two-axis points at once is a chart you can read from the
    // back of the room. The other classes are one click away.
    const all = ROWS.filter(r => r.f != null && r.o2 != null);
    if (!all.length) return;
    const scope = flowScope;
    const rows = all.filter(r => scope === 'all' || r.ph === scope);
    const fMax = Math.max(...all.map(r => r.f));
    // Fit the axes to what is actually drawn, not to the whole corpus: at solid
    // scope the points live between 12 and 24% oxygen and a fixed 0-90 axis
    // squeezed them into a sixth of the width.
    const o2Min = Math.min(...rows.map(r => r.o2)) * 100, o2Max = Math.max(...rows.map(r => r.o2)) * 100;
    const X0 = Math.max(0, Math.floor(o2Min - 2)), X1 = Math.min(100, Math.ceil(o2Max + 2));
    const X = o2 => M2.l + ((o2 * 100 - X0) / (X1 - X0)) * PW2;
    const Y = f => M2.t + PH2 * (1 - Math.sqrt(Math.max(0, f) / fMax));
    const OUT_COLOR = { extinction: '#ef4444', blowoff: '#38bdf8', null: '#f59e0b' };
    // The four outcome-bearing cells that never wrote a final setting. They are
    // drawn as an arrow from the start setting, because the flow was reduced
    // until the flame went out and the value it went out at is not recorded.
    const RAMP_LABEL = L('went out after the flow was reduced from', 'zgasł po zmniejszeniu przepływu od');

    const step = (X1 - X0) <= 20 ? 2 : 10;
    for (let v = X0; v <= X1; v += step) {
      host.append(svgEl('line', { x1: X(v / 100), y1: M2.t, x2: X(v / 100), y2: M2.t + PH2, stroke: '#1d222a' }));
      const t = svgEl('text', { x: X(v / 100), y: M2.t + PH2 + 20, fill: '#8b93a0', 'font-size': 13, 'text-anchor': 'middle' });
      t.textContent = v + '%';
      host.append(t);
    }
    [0, 2, 5, 10, 20, 50].filter(v => v <= fMax).forEach(v => {
      host.append(svgEl('line', { x1: M2.l, y1: Y(v), x2: M2.l + PW2, y2: Y(v), stroke: '#1d222a' }));
      const t = svgEl('text', { x: M2.l - 10, y: Y(v) + 4, fill: '#8b93a0', 'font-size': 13, 'text-anchor': 'end' });
      t.textContent = fmt(v) + ' cm/s';
      host.append(t);
    });
    const xt = svgEl('text', { x: M2.l + PW2 / 2, y: M2.t + PH2 + 46, fill: '#b3bac5', 'font-size': 14, 'text-anchor': 'middle', 'letter-spacing': '1.5' });
    xt.textContent = L('OXYGEN CONCENTRATION', 'STĘŻENIE TLENU');
    host.append(xt);
    const yt = svgEl('text', { x: 16, y: M2.t + PH2 / 2, fill: '#b3bac5', 'font-size': 14, 'text-anchor': 'middle', 'letter-spacing': '1.5', transform: `rotate(-90 16 ${M2.t + PH2 / 2})` });
    // "Air display" is duct flow speed in cm/s, per the BASS-II ReadMe. A dot is
    // the setting a test opened at; a ring is the last setting its log records.
    yt.textContent = L('AIR FLOW PAST THE SAMPLE (cm/s)', 'PRZEPŁYW POWIETRZA PRZY PRÓBCE (cm/s)');
    host.append(yt);

    const g = svgEl('g');
    rows.forEach(r => {
      const fl = r.fl || {};
      const out = fl.out || null;
      const ramps = out && fl.ramp;
      let node;
      if (ramps) {
        // An arrow pointing down the flow axis: the flame went out somewhere
        // below the opening setting, and the table does not say where.
        const y1 = Y(r.f), y2 = Y(Math.max(0, r.f) * 0.25);
        node = svgEl('line', {
          x1: X(r.o2), y1, x2: X(r.o2), y2,
          stroke: OUT_COLOR[out], 'stroke-width': 2.6, 'marker-end': `url(#flow-arrow-${out})`,
        });
      } else if (out === 'blowoff') {
        node = svgEl('rect', { x: X(r.o2) - 6, y: Y(r.f) - 6, width: 12, height: 12, fill: OUT_COLOR[out], opacity: .95 });
      } else if (out) {
        // The ring sits where the log ends, not where the test opened: "5 3 2 ext"
        // went out at 2, and drawing it at 5 puts the extinction at the wrong flow.
        const yEnd = Y(fl.to != null ? fl.to : r.f);
        node = svgEl('g');
        if (fl.to != null) node.append(svgEl('line', { x1: X(r.o2), y1: Y(r.f), x2: X(r.o2), y2: yEnd, stroke: OUT_COLOR[out], 'stroke-width': 1.6, opacity: .7 }));
        node.append(svgEl('circle', { cx: X(r.o2), cy: yEnd, r: 7, fill: '#08090b', stroke: OUT_COLOR[out], 'stroke-width': 2.8 }));
      } else {
        node = svgEl('circle', { cx: X(r.o2), cy: Y(r.f), r: 4.2, fill: OUT_COLOR[null], opacity: .5 });
      }
      const where = ramps ? `${RAMP_LABEL} ${fmt(r.f, 0)} cm/s — ${L('final setting not recorded', 'nastawa końcowa niezapisana')}`
        : fl.to != null ? `${L('final setting', 'nastawa końcowa')} ${fmt(fl.to, 1)} cm/s`
        : '';
      const raw = fl.raw ? `<br><span style="color:#8b93a0">air display: “${esc(fl.raw)}”</span>` : '';
      const obs = r.ob ? `<br><span style="color:#8b93a0">${esc(r.ob.slice(0, 150))}${r.ob.length > 150 ? '…' : ''}</span>` : '';
      node.dataset.tip = `${esc(r.a)} · ${esc(r.i)} #${r.r}<br>O₂ ${fmt(r.o2 * 100, 1)}% · ${fmt(r.f, 1)} cm/s`
        + `<br>${out ? (out === 'extinction' ? L('extinguished', 'wygaśnięcie') : L('blew off', 'zdmuchnięcie')) : L('no outcome recorded', 'brak zapisanego wyniku')}`
        + (where ? `<br>${where}` : '') + raw + obs;
      g.append(node);
    });
    // One arrowhead per outcome colour, defined once. svgEl takes no children,
    // so the marker is appended to its defs rather than passed as one.
    const defs = svgEl('defs');
    ['extinction', 'blowoff'].forEach(o => {
      const mk = svgEl('marker', { id: `flow-arrow-${o}`, markerWidth: 5, markerHeight: 5, refX: 4, refY: 2.5, orient: 'auto', markerUnits: 'strokeWidth' });
      mk.append(svgEl('path', { d: 'M0,0 L5,2.5 L0,5 z', fill: OUT_COLOR[o] }));
      defs.append(mk);
    });
    host.append(defs);
    host.append(g);

    const ctrl = $('#flow-scope');
    if (ctrl) {
      ctrl.innerHTML = '';
      [['solid', L('solid material', 'materiał stały')], ['all', L('all classes', 'wszystkie klasy')]].forEach(([k, lab]) => {
        const b = el('button', { class: 'chip' + (flowScope === k ? ' on' : '') }, lab);
        b.onclick = () => { flowScope = k; renderFlowMap(); };
        ctrl.append(b);
      });
    }
    const lg = $('#flow-legend');
    if (lg) {
      lg.innerHTML = '';
      const cnt = f => fmt(rows.filter(f).length);
      lg.append(el('p', { class: 'lg-h' }, L('Each mark is one test: oxygen across, the air-flow setting up. The shape says what the operator\'s log recorded about how the test ended.',
                                            'Każdy znak to jeden test: tlen w poziomie, nastawa przepływu powietrza w pionie. Kształt mówi, co log operatora zapisał o końcu testu.')));
      lg.append(el('span', {}, el('i', { style: 'background:#f59e0b;opacity:.6' }), L('only the flow setting is logged — how the test ended is not recorded', 'zapisana tylko nastawa przepływu — jak skończył się test, nie wiadomo'), el('b', {}, cnt(r => !(r.fl && r.fl.out)))));
      lg.append(el('span', {}, el('i', { style: 'background:transparent;border:2.8px solid #ef4444;border-radius:50%' }), L('the flame went out at this flow (the last setting in the log)', 'płomień zgasł przy tym przepływie (ostatnia nastawa w logu)'), el('b', {}, cnt(r => r.fl && r.fl.out === 'extinction' && !r.fl.ramp))));
      lg.append(el('span', {}, el('i', { style: 'background:transparent;color:#ef4444;font-weight:700;font-size:15px;line-height:1;text-align:center;width:auto' }, '↓'), L('the operator turned the flow down from here until the flame went out; the flow at that moment is not recorded', 'operator zmniejszał przepływ od tej wartości, aż płomień zgasł; przepływ w tej chwili nie jest zapisany'), el('b', {}, cnt(r => r.fl && r.fl.out === 'extinction' && r.fl.ramp))));
      lg.append(el('span', {}, el('i', { style: 'background:#38bdf8;border-radius:0' }), L('the flame was blown off by the flow', 'płomień został zdmuchnięty przez przepływ'), el('b', {}, cnt(r => r.fl && r.fl.out === 'blowoff'))));
    }
    const nOut = rows.filter(r => r.fl && r.fl.out).length;
    const ext = rows.filter(r => r.fl && r.fl.out === 'extinction');
    const blow = rows.filter(r => r.fl && r.fl.out === 'blowoff');
    const nRamp = ext.filter(r => r.fl.ramp).length;
    const openOf = rs => [...new Set(rs.map(r => r.f))].sort((a, b) => a - b);
    const listOf = vs => vs.length === 1 ? fmt(vs[0], 0) : vs.slice(0, -1).map(v => fmt(v, 0)).join(', ') + ' and ' + fmt(vs[vs.length - 1], 0);
    const listOfPl = vs => vs.length === 1 ? fmt(vs[0], 0) : vs.slice(0, -1).map(v => fmt(v, 0)).join(', ') + ' i ' + fmt(vs[vs.length - 1], 0);
    const o2of = rs => [Math.min(...rs.map(r => r.o2 * 100)), Math.max(...rs.map(r => r.o2 * 100))];
    const [e0, e1] = o2of(ext), [b0, b1] = o2of(blow);    const fn = $('#flow-note');
    if (fn) fn.innerHTML = L(
      `<strong>${fmt(rows.length)}</strong> test points record both an oxygen level and a flow setting${scope === 'all' ? '' : ` — all ${fmt(rows.length)} solid materials`}. ` +
        `<strong>${fmt(nOut)}</strong> carry an outcome in the operator's log: <strong>${fmt(ext.length)}</strong> extinguished and <strong>${fmt(blow.length)}</strong> blew off, at ${fmt(Math.min(e0, b0), 1)}–${fmt(Math.max(e1, b1), 1)}% O₂, across PMMA rods and sheets of three thicknesses. ` +
        `Extinctions opened at <strong>${listOf(openOf(ext))} cm/s</strong> and blow-offs at <strong>${listOf(openOf(blow))} cm/s</strong> — not a clean split, and the oxygen ranges overlap (${fmt(e0, 1)}–${fmt(e1, 1)}% against ${fmt(b0, 1)}–${fmt(b1, 1)}%), so flow is not the only variable. ` +
        `And <strong>${fmt(nRamp)} of the ${fmt(ext.length)}</strong> extinctions were reached by <strong>reducing</strong> the flow from the opening setting until the flame went out — the value it went out at is not in the table, so those arrows mark a direction, not a threshold. ` +
        `The raw cell is in the tooltip. Where the log is a bare setting ("10, 5, 3") the test has no recorded outcome, and the chart does not invent one.`,
      `<strong>${fmt(rows.length)}</strong> punktów testowych zapisuje jednocześnie poziom tlenu i nastawę przepływu${scope === 'all' ? '' : ` — wszystkie ${fmt(rows.length)} to materiały stałe`}. ` +
        `<strong>${fmt(nOut)}</strong> mają wynik w logu operatora: <strong>${fmt(ext.length)}</strong> wygaśnięć i <strong>${fmt(blow.length)}</strong> zdmuchnięć, przy ${fmt(Math.min(e0, b0), 1)}–${fmt(Math.max(e1, b1), 1)}% O₂, na prętach i płytach PMMA o trzech grubościach. ` +
        `Wygaśnięcia startowały przy <strong>${listOfPl(openOf(ext))} cm/s</strong>, zdmuchnięcia przy <strong>${listOfPl(openOf(blow))} cm/s</strong> — to nie jest czysty podział, a zakresy tlenu zachodzą na siebie (${fmt(e0, 1)}–${fmt(e1, 1)}% wobec ${fmt(b0, 1)}–${fmt(b1, 1)}%), więc przepływ też nie jest jedyną zmienną. ` +
        `A <strong>${fmt(nRamp)} z ${fmt(ext.length)}</strong> wygaśnięć osiągnięto przez <strong>zmniejszanie</strong> przepływu od nastawy początkowej, aż płomień zgasł — wartości, przy której zgasł, nie ma w tabeli, więc te strzałki pokazują kierunek, nie próg. ` +
        `Surowa komórka jest w podpowiedzi. Gdzie log to sama nastawa („10, 5, 3”), test nie ma zapisanego wyniku — i wykres go nie wymyśla.`);
  };

  /* ---------------- atlas ---------------- */
  // Ranking used to be a hand-weighted score (solid +6, pressure +3, ...): a
  // number no judge can check and that moved with whoever wrote it. The
  // challenge orders the classes itself — solid materials first, then the
  // materials-flammability emulator, and the droplet and gas work matters
  // "just not as strongly or directly" — so the rule is on screen and the
  // columns that produce it are shown.
  const CLASS_RANK = { solid: 0, emulator: 1, droplet: 2, gas: 3, aerosol: 4, dust: 5, 'n/a': 6 };
  let atlasEnv = 'challenge';   // challenge | lunar | iss | all
  let atlasActive = 'all';
  let atlasAll = false;      // the Atlas opens with its first rows only
  const ATLAS_FIRST = 6;
  // Solid material is the challenge's own first class and 247 of 501 points is
  // a chart that reads from the back of a room; 'all' is one click away.
  let flowScope = 'solid';

  // The four environments the ranking can be scored against, each with its
  // numbers from one place. "challenge" is not an entry here: it is scored by
  // inChallenge(), the map's own predicate, so the Atlas column and the map
  // caption cannot report different counts for the same envelope.
  const ENVS = {
    lunar: [LUNAR_P, LUNAR_O2, 0.03],
    iss: [1.013, 0.209, 0.03],
    all: null,
  };
  const inTol = (r, env) => env && r.p != null && r.o2 != null
    && Math.abs(Math.log(r.p / env[0])) <= Math.log(1 + env[2])
    && r.o2 >= env[1] - 0.015;

  const rankRows = () => {
    const env = ENVS[atlasEnv];
    const test = env ? (r => inTol(r, env)) : (atlasEnv === 'challenge' ? inChallenge : () => false);
    const o2Ref = env ? env[1] : CH_O2;
    return D.investigations.filter(i => i.raw_rows > 0).map(i => {
      const rs = ROWS.filter(r => r.i === i.id);
      return {
        i,
        inEnv: rs.filter(test).length,
        // total tests at or above the environment's oxygen, pressure-agnostic:
        // the second column, so a class with no pressure column (BRE) is not
        // ranked last for a reason it cannot control.
        aboveO2: rs.filter(r => r.o2 != null && r.o2 >= o2Ref).length,
        total: rs.length,
      };
    }).sort((a, b) =>
      (CLASS_RANK[a.i.phase] - CLASS_RANK[b.i.phase])
      || (b.inEnv - a.inEnv) || (b.aboveO2 - a.aboveO2) || (b.total - a.total));
  };
  let ranked = rankRows();
  // The SI ranking for a described mission, when one is active: { mission, key,
  // ranking: [{id, why}], saved?, model }. null means the rule above is in force.
  let siRank = null;
  let siRankMsg = '';
  const MISSIONS = () => [
    ['rover', L('Pressurized rover', 'Łazik ciśnieniowy')],
    ['base', L('Lunar surface base', 'Baza księżycowa')],
    ['transit', L('Transit cabin', 'Kabina tranzytowa')],
  ];
  // Rows in the order the SI gave, each carrying its reason; anything the SI
  // did not list follows in the rule's order, marked as such.
  const orderedRows = () => {
    if (!siRank) return ranked;
    const pos = new Map(siRank.ranking.map((r, n) => [r.id, n]));
    const why = new Map(siRank.ranking.map(r => [r.id, r.why]));
    const top = ranked.filter(x => pos.has(x.i.id)).sort((a, b) => pos.get(a.i.id) - pos.get(b.i.id));
    const rest = ranked.filter(x => !pos.has(x.i.id));
    return [...top.map(x => ({ ...x, why: why.get(x.i.id), siPos: pos.get(x.i.id) + 1 })), ...rest.map(x => ({ ...x, unranked: true }))];
  };

  const renderAtlas = () => {
    const filters = [
      { k: 'all', label: L('all', 'wszystkie'), f: () => true },
      { k: 'solid', label: L('solid', 'stałe'), f: i => i.phase === 'solid' },
      { k: 'emulator', label: L('emulator', 'emulator'), f: i => i.phase === 'emulator' },
      { k: 'droplet', label: L('droplet', 'kropelkowe'), f: i => i.phase === 'droplet' },
      { k: 'gas', label: L('gas', 'gazowe'), f: i => i.phase === 'gas' },
      { k: 'pressure', label: L('has pressure', 'z ciśnieniem'), f: i => i.has_pressure },
      // Investigations whose points carry no pressure at all (BRE, the smoke and
      // dust tables, the unmapped ACME tables). It used to return true for all.
      { k: 'blind', label: L('no pressure', 'bez ciśnienia'), f: i => !i.has_pressure },
    ];
    const ctrl = $('#atlas-controls');
    const atlas = $('#atlas-list');
    ctrl.innerHTML = '';
    atlas.innerHTML = '';

    // Heading and footnote from the data: which accessions yield points, which
    // tables are counted but not mapped, which accessions have no table.
    const withPts = D.investigations.filter(i => i.rows > 0);
    const unmapped = D.investigations.filter(i => i.rows === 0 && i.raw_rows > 0 && i.phase !== 'n/a');
    const digest = D.investigations.filter(i => i.rows === 0 && i.raw_rows > 0 && i.phase === 'n/a');
    const unmappedRows = unmapped.reduce((a, i) => a + i.raw_rows, 0);
    const accList = xs => xs.map(i => `${i.acronym} (${i.id})`).join(', ');
    $('#atlas-h').textContent = L(`${fmt(withPts.length)} investigations with test points`, `${fmt(withPts.length)} badań z punktami testowymi`);
    $('#atlas-foot').textContent = L(
      `${fmt(D.meta.investigations)} accessions publish ${fmt(D.meta.tables)} experimental tables, and ${fmt(withPts.length)} of them yield at least one test point. ` +
      `The columns of ${fmt(unmapped.length)} ACME tables — ${accList(unmapped)}, ${fmt(unmappedRows)} rows — are not mapped by this build: their rows are counted in the funnel and set aside by name, and they are listed below with a zero. ` +
      `${accList(digest)} is a cross-experiment digest, not a test table. PSI-115 and PSI-117 carry only reports, presentations and analyzed-data files, so they have no table to map.`,
      `${fmt(D.meta.investigations)} akcesji publikuje ${fmt(D.meta.tables)} tabel eksperymentalnych, a ${fmt(withPts.length)} z nich daje co najmniej jeden punkt testowy. ` +
      `Kolumn ${fmt(unmapped.length)} tabel ACME — ${accList(unmapped)}, ${fmt(unmappedRows)} wierszy — ta kompilacja nie mapuje: ich wiersze są policzone w lejku i odłożone z nazwy, a poniżej pokazane z zerem. ` +
      `${accList(digest)} to zestawienie między eksperymentami, nie tabela testów. PSI-115 i PSI-117 zawierają wyłącznie raporty, prezentacje i pliki danych analizowanych, więc nie mają tabeli do zmapowania.`);

    // Mission presets for the SI ranking.
    const mp = $('#mission-presets');
    mp.innerHTML = '';
    MISSIONS().forEach(([key, lab]) => {
      const b = el('button', { class: 'chip' + (siRank && siRank.key === key ? ' on' : ''), type: 'button' }, lab);
      b.onclick = () => { $('#mission-q').value = lab; missionSend(lab, key); };
      mp.append(b);
    });

    // The environment selector comes first, because it is what the ranking is
    // scored against — the chips below only filter the result.
    const envBox = el('div', { class: 'atlas-env' });
    envBox.append(el('span', { class: 'atlas-env-l' }, L('Rank for', 'Ranking dla')));
    [['challenge', L('the challenge envelope', 'obwiedni z challenge')],
     ['lunar', L('Artemis nominal', 'nominału Artemis')],
     ['iss', L('ISS cabin', 'kabiny ISS')],
     ['all', L('no environment', 'bez środowiska')]].forEach(([k, lab]) => {
      const b = el('button', { class: 'chip' + (k === atlasEnv ? ' on' : '') }, lab);
      b.onclick = () => {
        atlasEnv = k; ranked = rankRows();
        envBox.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
        b.classList.add('on');
        drawRows();
      };
      envBox.append(b);
    });
    ctrl.append(envBox);
    const rule = el('p', { class: 'atlas-rule', html: L(
      'Order: solid material → material-flammability emulator → droplets → gases, the challenge’s own order. '
      + 'Within a class, more test points inside the environment first, then more at or above its oxygen level, then more tests in total.',
      'Kolejność: materiał stały → emulator palności materiałów → krople → gazy, czyli kolejność z challenge. '
      + 'W obrębie klasy: najpierw więcej punktów w środowisku, potem więcej na poziomie jego tlenu lub wyżej, potem więcej testów ogółem.') });
    ctrl.append(rule);

    filters.forEach(f => {
      const b = el('button', { class: 'chip chip-f' + (f.k === atlasActive ? ' on' : '') }, f.label);
      b.onclick = () => { atlasActive = f.k; ctrl.querySelectorAll('.chip-f').forEach(c => c.classList.remove('on')); b.classList.add('on'); drawRows(); };
      ctrl.append(b);
    });

    const span = (a, b, unit, wide, narrow, thr) => {
      // narrow ranges need a decimal, otherwise "22–22%" reads as no range at all
      const f = n => fmt(n, (b - a) < thr ? narrow : wide);
      return f(a) === f(b) ? `${f(a)}${unit}` : `${f(a)}–${f(b)}${unit}`;
    };
    // Every field below is a sentence lifted verbatim from a file in that
    // accession and checked by scripts/verify_insights.py. An empty field is
    // shown as empty — the accession's PSI record has no document that says it.
    const SI_LABEL = {
      objective:  L('Objective', 'Cel'),
      fuel:       L('Fuel', 'Paliwo'),
      sample:     L('Sample', 'Próbka'),
      varied:     L('What changed between tests', 'Co zmieniano między testami'),
      sensors:    L('Sensors', 'Czujniki'),
      apparatus:  L('Apparatus', 'Aparatura'),
      conclusion: L('Fire-safety conclusion', 'Wniosek dla bezpieczeństwa pożarowego'),
    };
    const siBlock = id => {
      const s = SI[id];
      if (!s) return null;
      const wrap = el('div', { class: 'a-si-w' });
      const any = Object.keys(SI_LABEL).some(k => s[k] && s[k].q);
      // The summary is the SI layer's own sentence — what this study means to
      // whoever is designing the habitat — and it is labelled as such, because
      // it is interpretation while everything under it is quotation. It is
      // written only from the fields below, so nothing in it is unsourced.
      // Shown without a click; the quotes it rests on stay one click away.
      // One click away (with the quotes it is written from), so the list stays short.
      let sum = null;
      if (s.summary) {
        sum = el('div', { class: 'si-sum' });
        sum.append(el('span', { class: 'si-sum-k' }, L('SI summary', 'Podsumowanie SI')));
        sum.append(el('p', { class: 'si-sum-t' }, LANG === 'pl' ? s.summary.pl : s.summary.en));
      }
      const box = el('div', { class: 'a-si' });
      Object.keys(SI_LABEL).forEach(k => {
        const cell = s[k];
        const row = el('div', { class: 'si-f' });
        row.append(el('span', { class: 'si-k' }, SI_LABEL[k]));
        if (cell && cell.q) {
          row.append(el('span', { class: 'si-q', html: '“' + esc(cell.q) + '”' }));
          // Cells marked ext quote NASA's 2015 Researcher's Guide, not a PSI file,
          // and say so where the file name would be.
          row.append(el('span', { class: 'si-s' + (cell.ext ? ' si-ext' : '') }, cell.ext
            ? L(`NASA Researcher's Guide to Combustion Science (2015) · outside the PSI archive`,
                `NASA Researcher's Guide to Combustion Science (2015) · spoza archiwum PSI`)
            : cell.f));
        } else {
          row.append(el('span', { class: 'none' }, L('not stated in the PSI files', 'nie zapisano w plikach PSI')));
        }
        box.append(row);
      });
      const d = el('details', { class: 'a-si-d' },
        el('summary', {}, any
          ? (sum ? L('SI summary and source quotes · verified', 'Podsumowanie SI i cytaty źródłowe · zweryfikowane') : L('Source quotes · verified', 'Cytaty źródłowe · zweryfikowane'))
          : L('no document in this accession to extract from', 'brak dokumentu w tej akcesji do wyciągnięcia')));
      if (sum) d.append(sum);
      d.append(box);
      wrap.append(d);
      return wrap;
    };
    const drawRows = () => {
      atlas.innerHTML = '';
      // Which ranking is in force, said above the list.
      const banner = el('div', { class: 'atlas-active' + (siRank ? ' si' : '') });
      if (siRank) {
        banner.innerHTML = `<b>${L('Active ranking', 'Aktywny ranking')}:</b> ${L('SI for', 'SI dla')}: „${esc(siRank.mission)}”` +
          (siRank.saved ? ` <span class="ask-saved-inline">${L(`saved ranking, recorded ${dateFmt(siRank.saved)} — not live`, `ranking zapisany ${dateFmt(siRank.saved)}, nie na żywo`)}</span>` : '') +
          ` <span class="atlas-active-m">${esc(siRank.model || '')}</span>`;
        const back = el('button', { class: 'chip', type: 'button' }, L('Back to the rule', 'Wróć do reguły'));
        back.onclick = () => { siRank = null; siRankMsg = ''; renderAtlas(); };
        banner.append(' ', back);
      } else {
        banner.innerHTML = `<b>${L('Active ranking', 'Aktywny ranking')}:</b> ${L('rule (stated above)', 'reguła (opisana wyżej)')}`;
      }
      if (siRankMsg) banner.append(el('p', { class: 'ask-bad' }, siRankMsg));
      atlas.append(banner);
      // Column heads: what each part of a row is.
      atlas.append(el('div', { class: 'a-row a-head', 'aria-hidden': 'true' },
        el('div', {}, L('Investigation', 'Badanie')),
        el('div', {}, L('Full name · accession · fire-safety area', 'Pełna nazwa · akcesja · obszar')),
        el('div', {}, L('Material class', 'Klasa')),
        el('div', {}, L('O₂ / pressure tested', 'Zakres O₂ / ciśnienia')),
        el('div', { title: L('test points inside the environment chosen above · at or above its oxygen · all', 'punkty w środowisku wybranym wyżej · z tlenem co najmniej takim · wszystkie') }, L('Points: in env. · ≥ O₂ · all', 'Punkty: w środ. · ≥ O₂ · razem'))));
      const shown = orderedRows().filter(x => filters.find(f => f.k === atlasActive).f(x.i));
      shown.forEach((x, n) => {
        const i = x.i;
        const row = el('div', { class: 'a-row' + (x.unranked ? ' a-unranked' : ''), id: 'atlas-' + i.id });
        row.append(el('div', { class: 'a-acr', html: (x.siPos ? `${x.siPos}. ` : '') + `<a class="a-src" href="#atlas-${i.id}" data-src-kind="inv" data-src-id="${i.id}" title="${L('Open the source record', 'Otwórz rekord źródłowy')}">${esc(i.acronym)}</a>` }));
        row.append(el('div', { class: 'a-name', html: `${i.name}<small>${i.id} · ${i.pillars.map(pillarName).join(' · ') || L('reference', 'referencja')}</small>` }));
        row.append(el('div', {}, el('span', { class: 'a-pill ' + (i.phase === 'n/a' ? 'na' : i.phase) }, phaseShort(i.phase))));
        const rng = [];
        rng.push(i.o2 ? `O2 ${span(i.o2[0] * 100, i.o2[1] * 100, '%', 0, 1, 5)}` : `<span class="none">${L('no O2', 'brak O2')}</span>`);
        rng.push(i.p ? span(i.p[0], i.p[1], ' bar', 2, 2, 0.05) : `<span class="none">${L('no pressure', 'brak ciśnienia')}</span>`);
        row.append(el('div', { class: 'a-range', html: rng.join('<br>') }));
        // The ranking's own inputs, shown, so the order explains itself.
        row.append(el('div', { class: 'a-rows', html:
          `<b>${fmt(x.inEnv)}</b> ${L('in env', 'w środowisku')}<small>${fmt(x.aboveO2)} ≥ ${L('O₂', 'O₂')} · ${fmt(x.total)} ${L('tests', 'testów')}</small>` }));
        if (x.why) row.append(el('div', { class: 'a-why', html: `<span class="si-sum-k">${L('Why the SI ranks it here', 'Dlaczego SI stawia je tutaj')}</span> ${askHtml(x.why).replace(/^<p>|<\/p>$/g, '')}` }));
        if (x.unranked) row.append(el('div', { class: 'a-why none' }, L('not ranked by the SI — rule order', 'nieuszeregowane przez SI — kolejność reguły')));
        const si = siBlock(i.id);
        if (si) row.append(si);
        if (!atlasAll && n >= ATLAS_FIRST) row.hidden = true;
        atlas.append(row);
      });
      // A short list first: the page stays short; one click shows the rest.
      if (!atlasAll && shown.length > ATLAS_FIRST) {
        const more = el('button', { class: 'chip atlas-more', type: 'button' },
          L(`Show the full list (${fmt(shown.length)})`, `Pokaż całą listę (${fmt(shown.length)})`));
        more.onclick = () => { atlasAll = true; drawRows(); };
        atlas.append(more);
      }
    };
    drawRows();
  };

  // What the worker is doing right now, sent as it happens (see worker/src/index.js).
  // Consecutive data queries collapse into one line with a count.
  const STAGE = {
    start:   ['Question sent to the SI', 'Pytanie wysłane do SI'],
    think:   ['Reading the question, choosing what data to pull', 'Czytam pytanie, wybieram, jakie dane pobrać'],
    query:   ['Querying the PSI test points', 'Przeszukuję punkty pomiarowe PSI'],
    nearest: ['Finding the nearest real measurements', 'Szukam najbliższych prawdziwych pomiarów'],
    write:   ['Writing the answer from the query results', 'Piszę odpowiedź na podstawie wyników'],
    check:   ['Checking every number and quote against the corpus', 'Sprawdzam każdą liczbę i cytat w korpusie'],
    fix:     ['The check flagged something — the SI is correcting it', 'Sprawdzian coś wykrył — SI poprawia odpowiedź'],
  };
  const stageKind = st => (st === 'query' || st === 'nearest') ? 'data' : st;
  const addStage = (list, e) => {
    if (!STAGE[e.stage]) return;
    const last = list[list.length - 1];
    if (last && stageKind(last.stage) === stageKind(e.stage)) { last.stage = e.stage; last.n = (last.n || 1) + 1; }
    else list.push({ stage: e.stage, n: 1 });
  };
  const stageText = x => L(...STAGE[x.stage]) +
    (stageKind(x.stage) === 'data' && x.n > 1 ? ` · ${fmt(x.n)} ${L('queries', plFew(x.n) ? 'zapytania' : 'zapytań')}` : '');
  // POST to the worker asking for a progress stream (one JSON object per line);
  // a worker without streaming answers with plain JSON, which is read the same way.
  const askWorker = async (payload, onStage, signal) => {
    const r = await fetch(ASK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ ...payload, stream: true }), signal });
    if (!r.body || !/ndjson/.test(r.headers.get('Content-Type') || '')) return r.json().catch(() => ({ error: 'http_' + r.status }));
    const rd = r.body.getReader(), dec = new TextDecoder();
    let buf = '', fin = null;
    const line = l => { if (!l.trim()) return; let o; try { o = JSON.parse(l); } catch (e) { return; }
      if (o.done) { delete o.done; fin = o; } else onStage(o); };
    for (;;) {
      const { value, done } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n'); buf = parts.pop();
      parts.forEach(line);
    }
    line(buf);
    return fin || { error: 'empty' };
  };

  // Ask the worker to rank the Atlas for a mission. A response that fails
  // validation (the worker's or ours) leaves the rule in force and says why.
  let missionBusy = false;
  const missionSend = async (mission, key = null) => {
    mission = mission.trim();
    if (!mission || missionBusy) return;
    const lookupKey = key || (MISSIONS().find(([, lab]) => lab === mission) || [])[0] || null;
    const go = $('#mission-go');
    missionBusy = true; go.disabled = true;
    const steps = [];
    go.textContent = L(...STAGE.start);
    go.classList.add('busy');
    let res;
    const ctl = new AbortController();
    const kill = setTimeout(() => ctl.abort(), ASK_LIMIT_S * 1000);
    try {
      if (!ASK_URL) throw new Error('offline');
      res = await askWorker({ mode: 'rank', mission, lang: LANG },
        e => { addStage(steps, e); go.textContent = stageText(steps[steps.length - 1]) + '…'; }, ctl.signal);
    } catch (e) {
      res = { error: e.name === 'AbortError' ? 'timeout' : 'network' };
    }
    clearTimeout(kill);
    missionBusy = false; go.disabled = false; go.classList.remove('busy');
    go.textContent = L('Rank with SI', 'Uszereguj przez SI');
    // The worker validated it; check again here that every id is one the Atlas has.
    const valid = r => r && Array.isArray(r.ranking) && r.ranking.length
      && r.ranking.every(x => INV[x.id] && typeof x.why === 'string')
      && new Set(r.ranking.map(x => x.id)).size === r.ranking.length;
    const saved = lookupKey && CACHE.rank[`${lookupKey}:${LANG}`];
    if (!res.error && valid(res)) {
      siRank = { mission, key: lookupKey, ranking: res.ranking, model: res.model };
      siRankMsg = '';
    } else if (saved && valid(saved) && (res.error === 'timeout' || res.error === 'network' || res.error === 'upstream' || res.error === 'busy' || res.error === 'rate_limited')) {
      siRank = { mission: saved.mission, key: lookupKey, ranking: saved.ranking, model: saved.model, saved: saved.saved };
      siRankMsg = '';
    } else {
      siRank = null;
      const e = ASK_ERR[res.error];
      siRankMsg = res.error === 'invalid_ranking' || (!res.error && !valid(res))
        ? L('The SI returned a ranking that did not pass validation — showing the rule-based ranking.', 'SI zwróciła ranking, który nie przeszedł walidacji — pokazuję ranking według reguły.')
        : (e ? L(e[0], e[1]) : L('The SI service did not answer', 'Usługa SI nie odpowiedziała')) + ' ' + L('Showing the rule-based ranking.', 'Pokazuję ranking według reguły.');
    }
    renderAtlas();
  };
  $('#atlas-mission').onsubmit = e => { e.preventDefault(); missionSend($('#mission-q').value); };

  // Links into the Atlas (takeaway cards, SI answers) must land on a visible
  // row: a filter chip can hide the target, so clear it before scrolling.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#atlas-PSI"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const n = document.getElementById(id);
    if ((!n && atlasActive !== 'all') || (n && n.hidden)) {
      e.preventDefault();
      showAtlasRow(id);
      try { history.replaceState(null, '', '#' + id); } catch (er) { /* file:// */ }
    }
  });

  // Show an Atlas row even when a filter or the short list hides it, then scroll to it.
  function showAtlasRow(id) {
    let n = document.getElementById(id);
    if (!n || n.hidden) { atlasActive = 'all'; atlasAll = true; renderAtlas(); n = document.getElementById(id); }
    if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- telemetry ---------------- */
  const series = (T && T.series) ? T.series.slice().sort((a, b) => a.p - b.p || a.o2 - b.o2) : [];
  let teleCur = -1;

  const renderTele = () => {
    if (!series.length) return;
    if (teleCur < 0) {
      teleCur = series.findIndex(s => s.outcome === 'SE');
      if (teleCur < 0) teleCur = 0;
    }

    const tc = $('#tele-controls');
    const tcNote = $('#tele-count');
    if (tcNote && T.events) tcNote.textContent = L(
      `${fmt(T.events.total)} extinction events across the raw archives; ${series.length} of ${fmt(T.events.joinable || 0)} joinable streams reconstructed here.`,
      `${fmt(T.events.total)} zdarzeń wygaśnięcia w surowych archiwach; ${series.length} z ${fmt(T.events.joinable || 0)} łączących się strumieni odtworzonych tutaj.`);
    tc.innerHTML = '';
    tc.append(el('p', { class: 'tele-pick' }, L('Pick a test run — each button is one run, named by its ID in the raw PSI archive:', 'Wybierz przebieg testu — każdy przycisk to jeden przebieg, nazwany identyfikatorem z surowego archiwum PSI:')));
    const sel = el('select', { class: 'tele-sel', 'aria-label': L('Test run', 'Przebieg testu') });
    series.forEach((s, idx) => { const o = el('option', { value: idx }, s.id); if (idx === teleCur) o.selected = true; sel.append(o); });
    sel.onchange = () => { teleCur = +sel.value; tc.querySelectorAll('.chip').forEach((c, k) => c.classList.toggle('on', k === teleCur)); drawTele(); };
    tc.append(sel);
    series.forEach((s, idx) => {
      const b = el('button', { class: 'chip' + (idx === teleCur ? ' on' : '') }, `${s.id}`);
      b.onclick = () => { teleCur = idx; tc.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); b.classList.add('on'); drawTele(); };
      tc.append(b);
    });

    const TW = 1000, TH = 460, TM = { l: 66, r: 26, t: 26, b: 44 };
    const tsvg = $('#tele-svg');
    tsvg.setAttribute('viewBox', `0 0 ${TW} ${TH}`);
    const side = $('#tele-side');

    const drawTele = () => {
      const s = series[teleCur];
      tsvg.innerHTML = '';
      const pw = TW - TM.l - TM.r;
      const hIon = 230, hP = 110;
      const y0 = TM.t, y1 = y0 + hIon + 54;
      const tMax = Math.max(...s.t);
      const X = t => TM.l + (t / tMax) * pw;

      const clean = a => a.map(v => (v == null || !isFinite(v)) ? null : v);
      const ion = clean(s.ion), pr = clean(s.p1);
      const ionV = ion.filter(v => v != null);
      const iMin = Math.min(...ionV), iMax = Math.max(...ionV);
      const Yion = v => y0 + hIon - ((v - iMin) / (iMax - iMin || 1)) * hIon;

      const prV = pr.filter(v => v != null);
      const pMin = Math.min(...prV), pMax = Math.max(...prV);
      const Yp = v => y1 + hP - ((v - pMin) / (pMax - pMin || 1)) * hP;

      // panels
      [[y0, hIon, L('ION CURRENT — flame presence', 'PRĄD JONOWY — obecność płomienia')],
       // PTA1 is the channel's own name, and the corpus does not define it. Labelling
      // it "chamber pressure" asserts an identity the data does not confirm: the
      // channel mean differs from the table's pressure by more than 10% in 27 of
      // the 40 series.
      [y1, hP, L('PTA1 — raw instrument channel; the corpus does not say what it measures', 'PTA1 — surowy kanał przyrządu; korpus nie mówi, co mierzy')]].forEach(([y, h, lab]) => {
        tsvg.append(svgEl('rect', { x: TM.l, y, width: pw, height: h, fill: '#0e1014', stroke: '#1d222a' }));
        const t = svgEl('text', { x: TM.l, y: y - 9, fill: '#8b93a0', 'font-size': 12.5, 'letter-spacing': '1.2' });
        t.textContent = lab;
        tsvg.append(t);
      });

      // event markers
      const mark = (tt, color, label, dy) => {
        if (tt == null) return;
        const x = X(tt);
        [y0, y1].forEach((y, i) => {
          tsvg.append(svgEl('line', { x1: x, y1: y, x2: x, y2: y + (i ? hP : hIon), stroke: color, 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }));
        });
        const t = svgEl('text', { x: x + 6, y: y0 + dy, fill: color, 'font-size': 12.5, 'letter-spacing': '.6' });
        t.textContent = label;
        tsvg.append(t);
      };
      mark(s.ignition_s, '#34d399', L('IGNITION', 'ZAPŁON'), 14);
      mark(s.extinction_s, '#ef4444', L('EXTINCTION', 'WYGAŚNIĘCIE'), 30);

      // paths
      const path = (arr, Y, color) => {
        let d = '', pen = false;
        arr.forEach((v, i) => {
          if (v == null) { pen = false; return; }
          d += (pen ? 'L' : 'M') + X(s.t[i]).toFixed(1) + ' ' + Y(v).toFixed(1);
          pen = true;
        });
        tsvg.append(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
      };
      path(ion, Yion, '#38bdf8');
      path(pr, Yp, '#ff6a1f');

      // x axis
      [0, .25, .5, .75, 1].forEach(f => {
        const tt = tMax * f, x = X(tt);
        const t = svgEl('text', { x, y: y1 + hP + 20, fill: '#8b93a0', 'font-size': 12.5, 'text-anchor': 'middle' });
        t.textContent = tt.toFixed(0) + 's';
        tsvg.append(t);
      });

      // side panel
      const drop = (() => {
        if (s.extinction_s == null) return null;
        const pre = ion.filter((v, i) => v != null && s.t[i] >= s.extinction_s - 15 && s.t[i] <= s.extinction_s - 1);
        const post = ion.filter((v, i) => v != null && s.t[i] >= s.extinction_s + 1 && s.t[i] <= s.extinction_s + 15);
        if (!pre.length || !post.length) return null;
        return (pre.reduce((a, b) => a + b) / pre.length) - (post.reduce((a, b) => a + b) / post.length);
      })();
      side.innerHTML = '';
      const dl = el('dl');
      const add = (k, v) => { dl.append(el('dt', {}, k)); dl.append(el('dd', {}, v)); };
      add(L('test', 'test'), s.id);
      add(L('fuel', 'paliwo'), s.fuel || '—');
      add('O2', fmt(s.o2 * 100, 1) + '%');
      add(L('pressure', 'ciśnienie'), fmt(s.p, 3) + ' bar');
      add(L('ignition', 'zapłon'), s.ignition_s != null ? fmt(s.ignition_s, 1) + ' s' : '—');
      add(L('extinction', 'wygaśnięcie'), s.extinction_s != null ? fmt(s.extinction_s, 1) + ' s' : '—');
      // Two different numbers, both true: the timestamp gap in the raw stream
      // and the burn time the test table publishes. Showing one under the
      // other's name is how a demo contradicts its own atlas.
      add(L('extinction − ignition', 'wygaśnięcie − zapłon'), s.extinction_s != null && s.ignition_s != null ? fmt(s.extinction_s - s.ignition_s, 1) + ' s' : '—');
      add(L('burn time (table)', 'czas spalania (tabela)'), s.burn_s != null ? fmt(s.burn_s, 1) + ' s' : '—');
      add(L('outcome', 'wynik'), s.outcome === 'SE' ? L('self-extinguished', 'samozgaszenie')
        : s.outcome === 'FT' ? L('flow terminated', 'przerwany przepływem') : s.outcome || '—');
      add(L('peak ion', 'szczyt jonowy'), s.peak_ion != null ? fmt(s.peak_ion, 2) : '—');
      // How flat the pressure trace actually is, rather than asserting it.
      const pv = (s.p1 || []).filter(v => v != null);
      const spread = pv.length > 1
        ? (Math.max(...pv) - Math.min(...pv)) / (pv.reduce((a, b) => a + b, 0) / pv.length) * 100 : null;
      side.append(dl);
      side.append(el('div', {
        class: 'verdict',
        html: drop != null && drop > 0.3
          ? L(`Ion current fell by <strong>${fmt(drop, 2)}</strong> across the extinction marker${spread != null ? ` while the PTA1 channel stayed within <strong>${fmt(spread, 1)}%</strong> of its mean` : ''} — the flame went out and PTA1 did not change.`,
              `Prąd jonowy spadł o <strong>${fmt(drop, 2)}</strong> przy znaczniku wygaśnięcia${spread != null ? `, podczas gdy kanał PTA1 pozostał w granicach <strong>${fmt(spread, 1)}%</strong> od średniej` : ''} — płomień zgasł, a PTA1 się nie zmienił.`)
          : L('No clean ion collapse across the marker: the series was terminated by flow, not by extinction.',
              'Brak wyraźnego spadku prądu jonowego przy znaczniku: seria została przerwana przepływem, a nie wygaśnięciem.')
      }));
    };
    drawTele();
  };

  /* ---------------- solver ---------------- */
  function paretoOrder(points, o2, p, limit = Infinity) {
    const d = points.map(t => ({ t, a: Math.abs(t.o2 - o2), b: Math.abs(Math.log(t.p / p)) }));
    const out = [];
    let rest = d;
    while (rest.length && out.length < limit) {
      const front = rest.filter(x => !rest.some(y => y !== x && y.a <= x.a && y.b <= x.b && (y.a < x.a || y.b < x.b)));
      front.sort((x, y) => x.a - y.a || x.b - y.b);
      out.push(...front.map(x => x.t));
      const used = new Set(front);
      rest = rest.filter(x => !used.has(x));
    }
    return out;
  }
  // Every preset is a published or stated atmosphere, not a guessed one. The
  // first is the challenge's own sentence — the Moon Base and pressurized
  // rovers at "30% or greater, with a corresponding pressure of 10.2 psi or
  // less" — because that is the question the submission is asked
  // to answer. The next two are the Artemis Surface Habitat reference design
  // (NTRS 20220000245) and the ISS cabin it also names. No Mars preset: the
  // challenge gives no numbers for it, and inventing a pressure would make the
  // whole ladder of presets a guess wearing a label.
  const DEST = {
    challenge: [CH_P, CH_O2], moon: [LUNAR_P, LUNAR_O2], moon82: [ALT_P, ALT_O2],
    iss: [1.013, 0.209], suit: [SUIT_P, 1.0],
  };
  const svP = $('#sv-p'), svO = $('#sv-o2'), svM = $('#sv-mat'), svD = $('#sv-dest');
  const out = $('#solver-out');

  // The experiment that would close the gap. Every parameter comes from the
  // corpus — the highest level actually tested, the nearest real measurement —
  // so the plan measures what is missing rather than proposing a test design.
  const buildPlan = (c) => {
    const mat = phaseName(c.phase);
    const atmo = `${fmt(c.p, 3)} bar · ${fmt(c.o2 * 100, 1)}% O₂`;

    if (!c.pool.length) {
      return {
        title: L('No baseline exists in this class', 'W tej klasie nie ma punktu odniesienia'),
        rows: [
          [L('material', 'materiał'), mat],
          [L('atmosphere', 'atmosfera'), atmo],
          [L('what exists', 'co istnieje'), L(
            `${fmt(c.phaseRows.length)} test points, none recording both an oxygen level and a pressure`,
            `${fmt(c.phaseRows.length)} punktów testowych, żaden nie zapisuje jednocześnie poziomu tlenu i ciśnienia`)],
          [L('what is missing', 'czego brakuje'), L(
            'The first measurement. Any answer here would be an invention, not an extrapolation.',
            'Pierwszy pomiar. Każda odpowiedź tutaj byłaby wymysłem, nie ekstrapolacją.')],
        ],
      };
    }

    const n = c.nearest, gapPct = Math.abs(n.p - c.p) / c.p * 100, gapO2 = Math.abs(n.o2 - c.o2) * 100;
    const near = `${esc(n.a)} · ${esc(n.i)} — ${fmt(n.o2 * 100, 1)}% O₂, ${fmt(n.p, 3)} bar`;
    // The tolerance has one definition, shared with the verdict. Printing a
    // different number here than the verdict uses is how the plan and the
    // verdict end up disagreeing on the same screen.
    const tolO2pp = fmt(TOL_O2 / 100, 1);
    if (c.state === 'covered') {
      return {
        title: L('No new experiment needed', 'Nowy eksperyment nie jest potrzebny'),
        rows: [
          [L('material', 'materiał'), mat],
          [L('atmosphere', 'atmosfera'), atmo],
          [L('what exists', 'co istnieje'), L(
            `${fmt(c.tight)} points within ±15% pressure and ±${tolO2pp} pp oxygen`,
            `${fmt(c.tight)} punktów w granicach ±15% ciśnienia i ±${tolO2pp} pp tlenu`)],
          [L('nearest', 'najbliższy'), near],
        ],
        caveat: L('Covered means measured nearby, not certified. Qualifying a specific material still needs that material. The solver does not distinguish diluents — nitrogen, CO2 and helium are all just "not oxygen" to it.',
          'Pokryte znaczy zmierzone w pobliżu, nie certyfikowane. Kwalifikacja konkretnego materiału nadal wymaga tego materiału. Solver nie rozróżnia rozcieńczalnika — azot, CO2 i hel są dla niego wszystkie tylko „nie tlenem”.'),
      };
    }
    return {
      title: L('The experiment that would answer this', 'Eksperyment, który by na to odpowiedział'),
      rows: [
        [L('material', 'materiał'), mat],
        [L('atmosphere', 'atmosfera'), atmo],
        [L('nearest existing', 'najbliższy istniejący'), near],
        [L('what is missing', 'czego brakuje'), L(
          `A test at ${fmt(c.p, 3)} bar and ${fmt(c.o2 * 100, 1)}% O₂ — ${fmt(gapPct, 0)}% away in pressure and ${fmt(gapO2, 1)} pp away in oxygen from anything measured.`,
          `Test przy ${fmt(c.p, 3)} bar i ${fmt(c.o2 * 100, 1)}% O₂ — ${fmt(gapPct, 0)}% odległości w ciśnieniu i ${fmt(gapO2, 1)} pp w tlenie od wszystkiego, co zmierzono.`)],
      ],
      caveat: L('Extrapolating across that distance is how a safety case ends up built on nothing.',
        'Ekstrapolacja na taką odległość to sposób, w jaki uzasadnienie bezpieczeństwa kończy się zbudowane na niczym.'),
    };
  };

  const metricHtml = (ms) => ms.map(([k, v, color]) =>
    `<div class="s-metric"><div class="v"${color ? ` style="color:${color}"` : ''}>${v}</div><div class="k">${k}</div></div>`).join('');

  // The one-page report a judge or an engineer can take away. It is hidden on
  // screen and only revealed by the print stylesheet, so the button is a plain
  // window.print() — no PDF library, no build step, no dependency.
  const renderReport = (c) => {
    const R = $('#report');
    if (!R) return;
    const plan = buildPlan(c);
    const kv = rows => `<table class="r-kv">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
    const dest = svD.selectedIndex >= 0 ? svD.options[svD.selectedIndex].textContent : '';
    // Accession order, not row order: a printed sheet that lists PSI-100 before
    // PSI-25 reads as a data dump rather than as a document.
    const invs = [...new Map(c.phaseRows.map(r => [r.i, `${esc(r.a)} (${esc(r.i)})`])).values()]
      .sort((x, y) => parseInt(x.split('PSI-')[1], 10) - parseInt(y.split('PSI-')[1], 10));
    R.innerHTML =
      `<div class="r-head"><span class="r-brand">IGNIS</span><span class="r-meta">NASA Space Apps Challenge 2026 · Rzeszów</span></div>
       <h1>${L('Evidence gap report', 'Raport luki dowodowej')}</h1>
       <p class="r-sub">${L(
         'Computed by the build scripts from the NASA PSI corpus. Every figure here is computed, not typed.',
         'Obliczone przez skrypty budujące z korpusu NASA PSI. Każda liczba jest obliczona, nie wpisana.')}</p>
       <h2>${L('Atmosphere queried', 'Zapytana atmosfera')}</h2>
       ${kv([
         [L('Destination', 'Cel'), esc(dest)],
         [L('Chamber pressure', 'Ciśnienie w komorze'), fmt(c.p, 3) + ' bar'],
         [L('Oxygen', 'Tlen'), fmt(c.o2 * 100, 1) + '%'],
         [L('Material class', 'Klasa materiału'), phaseName(c.phase)],
       ])}
       <h2>${L('Verdict', 'Werdykt')}</h2>
       <p class="r-verdict"><strong>${c.title}</strong> — ${c.summary}</p>
       <h2>${L('Evidence', 'Dowody')}</h2>
       ${kv([
         ...c.metrics.map(([k, v]) => [k, v]),
         // Printed answers need a paper trail; "every row is a click away" is
         // not true on a sheet of paper, so the accessions are named here.
         [L('investigations', 'badania'), invs.join(', ')],
       ])}
       <h2>${plan.title}</h2>
       ${kv(plan.rows)}
       ${plan.caveat ? `<p class="r-caveat">${plan.caveat}</p>` : ''}
       <div class="r-foot">
         <span>${L('Source: NASA Physical Science Informatics, CC0-1.0.', 'Źródło: NASA Physical Science Informatics, CC0-1.0.')}</span>
         <span>${fmt(D.meta.testpoints)} ${L('test points from', 'punktów testowych z')} ${fmt(D.meta.tables)} ${L('tables', 'tabel')} · ${fmt(D.meta.files)} ${L('files', 'plików')} · ${fmt(D.meta.gigabytes, 1)} GB</span>
       </div>`;
  };

  const finish = (c) => {
    const plan = buildPlan(c);
    out.append(el('div', { class: 's-plan', html:
      `<h4>${plan.title}</h4>
       <dl>${plan.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
       ${plan.caveat ? `<p class="caveat">${plan.caveat}</p>` : ''}` }));
    renderReport(c);
  };

  const solve = () => {
    // Text inputs, not number inputs: the OS locale renders a number input as
    // "0,703" on a Polish machine while every label around it reads "0.703 bar".
    const n = v => parseFloat(String(v).replace(',', '.'));
    const p = n(svP.value), o2 = n(svO.value) / 100, phase = svM.value;
    if (!isFinite(p) || !isFinite(o2) || p <= 0) return;
    const phaseRows = ROWS.filter(r => r.ph === phase);
    const phaseO2 = phaseRows.filter(r => r.o2 != null);
    const pool = phaseRows.filter(r => r.p != null && r.o2 != null);
    const ctx = { p, o2, phase, phaseRows, phaseO2, pool };
    out.innerHTML = '';

    if (!pool.length) {
      ctx.state = 'blind';
      // A class can be blind on one axis and not the other. BRE is the case that
      // matters: 43 test points, 41 with an oxygen level, none with a pressure,
      // so the two-axis question is unanswerable — but "at or above 30% oxygen"
      // is a real count the Atlas shows, and refusing to give it while the Atlas
      // gives it is the app contradicting itself. Say what the one axis supports.
      const o2Only = phaseO2.filter(r => r.o2 >= o2);
      if (phaseO2.length) {
        ctx.title = L('No pressure in this class — oxygen only', 'Brak ciśnienia w tej klasie — tylko tlen');
        ctx.summary = L(
          `PSI carries ${fmt(phaseRows.length)} ${phaseFor(phase)} test points, and ${fmt(phaseO2.length)} of them record an oxygen level; none records a pressure, so the two-axis question cannot be answered — not approximately, not by interpolation.
           On the one axis that exists: ${fmt(o2Only.length)} of those points are at or above ${fmt(o2 * 100, 1)}% O₂${o2Only.length ? `, between ${fmt(Math.min(...o2Only.map(r => r.o2)) * 100, 1)} and ${fmt(Math.max(...o2Only.map(r => r.o2)) * 100, 1)}%` : ''}.
           That is uniaxial evidence — oxygen held, pressure unrecorded — not a measurement at ${fmt(p, 3)} bar.`,
          `PSI zawiera ${fmt(phaseRows.length)} ${plPhasePts(phaseRows.length, phase)}, z czego ${fmt(phaseO2.length)} zapisuje poziom tlenu; żaden nie zapisuje ciśnienia, więc pytania dwuosiowego nie da się rozstrzygnąć — ani w przybliżeniu, ani przez interpolację.
           Na jednej osi, która istnieje: ${fmt(o2Only.length)} z tych punktów ${plPts(o2Only.length, 'leży', 'leżą', 'leży')} przy ${fmt(o2 * 100, 1)}% O₂ lub wyżej${o2Only.length ? `, między ${fmt(Math.min(...o2Only.map(r => r.o2)) * 100, 1)} a ${fmt(Math.max(...o2Only.map(r => r.o2)) * 100, 1)}%` : ''}.
           To dowód jednoosiowy — tlen zadany, ciśnienie niezapisane — a nie pomiar przy ${fmt(p, 3)} bar.`);
        ctx.metrics = [
          [L('points in this class', 'punktów w tej klasie'), fmt(phaseRows.length)],
          [L('with an oxygen level', 'z poziomem tlenu'), fmt(phaseO2.length)],
          [L(`at or above ${fmt(o2 * 100, 1)}% O₂`, `przy ${fmt(o2 * 100, 1)}% O₂ lub wyżej`), fmt(o2Only.length), '#f59e0b'],
          [L('with a pressure', 'z ciśnieniem'), '0', '#ef4444'],
        ];
        out.append(el('div', { class: 's-verdict blind', html: `<h3>${ctx.title}</h3><p>${ctx.summary}</p>` }));
        out.append(el('div', { class: 's-metrics', html: metricHtml(ctx.metrics) }));
        // The evidence table is the point: the rows the count comes from, so the
        // number can be checked against the table rather than trusted. BRE holds
        // only five distinct oxygen levels across its 22 qualifying points, so the
        // table is one row per level — and says so, because a two-row table under
        // a claim of 22 points otherwise reads as a miscount.
        const seen = new Set();
        const rows = o2Only.slice().sort((a, b) => a.o2 - b.o2).filter(r => {
          const k = `${r.a}|${r.o2}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        if (rows.length) {
          const perLvl = rows.length < o2Only.length
            ? L(` — one row per oxygen level; all ${fmt(o2Only.length)} points are in the CSV download`,
                ` — jeden wiersz na poziom tlenu; ${o2Only.length === 1 ? '1 punkt jest' : 'wszystkie ' + fmt(o2Only.length) + ' punkty są'} w pobieranym CSV`)
            : '';
          out.append(el('div', { class: 's-evidence', html:
            `<table><thead><tr><th>${L('uniaxial evidence', 'dowód jednoosiowy')}${perLvl}</th><th>O₂</th><th>${L('pressure', 'ciśnienie')}</th></tr></thead><tbody>${
              rows.map(r => `<tr><td class="n">${esc(r.a)} · ${esc(r.i)} #${r.r}</td><td>${fmt(r.o2 * 100, 1)}%</td><td class="src">${L('not recorded', 'nie zapisano')}</td></tr>`).join('')
            }</tbody></table>` }));
        }
        finish(ctx);
        return;
      }
      // No oxygen either: aerosol and dust are measured by particle counters, not
      // by an ignition experiment, so there is nothing to answer an oxygen
      // question with — but naming the tables is still the useful answer.
      const acc = [...new Set(phaseRows.map(r => r.i))];
      const tbls = D.investigations.filter(i => acc.includes(i.id)).map(i => `${i.acronym} (${i.id})`);
      const inTxt = tbls.length > 1 ? ` in ${tbls.slice(0, -1).join(', ')} and ${tbls[tbls.length - 1]}` : tbls.length ? ` in ${tbls[0]}` : '';
      const inTxtPl = tbls.length > 1 ? ` w tabelach ${tbls.slice(0, -1).join(', ')} i ${tbls[tbls.length - 1]}` : tbls.length ? ` w tabeli ${tbls[0]}` : '';
      ctx.title = L('No measurements in this class', 'Brak pomiarów w tej klasie');
      ctx.summary = L(
        `PSI carries ${fmt(phaseRows.length)} ${phaseFor(phase)} test points${inTxt}, and none records an oxygen level or a pressure.
         These tables measure the particle — number concentration, size, mass — not whether a material ignites, so an atmosphere query has nothing to match against.
         The question cannot be answered from this corpus — not approximately, not by interpolation.`,
        `PSI zawiera ${fmt(phaseRows.length)} ${plPhasePts(phaseRows.length, phase)}${inTxtPl}, i żaden nie zapisuje poziomu tlenu ani ciśnienia.
         Te tabele mierzą cząstkę — koncentrację liczbową, rozmiar, masę — a nie to, czy materiał się zapala, więc pytanie o atmosferę nie ma tu do czego się odnieść.
         Na to pytanie nie da się odpowiedzieć z tego korpusu — ani w przybliżeniu, ani przez interpolację.`);
      ctx.metrics = [
        [L('points in this class', 'punktów w tej klasie'), fmt(phaseRows.length)],
        [L('with an oxygen level', 'z poziomem tlenu'), '0', '#ef4444'],
        [L('with a pressure', 'z ciśnieniem'), '0', '#ef4444'],
      ];
      out.append(el('div', { class: 's-verdict blind', html: `<h3>${ctx.title}</h3><p>${ctx.summary}</p>` }));
      finish(ctx);
      return;
    }

    // Distance from evidence, with no weight joining the two axes: points are
    // ordered in Pareto layers (layer 1 = no other point is closer on both
    // oxygen and pressure at once), and within a layer by the oxygen distance,
    // the axis of the gap. The SI uses the same rule (worker/src/tools.js,
    // paretoOrder). This replaced a hypot() with oxygen weighted ×3, a factor
    // no source justified.
    const ranked = paretoOrder(pool, o2, p, 60);
    // Eight rows that all read "BASS · 22.1% · 0.983 bar" say nothing. BASS ran
    // dozens of tests at the same condition; collapse them and keep the nearest.
    const seenCond = new Set();
    const near = ranked.filter(r => {
      const k = `${r.a}|${r.o2}|${r.p}`;
      if (seenCond.has(k)) return false;
      seenCond.add(k);
      return true;
    }).slice(0, 8);
    // The oxygen tolerance has to be smaller than the gap being reported, or the
    // solver calls 25% O2 "covered" while the hero says nothing above 22.7% exists.
    // 1.5 pp is under half of the 3.8 pp design gap. Defined at module scope.
    const tight = pool.filter(r => Math.abs(Math.log(r.p / p)) <= TOL_P
                                   && Math.abs(Math.round(r.o2 * 1e4) - Math.round(o2 * 1e4)) <= TOL_O2).length;
    // Bracketed means the point sits inside a real two-sided box: something at or
    // above this oxygen and at or below this pressure, and something at or below
    // this oxygen and at or above this pressure. One quadrant is not a bracket —
    // it let a 5% oxygen query pass because 121 tests sit above 5%.
    const above = pool.some(r => r.o2 >= o2 && r.p <= p * 1.15);
    const below = pool.some(r => r.o2 <= o2 && r.p >= p / 1.15);
    const bracketed = above && below;
    const nearest = ranked[0];
    // At least one in-tolerance point has to sit at or above the queried
    // oxygen. Without it, six FLEX droplets at 25.0% — all below the 26.5%
    // query, all CO2-diluted — "cover" the lunar habitat. Bracketing downward
    // is interpolation; calling it coverage claims evidence from a lower
    // oxygen level for a higher one. Compared in ten-thousandths, like `tight`.
    const atOrAbove = pool.some(r => Math.round(r.o2 * 1e4) >= Math.round(o2 * 1e4)
      && Math.abs(Math.log(r.p / p)) <= TOL_P
      && Math.abs(Math.round(r.o2 * 1e4) - Math.round(o2 * 1e4)) <= TOL_O2);
    // "Covered" needs all three: enough points in tolerance, a real bracket, and
    // a point at or above the queried oxygen. Five tests just under the ceiling
    // is not coverage of a point above it — at 1.013 bar / 24% O2 every solid
    // test is at or below 22.7%, and calling that "no new experiment needed" is
    // the one verdict that would contradict the headline the whole project
    // rests on.
    const state = tight >= 5 && bracketed && atOrAbove ? 'covered' : (tight >= 1 || bracketed) ? 'partial' : 'blind';
    ctx.state = state; ctx.nearest = nearest; ctx.tight = tight;

    // A partial verdict with no bracket is not "bracketed" — at 1.013 bar / 24%
    // O2 there are 11 points in tolerance and nothing at or above that oxygen,
    // so the title has to follow `bracketed`, not the state alone.
    ctx.title = state === 'covered' ? L('Covered by direct evidence', 'Pokryte bezpośrednimi dowodami')
      : state === 'partial' ? (bracketed
          ? L('Bracketed, not measured', 'Ujęte w widełki, nie zmierzone')
          : L('Nothing at this oxygen level', 'Nic przy tym poziomie tlenu'))
      : L('Outside the measured envelope', 'Poza zmierzoną obwiednią');
    // Both axes, always: a verdict that reports only the pressure gap will call a
    // 5% oxygen atmosphere "close" because FLEX ran at 0.7 bar, which is the
    // opposite of what the corpus supports.
    const dpPct = Math.abs(nearest.p - p) / p * 100;
    const dpO2 = Math.abs(nearest.o2 - o2) * 100;
    // The nearest point and the class ceiling are different numbers (22.1 vs
    // 22.7 for solids). Say both, or the solver looks like it disagrees with
    // the headline gap it was built to report.
    const ceilO2 = Math.max(...phaseO2.map(r => r.o2));
    const ceilTxt = L(` The highest point in this class is ${fmt(ceilO2 * 100, 1)}%.`,
                      ` Najwyższy punkt w tej klasie to ${fmt(ceilO2 * 100, 1)}%.`);
    const minO2 = Math.min(...phaseO2.map(r => r.o2));
    const minTxt = L(` The lowest point in this class is ${fmt(minO2 * 100, 1)}%.`,
                     ` Najniższy punkt w tej klasie to ${fmt(minO2 * 100, 1)}%.`);
    const nearTxt = `<strong>${esc(nearest.a)}</strong> (${esc(nearest.i)}) at ${fmt(nearest.o2 * 100, 1)}% O₂ and ${fmt(nearest.p, 3)} bar`;
    const nearTxtPl = `<strong>${esc(nearest.a)}</strong> (${esc(nearest.i)}) przy ${fmt(nearest.o2 * 100, 1)}% O₂ i ${fmt(nearest.p, 3)} bar`;
    // One tolerance, one place. These sentences used to spell the oxygen
    // tolerance by hand while the plan spelled a different number.
    const tolPp = fmt(TOL_O2 / 100, 1);
    const tolPpPl = fmt(TOL_O2 / 100, 1);
    ctx.summary = state === 'covered'
      ? L(`${tight} test points sit within ±15% pressure and ±${tolPp} pp oxygen of this atmosphere.`,
          `${tight} ${plPts(tight, 'punkt testowy leży', 'punkty testowe leżą', 'punktów testowych leży')} w granicach ±15% ciśnienia i ±${tolPpPl} pp tlenu od tej atmosfery.`)
      : state === 'partial'
        ? L(tight >= 1
          ? `${tight} test ${tight === 1 ? 'sits' : 'points sit'} within ±15% pressure and ±${tolPp} pp oxygen${bracketed ? ' — enough to bracket this atmosphere, not to cover it' : ', but nothing at or above this oxygen level shares that pressure range, so the point is not bracketed either'}. The nearest is ${nearTxt} — ${fmt(dpPct, 0)}% away in pressure and ${fmt(dpO2, 1)} pp away in oxygen.`
          : `Tests exist on both sides of this atmosphere, but none within ±15% pressure and ±${tolPp} pp oxygen. The nearest is ${nearTxt} — ${fmt(dpPct, 0)}% away in pressure and ${fmt(dpO2, 1)} pp away in oxygen. Any answer here is an interpolation.`,
          tight >= 1
          ? `${tight} ${plPts(tight)} w granicach ±15% ciśnienia i ±${tolPpPl} pp tlenu${bracketed ? ' — tyle, by ująć tę atmosferę w widełki, nie by ją pokryć' : ', ale nic przy tym poziomie tlenu lub wyżej nie dzieli z nim tego zakresu ciśnienia, więc punkt nie jest też ujęty w widełki'}. Najbliższy to ${nearTxtPl} — ${fmt(dpPct, 0)}% odległości w ciśnieniu i ${fmt(dpO2, 1)} pp w tlenie.`
          : `Testy istnieją po obu stronach tej atmosfery, ale żaden w granicach ±15% ciśnienia i ±${tolPpPl} pp tlenu. Najbliższy to ${nearTxtPl} — ${fmt(dpPct, 0)}% odległości w ciśnieniu i ${fmt(dpO2, 1)} pp w tlenie. Każda odpowiedź tutaj jest interpolacją.`)
        // Which side of the envelope is empty decides the sentence. Saying "no
        // test at or above this oxygen" when the corpus does go higher (a 5%
        // query) is the same class of false claim as calling 24% covered.
        : !above
        ? L(`No test sits at or above this oxygen level at or below this pressure.${ceilTxt} The nearest, ${nearTxt}, is ${fmt(dpPct, 0)}% away in pressure and ${fmt(dpO2, 1)} pp away in oxygen.`,
            `Żaden test nie leży przy tym poziomie tlenu lub wyżej i przy tym ciśnieniu lub niżej.${ceilTxt} Najbliższy, ${nearTxtPl}, jest ${fmt(dpPct, 0)}% odległości w ciśnieniu i ${fmt(dpO2, 1)} pp w tlenie.`)
        : L(`No test sits at or below this oxygen level at or above this pressure.${minTxt} The nearest, ${nearTxt}, is ${fmt(dpPct, 0)}% away in pressure and ${fmt(dpO2, 1)} pp away in oxygen.`,
            `Żaden test nie leży przy tym poziomie tlenu lub niżej i przy tym ciśnieniu lub wyżej.${minTxt} Najbliższy, ${nearTxtPl}, jest ${fmt(dpPct, 0)}% odległości w ciśnieniu i ${fmt(dpO2, 1)} pp w tlenie.`);
    ctx.metrics = [
      [L('points within tolerance', plPts(tight, 'punkt w tolerancji', 'punkty w tolerancji', 'punktów w tolerancji')), tight, state === 'covered' ? '#34d399' : state === 'partial' ? '#f59e0b' : '#ef4444'],
      [L(`${phase} points usable`, plPts(pool.length, `punkt użyteczny ${phaseFor(phase)}`, `punkty użyteczne ${phaseFor(phase)}`, `punktów użytecznych ${phaseFor(phase)}`)), pool.length],
      [L('distance from evidence · O₂', 'odległość od dowodu · O₂'), fmt(dpO2, 1) + ' pp'],
      [L('distance from evidence · pressure', 'odległość od dowodu · ciśnienie'), fmt(dpPct, 0) + '%'],
    ];

    out.append(el('div', { class: 's-verdict ' + state, html: `<h3>${ctx.title}</h3><p>${ctx.summary}</p>` }));
    out.append(el('div', { class: 's-metrics', html: metricHtml(ctx.metrics) }));

    const tbl = el('div', { class: 's-evidence' });
    // What happened, where the corpus recorded it. The old Δ column printed a
    // weighted distance no judge can interpret; the outcome is the fact.
    const showOut = near.some(r => r.o);
    tbl.append(el('table', { html:
      `<thead><tr><th>${L('nearest evidence', 'najbliższy dowód')}</th><th>O₂</th><th>${L('pressure', 'ciśnienie')}</th>${showOut ? `<th>${L('outcome', 'wynik')}</th>` : ''}</tr></thead>
       <tbody>${near.map((r, k) => `<tr${k >= 3 ? ' class="ev-x" hidden' : ''}><td class="n">${esc(r.a)} · ${esc(r.i)} #${r.r}</td><td>${fmt(r.o2 * 100, 1)}%</td><td>${fmt(r.p, 3)} bar${r.pd ? L('<br><span class="src">from the report, not a per-test reading</span>', '<br><span class="src">z raportu, nie z pomiaru per test</span>') : ''}</td>${showOut ? `<td>${esc(r.o || '—')}</td>` : ''}</tr>`).join('')}</tbody>` }));
    if (near.length > 3) {
      const b = el('button', { type: 'button', class: 'chip ev-more' }, L(`Show ${near.length - 3} more`, `Pokaż ${near.length - 3} więcej`));
      b.onclick = () => { tbl.querySelectorAll('tr.ev-x').forEach(t => { t.hidden = false; }); b.remove(); };
      tbl.append(b);
    }
    out.append(tbl);
    finish(ctx);
  };

  const reportBtn = $('#report-btn');
  if (reportBtn) reportBtn.onclick = () => window.print();

  svD.onchange = () => {
    // Mars habitat and transit cabin: neither the challenge (which gives one
    // atmosphere for the Moon Base and pressurized rovers) nor Kessler et al.
    // states one, so the option says so and hands over to Custom.
    const unstated = svD.value === 'unstated';
    $('#sv-unstated').hidden = !unstated;
    if (unstated) { svD.value = 'custom'; svP.focus(); }
    const d = DEST[svD.value];
    // One decimal, trailing .0 dropped: rounding 26.5 to "27" silently changes
    // the atmosphere the user asked about and moves the oxygen gap with it.
    if (d) { svP.value = fmt(d[0], 3); svO.value = fmt(d[1] * 100, 1).replace(/[,.]0$/, ''); }
    solve();
  };
  // Typing a value makes the destination label a lie, so it drops back to Custom.
  const manual = () => { svD.value = 'custom'; solve(); };
  // Only the two atmosphere fields make the destination label a lie; changing
  // the material class does not, and resetting it printed "Custom…" on the
  // report for a habitat query.
  [svP, svO].forEach(n => n.oninput = manual);
  svM.onchange = solve;
  // The first screen's one-click answer: the challenge atmosphere, solid material.
  const cta = $('#cta-check');
  if (cta) cta.onclick = e => {
    e.preventDefault();
    svD.value = 'challenge'; svM.value = 'solid'; svD.onchange();
    document.getElementById('solver').scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#solver'); } catch (er) { /* file:// */ }
  };
  const ctaAsk = $('#cta-ask');
  if (ctaAsk) ctaAsk.onclick = e => { e.preventDefault(); goTab('si'); };

  /* ---------------- pillars ---------------- */
  // At most three sentences on screen; the rest under "show details". A
  // sentence ends at . ! or ? followed by a space and a capital, a digit or an
  // opening quote or tag — "22.7%" has no space after its point, so it stays whole.
  const clamp3 = html => {
    const parts = html.replace(/\s+/g, ' ').trim().split(/(?<=[.!?”"])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9„“"<])/);
    return parts.length <= 3 ? [parts.join(' '), ''] : [parts.slice(0, 3).join(' '), parts.slice(3).join(' ')];
  };
  // One card per pillar, one number each, all from build_dataset.py. The point
  // is not that PSI answers the challenge — it is that each pillar gets a
  // different kind of answer, and the card says which.
  const renderPillars = () => {
    const P = D.pillars, host = $('#pillar-cards');
    if (!host || !P) return;
    const sup = P.suppression;
    const sn = sup.solid_notes;
    const det = P.detection;
    const detTotal = Object.values(det).reduce((a, d) => a + d.rows, 0);
    const cards = [
      {
        tag: L('Prevention', 'Zapobieganie'),
        n: `${fmt(P.prevention.solid_ceiling * 100, 1)}%`,
        k: L(`highest oxygen any solid-material test reached (${fmt(P.prevention.solid_points)} points)`,
             `najwyższy tlen osiągnięty w teście materiału stałego (${fmt(P.prevention.solid_points)} punktów)`),
        p: L(`The only materials-flammability study above cabin air is the BRE emulator — a gas burner that emulates a burning surface: <b>${fmt(P.prevention.bre_flames)} flames</b> over <b>${fmt(P.prevention.bre_days)} test days</b>, ${fmt(P.prevention.bre_o2[0] * 100, 0)}–${fmt(P.prevention.bre_o2[1] * 100, 0)}% O₂, 25 and 50 mm burners, ethylene and methane. It records no pressure — the table says the chamber pressures "were also varied but are not identified in this summary table".`,
             `Jedynym badaniem palności materiałów powyżej powietrza kabinowego jest emulator BRE — palnik gazowy emulujący palącą się powierzchnię: <b>${fmt(P.prevention.bre_flames)} płomieni</b> w <b>${fmt(P.prevention.bre_days)} dniach testowych</b>, ${fmt(P.prevention.bre_o2[0] * 100, 0)}–${fmt(P.prevention.bre_o2[1] * 100, 0)}% O₂, palniki 25 i 50 mm, etylen i metan. Nie zapisuje ciśnienia — tabela mówi, że ciśnienia w komorze „także zmieniano, ale nie są zidentyfikowane w tej tabeli zbiorczej”.`),
      },
      {
        tag: L('Suppression', 'Gaszenie'),
        n: `${sup.N2.low.ext}/${sup.N2.low.tests}`,
        k: L(`FLEX droplets that self-extinguished in nitrogen at 18% O₂ or less`,
             `kropel FLEX, które samozgasły w azocie przy 18% O₂ lub mniej`),
        p: L(`At one atmosphere, three diluents, same oxygen level: at 18% O₂ or less <b>${sup.N2.low.ext}/${sup.N2.low.tests}</b> extinguished in nitrogen, <b>${sup.CO2.low.ext}/${sup.CO2.low.tests}</b> with CO₂, <b>${sup.He.low.ext}/${sup.He.low.tests}</b> with helium — the choice of inert gas does not visibly change the outcome. At 21% O₂ there are only <b>${sup.at_21_total}</b> tests at one atmosphere across all three diluents (${sup.N2.air.ext}/${sup.N2.air.tests}, ${sup.CO2.air.ext}/${sup.CO2.air.tests}, ${sup.He.air.ext}/${sup.He.air.tests}), too few to compare. Small samples, mixed fuels, droplet diameters — a direction, not a rate.`,
             `Przy jednym atmosferycznym ciśnieniu, trzech rozcieńczalnikach i tym samym poziomie tlenu: przy 18% O₂ lub mniej zgasło <b>${sup.N2.low.ext}/${sup.N2.low.tests}</b> w azocie, <b>${sup.CO2.low.ext}/${sup.CO2.low.tests}</b> w CO₂ i <b>${sup.He.low.ext}/${sup.He.low.tests}</b> w helu — wybór gazu obojętnego nie zmienia wyniku w widoczny sposób. Przy 21% O₂ jest tylko <b>${sup.at_21_total}</b> testów przy jednym ciśnieniu we wszystkich trzech rozcieńczalnikach (${sup.N2.air.ext}/${sup.N2.air.tests}, ${sup.CO2.air.ext}/${sup.CO2.air.tests}, ${sup.He.air.ext}/${sup.He.air.tests}) — za mało, żeby porównywać. Małe próbki, mieszane paliwa, średnice kropel — kierunek, nie tempo.`),
        note: sn ? L(`Solid materials: of the <b>${fmt(sn.rows_with_note)}</b> BASS tests with an operator note, <b>${fmt(sn.nitrogen_mentioned)}</b> mention nitrogen and <b>${fmt(sn.nitrogen_attempts)}</b> record an attempt to put the flame out with it — the result is finding (a) at the top of the page. Each note was read one by one, the build checks the words each reading rests on, and all ${fmt(sn.nitrogen_mentioned)} are listed below.`,
                    `Materiały stałe: spośród <b>${fmt(sn.rows_with_note)}</b> testów BASS z notatką operatora <b>${fmt(sn.nitrogen_mentioned)}</b> wspomina azot, a <b>${fmt(sn.nitrogen_attempts)}</b> zapisuje próbę zgaszenia nim płomienia — wynik to wniosek (a) na górze strony. Każdą notatkę przeczytano osobno, kompilacja sprawdza słowa, na których opiera się każdy odczyt, a wszystkie ${fmt(sn.nitrogen_mentioned)} są wypisane niżej.`) : '',
        quotes: sn ? sn.evidence
          .map(e => `r${e.r} · ${fmt(e.o2 * 100, 1)}% O₂ · ${({ worked: L('went out', 'zgasł'), failed: L('stayed lit', 'utrzymał się'), vitiation: L('oxygen lowering', 'obniżanie tlenu'), other: L('not an attempt', 'nie próba') })[e.read]} — ${e.note}`) : [],
      },
      {
        tag: L('Detection', 'Wykrywanie'),
        n: fmt(detTotal),
        k: L(`smoke and dust test points across ${Object.values(det).map(d => d.acronym).join(', ')}`,
             `punktów testowych dymu i pyłu w ${Object.values(det).map(d => d.acronym).join(', ')}`),
        p: L(`These tables record how smoke was made and aged, not a flame: ${Object.values(det).map(d => `${d.acronym} (${fmt(d.rows)}) lists ${d.measured.map(esc).join(', ')}`).join('; ')}. What the SAME final report concludes about particle size and detection time is finding (c) at the top of the page.`,
             `Te tabele zapisują, jak wytwarzano i starzono dym, a nie płomień: ${Object.values(det).map(d => `${d.acronym} (${fmt(d.rows)}) podaje ${d.measured.map(esc).join(', ')}`).join('; ')}. Wniosek raportu końcowego SAME o rozmiarze cząstek i czasie wykrycia to wniosek (c) na górze strony.`),
        note: L('Partial gravity: PSI holds no reduced-gravity (Moon or Mars g) combustion test. The challenge names LUCI and FM2 as future work; this corpus does not map either.',
                'Częściowa grawitacja: PSI nie zawiera testu spalania w obniżonej grawitacji (Księżyc, Mars). Challenge wymienia LUCI i FM2 jako przyszłe prace; ten korpus nie mapuje żadnego z nich.'),
      },
    ];
    // The challenge's optional fourth question: what the PSI work means on Earth.
    // Quotes come from app/data/earth.js and are checked by verify_insights.py;
    // the spin-offs are NASA heritage the challenge points to, not PSI results.
    const E = window.EARTH;
    if (E) {
      const q = k => L(`“${esc(E[k].q)}”`, `„${esc(E[k].q)}”`);
      const src = L(`<span class="p-src">NASA Researcher's Guide to Combustion Science (2015), outside PSI · verified</span>`,
                    `<span class="p-src">NASA Researcher's Guide to Combustion Science (2015), spoza PSI · zweryfikowane</span>`);
      const so = (n, en, pl) => `<a href="https://spinoff.nasa.gov/node/${n}" target="_blank" rel="noopener">${L(en, pl)}</a>`;
      cards.push({ earth: true,
        tag: L('On Earth', 'Na Ziemi'),
        n: '0',
        k: L(`water-mist tests among the ${fmt(D.meta.investigations)} PSI accessions with a test table`, `testów mgły wodnej wśród ${fmt(D.meta.investigations)} akcesji PSI z tabelą testów`),
        p: L(`<b>Detection.</b> ${q('smoke')} SAME and SAME-R (${fmt(det['PSI-102'] ? det['PSI-102'].rows : 0)} and ${fmt(det['PSI-101'] ? det['PSI-101'].rows : 0)} rows) measure exactly that difference in the smoke. Among the achievements NASA's guide lists in this area is a detector that reads particles and gases together: ${q('detector')} ${src}<br><br>
             <b>Suppression.</b> ${q('mist')} ${src} None of these accessions is a water-mist test, so this page cannot rank mist against the inert gases in the suppression card.<br><br>
             <b>Fuels.</b> FLEX burned heptane and methanol droplets; the guide calls their models the building blocks for diesel and jet-fuel models: ${q('fuels')} ${src}`,
             `<b>Wykrywanie.</b> ${q('smoke')} SAME i SAME-R (${fmt(det['PSI-102'] ? det['PSI-102'].rows : 0)} i ${fmt(det['PSI-101'] ? det['PSI-101'].rows : 0)} wierszy) mierzą właśnie tę różnicę w dymie. Wśród osiągnięć tego obszaru przewodnik NASA wymienia czujnik, który odczytuje cząstki i gazy jednocześnie: ${q('detector')} ${src}<br><br>
             <b>Gaszenie.</b> ${q('mist')} ${src} Żadna z tych akcesji nie jest testem mgły wodnej, więc ta strona nie może porównać mgły z gazami obojętnymi z karty o gaszeniu.<br><br>
             <b>Paliwa.</b> FLEX spalał krople heptanu i metanolu; przewodnik nazywa ich modele podstawą modeli oleju napędowego i paliwa lotniczego: ${q('fuels')} ${src}`),
        note: L(`NASA spin-offs the challenge points to — heritage technology, not results from this archive: ${so(9407, 'a fire detector that tells combustion particles from dust (1978)', '')}, ${so(9582, 'lighter firefighter air tanks (1976)', '')}, ${so(9918, 'protective clothing from spacesuit materials (1982)', '')}.`,
                `Spin-offy NASA wskazane w challenge'u — dziedzictwo technologiczne, nie wyniki z tego archiwum: ${so(9407, '', 'czujnik pożaru odróżniający cząstki spalania od pyłu (1978)')}, ${so(9582, '', 'lżejsze butle powietrza dla strażaków (1976)')}, ${so(9918, '', 'odzież ochronna z materiałów skafandrów (1982)')}.`),
      });
    }
    host.innerHTML = '';
    cards.forEach(c => { if (c.earth) c.blocks = c.p.split(/<br><br>\s*/); });
    cards.forEach(c => {
      const [vis, more] = c.blocks
        ? (([v, m]) => [v, [m, ...c.blocks.slice(1)].filter(Boolean).join('<br><br>')])(clamp3(c.blocks[0]))
        : clamp3(c.p);
      const card = el('div', { class: 'pillar', html:
        `<span class="tag">${c.tag}</span><div class="p-n">${c.n}</div><div class="p-k">${c.k}</div><p>${vis}</p>` +
        (more || c.note ? `<details class="more"><summary>${L('show details', 'pokaż szczegóły')}</summary>${more ? `<p>${more}</p>` : ''}${c.note ? `<p class="p-note">${c.note}</p>` : ''}</details>` : '') });
      // The counts above are computed from these notes; print the notes so a
      // reader can check the count against its evidence without leaving the page.
      if (c.quotes && c.quotes.length) {
        const det = el('details', { class: 'p-quotes' });
        det.append(el('summary', {}, L(`The ${fmt(c.quotes.length)} operator notes these counts come from`,
                                       `${fmt(c.quotes.length)} notatek operatora, z których policzono te liczby`)));
        const ul = el('ul');
        c.quotes.forEach(q => ul.append(el('li', {}, q)));
        det.append(ul);
        card.append(det);
      }
      host.append(card);
    });
  };

  /* ---------------- model export ---------------- */
  // The dataset a model would train on, written in the browser from window.DATASET
  // so the file and the screen cannot disagree. Units are in the column names
  // because a bare "0.222" is the exact ambiguity this project exists to remove.
  const EXPORT_COLS = [
    ['accession', r => r.i],
    ['investigation', r => r.a],
    ['row', r => r.r],
    ['material_class', r => r.ph],
    ['o2_frac', r => r.o2],
    ['pressure_bar', r => r.p],
    ['pressure_source', r => r.p == null ? '' : (r.pd ? 'report' : 'test-table')],
    ['flow', r => r.f],
    ['sample', r => r.m],
    ['fuel', r => r.fu],
    ['outcome', r => r.o || ''],
    ['outcome_note', r => r.ob || ''],
    ['flow_note', r => r.fl ? r.fl.raw : ''],
  ];
  const csvCell = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const exportRows = () => ROWS.map(r => Object.fromEntries(EXPORT_COLS.map(([k, f]) => [k, f(r)])));
  const download = (name, mime, body) => {
    const a = el('a', { href: URL.createObjectURL(new Blob([body], { type: mime })), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  // What the set supports, stated from the set: a model trained here is
  // interpolating inside these ranges and extrapolating outside them. The
  // envelope count is the map's own predicate (inChallenge), so this sentence
  // and the map's caption cannot report different numbers for the same class.
  const coverageLine = () => {
    const by = {};
    ROWS.forEach(r => { (by[r.ph] = by[r.ph] || []).push(r); });
    const cls = Object.keys(by).map(k => {
      const rs = by[k];
      const o2 = rs.map(r => r.o2).filter(v => v != null);
      const p = rs.map(r => r.p).filter(v => v != null);
      return { k, n: rs.length, o2: o2.length ? [Math.min(...o2), Math.max(...o2)] : null,
               p: p.length ? [Math.min(...p), Math.max(...p)] : null,
               env: rs.filter(inChallenge).length };
    }).sort((a, b) => b.n - a.n);
    const f = (v, d) => fmt(v * 100, d) + '%';
    const parts = cls.map(c => c.o2
      ? `${phaseShort(c.k)}: ${f(c.o2[0], 1)}–${f(c.o2[1], 1)} O₂` + (c.p ? `, ${fmt(c.p[0], 2)}–${fmt(c.p[1], 2)} bar` : `, ${L('no pressure recorded', 'brak zapisanego ciśnienia')}`)
        + ` · ${fmt(c.env)} ${L('in the challenge envelope', 'w obwiedni z challenge')}`
      : `${phaseShort(c.k)}: ${L('no oxygen recorded', 'brak zapisanego tlenu')}`);
    const solidMax = Math.max(...ROWS.filter(r => r.ph === 'solid').map(r => r.o2).filter(v => v != null));
    const bre = D.bre;
    return L('Supported ranges, by class — ' + parts.join('; ') + '. '
             + `BRE reaches ${f(bre.o2_min, 0)}–${f(bre.o2_max, 0)} O₂ but its table records no pressure, so it cannot be counted in a two-axis envelope. `
             + `Outside these ranges, and for solid materials above ${f(solidMax, 1)}, a model would be extrapolating.`,
             'Zakresy, które zbiór pokrywa, według klas — ' + parts.join('; ') + '. '
             + `BRE sięga ${f(bre.o2_min, 0)}–${f(bre.o2_max, 0)} O₂, ale jego tabela nie zapisuje ciśnienia, więc nie da się go policzyć w obwiedni dwuosiowej. `
             + `Poza tymi zakresami, a dla materiałów stałych powyżej ${f(solidMax, 1)}, model ekstrapolowałby.`);
  };  const renderExport = () => {
    const exportHost = $('#export-actions');
    if (!exportHost) return;
    exportHost.innerHTML = '';
    const csv = () => {
      const head = EXPORT_COLS.map(c => c[0]).join(',');
      const body = exportRows().map(o => EXPORT_COLS.map(c => csvCell(o[c[0]])).join(',')).join('\n');
      download('ignis-dataset.csv', 'text/csv;charset=utf-8', head + '\n' + body + '\n');
    };
    const json = () => download('ignis-dataset.json', 'application/json',
      JSON.stringify({ meta: D.meta, columns: EXPORT_COLS.map(c => c[0]), testpoints: exportRows() }, null, 1));
    // onclick must be set as a property: el() goes through setAttribute, which
    // would stringify the handler into an attribute that never fires.
    const mk = (label, fn) => {
      const b = el('button', { class: 'chip', type: 'button' }, label);
      b.onclick = fn;
      return b;
    };
    exportHost.append(mk(L('Download CSV', 'Pobierz CSV'), csv));
    exportHost.append(mk(L('Download JSON', 'Pobierz JSON'), json));
    exportHost.append(el('p', { class: 'export-note' }, coverageLine()));
  };

  /* ---------------- verdict ---------------- */
  // What to do about the gap. The findings themselves are at the top of the
  // page; these cards say what would close it, without repeating them.
  const renderVerdict = () => {
    const CA = D.pillars.prevention.solid_ceiling_at;
    const SG = D.outside_psi.sofie_gel;
    const cards = [
      {
        rank: '01', tag: L('Test gap', 'Luka testowa'),
        h: L(`Test solid materials in the ${fmt(solidMaxO2 * 100, 1)}–${fmt(CH_O2 * 100, 0)}% O₂ band`, `Przetestować materiały stałe w paśmie ${fmt(solidMaxO2 * 100, 1)}–${fmt(CH_O2 * 100, 0)}% O₂`),
        p: L(
          `Every solid-material test in PSI stops at ${fmt(solidMaxO2 * 100, 1)}% oxygen — the highest of the ${fmt(solidO2.length)} points that record a level is ${CA.acronym} (${CA.investigation}) row ${CA.row}, ${esc(CA.material)}.
           The challenge puts lunar oxygen at ${fmt(CH_O2 * 100, 0)}% or more, so ${fmt(CH.gap_pp, 1)} percentage points of that atmosphere have no solid-material test in PSI — the materials a habitat interior is made of.
           NASA's nominal design point — ${fmt(LUNAR_O2 * 100, 1)}% oxygen at ${fmt(LUNAR_P, 3)} bar — sits inside that band, ${fmt(D.lunar.gap_nominal_pp, 1)} points above the ceiling, and PSI holds no measurement there either.
           The second mode the same paper describes — ${fmt(ALT_O2 * 100, 0)}% at ${fmt(ALT_P, 3)} bar — is ${fmt(D.lunar.gap_capability_pp, 1)} points beyond the ceiling, and no solid test was run within ${fmt(DP_TOL, 2)} bar of that pressure either.
           The ceiling is not a safety limit: both BASS campaigns varied oxygen by adding nitrogen to the glovebox air (the BASS-II report and the BASS operator notes say so), a method that can only go down from cabin air.
           A test above cabin air is a different experiment, and PSI does not contain it.
           Such experiments exist outside PSI: ${SG.name} on the ${SG.where} burned ${SG.fuel_en} at ${fmt(SG.o2_pct[0])}–${fmt(SG.o2_pct[1])}% O₂ and ${fmt(SG.p_atm[0], 2)}–${fmt(SG.p_atm[1], 1)} atm (${esc(SG.source)}). Its points are not in the archive, so the first step is to publish them there.`,
          `Każdy test materiału stałego w PSI kończy się na ${fmt(solidMaxO2 * 100, 1)}% tlenu — najwyższy z ${fmt(solidO2.length)} punktów zapisujących poziom to ${CA.acronym} (${CA.investigation}) wiersz ${CA.row}, ${esc(CA.material)}.
           Challenge podaje tlen księżycowy na ${fmt(CH_O2 * 100, 0)}% lub więcej, więc dla ${fmt(CH.gap_pp, 1)} punktu procentowego tej atmosfery PSI nie ma żadnego testu materiału stałego — a z takich materiałów zbudowane jest wnętrze habitatu.
           Nominalny punkt projektu NASA — ${fmt(LUNAR_O2 * 100, 1)}% tlenu przy ${fmt(LUNAR_P, 3)} bar — leży w tym paśmie, ${fmt(D.lunar.gap_nominal_pp, 1)} punktu nad sufitem, i tam też PSI nie ma pomiaru.
           Drugi opisany tryb — ${fmt(ALT_O2 * 100, 0)}% przy ${fmt(ALT_P, 3)} bar — leży ${fmt(D.lunar.gap_capability_pp, 1)} punktu za sufitem, a w granicach ${fmt(DP_TOL, 2)} bar od tego ciśnienia nie wykonano też żadnego testu materiału stałego.
           Sufit nie jest granicą bezpieczeństwa: obie kampanie BASS zmieniały tlen, dodając azot do powietrza w rękawicy (mówią to raport BASS-II i notatki operatorów BASS), czyli metodą, która potrafi tylko schodzić w dół od powietrza kabinowego.
           Test powyżej powietrza kabinowego to inny eksperyment i korpus PSI go nie zawiera.
           Takie eksperymenty istnieją poza PSI: ${SG.name} na ${SG.where} spalał ${SG.fuel_pl} przy ${fmt(SG.o2_pct[0])}–${fmt(SG.o2_pct[1])}% O₂ i ${fmt(SG.p_atm[0], 2)}–${fmt(SG.p_atm[1], 1)} atm (${esc(SG.source)}). Ich punktów nie ma w archiwum, więc pierwszym krokiem jest ich tam opublikowanie.`)
      },
      {
        rank: '02', tag: L('Pressure gap', 'Luka ciśnienia'),
        h: L('Vary the pressure, not the oxygen', 'Zmieniać ciśnienie, a nie tlen'),
        p: L(
          `The method for varying oxygen already exists in this corpus: BASS-II diluted ISS air with nitrogen inside the glovebox down to ${fmt(solidMinO2 * 100, 1)}% O2, and documented the result.
           Pressure it never varied — ${fmt(solidDocP)} of the ${fmt(solid.length)} solid points carry a documented pressure and every one sits between ${fmt(PDOC.min_bar, 2)} and ${fmt(PDOC.max_bar, 2)} bar.
           So the missing axis is not a column in an export: no solid-material test in this archive changes the pressure at all.`,
          `Metoda zmieniania tlenu już w tym korpusie istnieje: BASS-II rozcieńczał powietrze ISS azotem w rękawicy do ${fmt(solidMinO2 * 100, 1)}% O2 i dokumentował wynik.
           Ciśnienia nie zmieniał nigdy — ${fmt(solidDocP)} z ${fmt(solid.length)} punktów stałych ma udokumentowane ciśnienie i wszystkie leżą między ${fmt(PDOC.min_bar, 2)} a ${fmt(PDOC.max_bar, 2)} bar.
           Brakującą osią nie jest więc kolumna w eksporcie: w tym archiwum ciśnienia nie zmienia żaden test materiału stałego.`)
      },
      {
        rank: '03', tag: L('Use what exists', 'Użyć tego, co jest'),
        h: L('Report the droplet analogue — never as a substitute', 'Raportować analogię kropelkową — nigdy jako substytut'),
        p: L(
          `What the FLEX droplets did at the design pressure is finding (b) at the top of the page: of ${fmt(flexNear)} droplet tests within ${fmt(DP_TOL, 2)} bar of it, ${fmt(flexHighRows.length)} also reach ${fmt(LUNAR_O2 * 100, 1)}% oxygen.
           It is the only measured behaviour at the design pressure, so it belongs in a safety case as context.
           Liquid fuel is not material flammability, and this must never be promoted to an answer.`,
          `To, co zrobiły krople FLEX przy ciśnieniu projektowym, to wniosek (b) na górze strony: z ${fmt(flexNear)} testów kropelkowych w granicach ${fmt(DP_TOL, 2)} bar od niego ${fmt(flexHighRows.length)} osiąga też ${fmt(LUNAR_O2 * 100, 1)}% tlenu.
           To jedyne zmierzone zachowanie przy ciśnieniu projektowym, więc należy do uzasadnienia bezpieczeństwa jako kontekst.
           Paliwo ciekłe nie jest palnością materiału i nigdy nie wolno tego podnosić do rangi odpowiedzi.`)
      },
    ];
    const vc = $('#verdict-cards');
    vc.innerHTML = '';
    cards.forEach(c => {
      const [vis, more] = clamp3(c.p);
      vc.append(el('div', { class: 'v-card', 'data-rank': c.rank, html:
        `<span class="tag">${c.tag}</span><h3 style="margin-top:14px">${c.h}</h3><p>${vis}</p>` +
        (more ? `<details class="more"><summary>${L('show details', 'pokaż szczegóły')}</summary><p>${more}</p></details>` : '') }));
    });
  };

  // The campaign that would close the gap, as computed by build_dataset.py:
  // material classes tested near the ceiling × the oxygen levels the challenge
  // and Kessler et al. name × Kessler's two pressures, with the replicate count
  // BASS used most often. Each cell shows its distance from evidence.
  const renderCampaign = () => {
    const host = $('#campaign');
    const C = D.campaign;
    if (!host || !C) return;
    const SG = D.outside_psi.sofie_gel;
    const cols = C.o2_levels_pct.flatMap(o => C.pressures_bar.map(p => [o, p]));
    const cell = (cls, o, p) => C.cells.find(c => c.class === cls && c.o2_pct === o && c.p_bar === p);
    const sign = v => (v > 0 ? '+' : '') + fmt(v, Number.isInteger(v) ? 0 : 1);
    const clsName = n => ({ 'SIBAL fabric': L('SIBAL fabric', 'tkanina SIBAL') }[n] || n);
    host.innerHTML =
      `<h3>${L('The campaign that would close the gap', 'Kampania, która zamknęłaby lukę')}</h3>` +
      `<p>${L(
        `<b>Step 0:</b> publish the ${SG.name} points in PSI — they span ${fmt(SG.o2_pct[0])}–${fmt(SG.o2_pct[1])}% O₂ and ${fmt(SG.p_atm[0], 2)}–${fmt(SG.p_atm[1], 1)} atm. ` +
        `<b>Then ${fmt(C.tests)} tests:</b> the ${fmt(C.classes.length)} material classes tested within 1 pp of the ceiling, at ${C.o2_levels_pct.map(o => fmt(o, 1) + '%').join(', ')} O₂ and ${C.pressures_bar.map(p => fmt(p, 3)).join(' and ')} bar, ` +
        `${fmt(C.replicates)} test per condition — what BASS ran for ${fmt(C.conditions_with_that_many)} of its ${fmt(C.conditions_in_bass)} conditions — in the flow range BASS used (${fmt(C.flow_cm_s[0])}–${fmt(C.flow_cm_s[1])} cm/s). ` +
        `Each cell gives its distance from the nearest PSI point of that class: oxygen in pp, pressure in %.`,
        `<b>Krok 0:</b> opublikować w PSI punkty ${SG.name} — obejmują ${fmt(SG.o2_pct[0])}–${fmt(SG.o2_pct[1])}% O₂ i ${fmt(SG.p_atm[0], 2)}–${fmt(SG.p_atm[1], 1)} atm. ` +
        `<b>Potem ${fmt(C.tests)} testów:</b> ${fmt(C.classes.length)} klas materiałów badanych do 1 pp od sufitu, przy ${C.o2_levels_pct.map(o => fmt(o, 1) + '%').join(', ')} O₂ i ${C.pressures_bar.map(p => fmt(p, 3)).join(' oraz ')} bar, ` +
        `${fmt(C.replicates)} test na warunek — tyle BASS wykonał dla ${fmt(C.conditions_with_that_many)} ze swoich ${fmt(C.conditions_in_bass)} warunków — w zakresie przepływu z BASS (${fmt(C.flow_cm_s[0])}–${fmt(C.flow_cm_s[1])} cm/s). ` +
        `Każda komórka podaje odległość od najbliższego punktu PSI tej klasy: tlen w pp, ciśnienie w %.`)}</p>` +
      `<details class="more"><summary>${L(`Show all ${fmt(C.tests)} tests, with each one's distance from evidence`, `Pokaż wszystkie ${fmt(C.tests)} testów z odległością każdego od dowodu`)}</summary>` +
      `<div class="campaign-scroll"><table><thead><tr><th>${L('material class', 'klasa materiału')}</th>${cols.map(([o, p]) => `<th>${fmt(o, 1)}% · ${fmt(p, 3)} bar</th>`).join('')}</tr></thead><tbody>` +
      C.classes.map(cls => `<tr><td class="n">${esc(clsName(cls))}</td>${cols.map(([o, p]) => {
        const c = cell(cls, o, p), n = c && c.nearest;
        return n ? `<td title="${esc(n.i)} #${n.row}: ${fmt(n.o2_pct, 1)}% · ${fmt(n.p_bar, 3)} bar">${sign(n.oxygen_distance_pp)} pp<br><span class="src">${sign(n.pressure_distance_pct)}%</span></td>`
                 : `<td class="src">${L('no point with a pressure', 'brak punktu z ciśnieniem')}</td>`;
      }).join('')}</tr>`).join('') +
      `</tbody></table></div></details>`;
  };

  /* ---------------- ask IGNIS (SI) ---------------- */
  // The worker (worker/) holds the key and runs DeepSeek V4.1 Flash through
  // OpenRouter over the same corpus. An answer is plain text with [PSI-xx] and
  // [Q:PSI-xx.field] tags; this side turns them into links and verified quotes,
  // and marks any it cannot resolve.
  const ASK_URL = ($('meta[name="ignis-ask"]') || {}).content || '';
  // Real answers recorded from the deployed worker by scripts/capture_ask_cache.mjs,
  // shown — labelled — only when the live call fails or runs past the limit.
  const CACHE = window.ASK_CACHE || { ask: {}, rank: {} };
  const ASK_LIMIT_S = 25;
  const INV = Object.fromEntries(D.investigations.map(i => [i.id, i]));
  let askLast = null; // { q, key, res, steps } — re-rendered on language switch
  const ASK_PRESETS = () => [
    ['rank', L('Rank', 'Ranking'), L('Rank the investigations most relevant to a lunar base at 30% O₂ and 10.2 psi, and say what each can and cannot tell us.',
                              'Uszereguj badania najważniejsze dla bazy księżycowej przy 30% O₂ i 10,2 psi i powiedz, co każde może, a czego nie może nam powiedzieć.')],
    ['extract', L('Extract', 'Dane'), L('Which test points could feed a flammability model for a Mars habitat cabin, and what oxygen and pressure ranges do they cover?',
                              'Które punkty testowe mogą zasilić model palności dla kabiny habitatu na Marsie i jakie zakresy tlenu i ciśnienia pokrywają?')],
    ['interpret', L('Interpret', 'Wnioski'), L('What do these findings imply for the next generation of fire detection and suppression equipment?',
                                   'Co te wyniki oznaczają dla następnej generacji sprzętu do wykrywania i gaszenia pożarów?')],
    ['earth', L('Earth', 'Ziemia'), L('What does this microgravity research mean for fire safety on Earth?',
                             'Co te badania w mikrograwitacji znaczą dla bezpieczeństwa pożarowego na Ziemi?')],
    ['gap', L('Gap', 'Luka'), L('What single test would most reduce the uncertainty for materials in a 30% oxygen cabin?',
                         'Jaki pojedynczy test najbardziej zmniejszyłby niepewność dla materiałów w kabinie z 30% tlenu?')],
    // A question the archive cannot answer, on purpose: the SI has to say what
    // is missing and how far the nearest measurement is, not guess.
    ['beyond', L('Beyond the data', 'Poza danymi'), L('How would polyurethane foam burn at 30% O₂ and 10.2 psi, compared with Nomex?',
                                             'Jak paliłaby się pianka poliuretanowa przy 30% O₂ i 10,2 psi w porównaniu z Nomexem?')],
  ];
  const askHtml = text => esc(text)
    .replace(/\[Q:([^\]]*)\]/g, (m, id) => {
      const [acc, field] = id.split('.');
      const cell = acc === 'EARTH' ? (window.EARTH || {})[field] : SI[acc] && SI[acc][field];
      return cell && cell.q
        ? `<span class="ask-q src-link" role="button" tabindex="0" data-src-kind="quote" data-src-id="${esc(acc)}" data-src-field="${esc(field)}">“${esc(cell.q)}”<small>${esc(acc)} · ${esc(cell.ext ? L('NASA Researcher\'s Guide (2015), outside PSI', 'NASA Researcher\'s Guide (2015), spoza PSI') : cell.f)} · ${L('verified quote', 'cytat zweryfikowany')} · <u>${L('open source', 'otwórz źródło')}</u></small></span>`
        : `<span class="ask-bad">[${L('unverified quote', 'niezweryfikowany cytat')}: ${id}]</span>`;
    })
    // Bracketed ids become links; a bare PSI-26 in running text stays text (the
    // model usually brackets the same id right after, and two links read as one).
    // "PSI-26 row 55" (with or without brackets) opens that table row.
    .replace(/\[?\b(PSI-\d+)\]?[ \u00a0]+(?:rows?|wiersze?|wierszu|wierszach)[ \u00a0]+(\d+)\]?/g, (m, id, rn) => INV[id]
      ? `<a class="ask-row src-link" href="#ask" data-src-kind="row" data-src-id="${id}" data-src-row="${rn}">${esc(INV[id].acronym)} · ${id} · ${L('row', 'wiersz')} ${rn}</a>`
      : m)
    .replace(/\[(PSI-\d+(?:,\s*PSI-\d+)*)\]/g, (m, ids) => ids.split(/,\s*/).map(id => `[${id}]`).join(''))
    .replace(/\[(PSI-[^\]\s]*)\]/g, (m, id) => INV[id]
      ? `<a class="ask-cite src-link" href="#atlas-${id}" data-src-kind="inv" data-src-id="${id}">${esc(INV[id].acronym)} · ${id}</a>`
      : `<span class="ask-bad">[${L('unknown source', 'nieznane źródło')}: ${id}]</span>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/).map(p => /^- /m.test(p)
      ? '<ul>' + p.split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('') + '</ul>'
      : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  const ASK_ERR = {
    rate_limited: ['Too many questions from this address — wait a minute.', 'Za dużo pytań z tego adresu — odczekaj minutę.'],
    busy: ['The model is busy — try again in a moment.', 'Model jest zajęty — spróbuj za chwilę.'],
    refused: ['The model declined this question.', 'Model odmówił odpowiedzi na to pytanie.'],
    too_many_steps: ['The question needed too many data queries — narrow it down.', 'Pytanie wymagało zbyt wielu zapytań o dane — zawęź je.'],
    empty: ['The model returned no answer — ask again.', 'Model nie zwrócił odpowiedzi — zapytaj ponownie.'],
    upstream: ['The model provider did not answer — try again in a moment.', 'Dostawca modelu nie odpowiedział — spróbuj za chwilę.'],
    timeout: [`No answer within ${ASK_LIMIT_S} s.`, `Brak odpowiedzi w ciągu ${ASK_LIMIT_S} s.`],
    network: ['The SI service could not be reached.', 'Nie udało się połączyć z usługą SI.'],
  };
  // The preset a question belongs to, in either language, so a typed copy of a
  // preset still finds its saved answer.
  const presetKeyOf = q => {
    const cur = LANG;
    let key = null;
    ['en', 'pl'].forEach(lg => { LANG = lg; ASK_PRESETS().forEach(([k, , text]) => { if (text === q.trim()) key = k; }); });
    LANG = cur;
    return key;
  };
  const savedAnswer = key => key && (CACHE.ask[`${key}:${LANG}`] || null);
  const dateFmt = iso => { try { return new Date(iso + 'T12:00:00Z').toLocaleDateString(LOC(), { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return iso; } };
  const askMeta = (res, c) => {
    const bad = (c.unknown_investigations || []).length + (c.unknown_quotes || []).length + (c.unverified_free_quotes || []).length;
    return `<p class="ask-sugg">${L('Checked against the corpus before display. Click any source above to open the record it rests on.', 'Sprawdzone względem korpusu przed wyświetleniem. Kliknij dowolne źródło powyżej, żeby otworzyć rekord, na którym się opiera.')}</p><p class="ask-meta">${esc(res.model || '')} · ${L('data queries', 'zapytania o dane')}: ${fmt(res.queries || 0)} · ` +
      `${L('investigations cited', 'cytowane badania')}: ${fmt((c.cited_investigations || []).length - (c.unknown_investigations || []).length)} · ` +
      `${L('verified quotes', 'zweryfikowane cytaty')}: ${fmt((c.cited_quotes || []).length - (c.unknown_quotes || []).length + (c.free_quotes || 0) - (c.unverified_free_quotes || []).length)}` +
      (bad ? ` · <span class="ask-bad">${L('unresolved citations', 'nierozpoznane odnośniki')}: ${fmt(bad)}</span>` : '') +
      (res.truncated ? ` · <span class="ask-bad">${L('answer cut off', 'odpowiedź ucięta')}</span>` : '') + '</p>';
  };
  const renderAskOut0 = () => {
    const out = $('#ask-out');
    if (!askLast) {
      // Before any question: one real saved answer, so the panel is never empty.
      const ex = savedAnswer('beyond');
      const note = ASK_URL ? '' : `<p class="ask-note">${L(
        'Live SI is not connected in this copy (no endpoint configured). The preset buttons show answers saved from the live service.',
        'W tej kopii SI na żywo nie jest podłączona (brak skonfigurowanego adresu). Gotowe pytania pokazują odpowiedzi zapisane z usługi na żywo.')}</p>`;
      out.innerHTML = note + (ex ? `<p class="ask-saved ask-example">${L(
        `Example answer, saved ${dateFmt(ex.saved)}. Pick a question above to ask the SI live.`,
        `Przykładowa odpowiedź, zapisana ${dateFmt(ex.saved)}. Wybierz pytanie powyżej, żeby zapytać SI na żywo.`)}</p>` +
        `<p class="ask-asked">${esc(ex.question)}</p><div class="ask-a ask-clamp">${askHtml(ex.answer)}</div>` +
        `<button type="button" class="chip ask-full">${L('Show the full answer', 'Pokaż całą odpowiedź')}</button>` + askMeta(ex, ex.check || {}) : '');
      const full = out.querySelector('.ask-full');
      if (full) full.onclick = () => { out.querySelector('.ask-clamp').classList.remove('ask-clamp'); full.remove(); };
      return;
    }
    const { q, res } = askLast;
    if (res === 'pending') {
      // A step list: finished steps get a tick, the current one pulses.
      const st = askLast.steps.length ? askLast.steps : [{ stage: 'start', n: 1 }];
      out.innerHTML = `<p class="ask-asked">${esc(q)}</p><ol class="ask-steps" aria-live="polite">` +
        st.map((x, i) => `<li class="${i === st.length - 1 ? 'now' : 'done'}"><span class="ask-dot" aria-hidden="true"></span>${esc(stageText(x))}</li>`).join('') +
        '</ol>';
      return;
    }
    const retry = `<button class="chip ask-retry" type="button">${L('Try the live SI again', 'Spróbuj ponownie na żywo')}</button>`;
    if (res.error) {
      const e = ASK_ERR[res.error];
      const msg = e ? L(e[0], e[1]) : L('The SI service did not answer', 'Usługa SI nie odpowiedziała') + ` (${esc(res.error)})`;
      const saved = savedAnswer(askLast.key);
      if (saved) {
        // A real answer recorded earlier, said to be exactly that.
        out.innerHTML = `<p class="ask-saved">${L(`Saved answer, recorded ${dateFmt(saved.saved)} — not live.`, `Odpowiedź zapisana ${dateFmt(saved.saved)}, nie na żywo.`)} ` +
          `<span>${msg}</span> ${retry}</p>` +
          `<p class="ask-asked">${esc(saved.question)}</p><div class="ask-a">${askHtml(saved.answer)}</div>` + askMeta(saved, saved.check || {});
      } else {
        out.innerHTML = `<p class="ask-bad">${msg}</p>${retry}`;
      }
      const b = out.querySelector('.ask-retry');
      if (b) b.onclick = () => askSend(askLast.q, askLast.key);
      return;
    }
    out.innerHTML = `<p class="ask-asked">${esc(q)}</p><div class="ask-a ask-in">${askHtml(res.answer)}</div>` + askMeta(res, res.check || {});
  };
  // Above every answer: what in it can be clicked and what each kind opens,
  // with the first real link of each kind from this answer as the example.
  const askLegend = () => {
    const out = $('#ask-out'), ans = out && out.querySelector('.ask-a');
    if (!ans) return;
    const kinds = [
      ['.ask-cite', L('the investigation: what it measured, its oxygen and pressure range, its files', 'badanie: co mierzyło, zakres tlenu i ciśnienia, pliki')],
      ['.ask-row', L('the NASA data row: file, row number and every value', 'wiersz danych NASA: plik, numer wiersza i wszystkie wartości')],
      ['.ask-q', L('the NASA document the quote comes from', 'dokument NASA, z którego pochodzi cytat')],
    ];
    const items = kinds.map(([sel, t]) => {
      const first = ans.querySelector(sel);
      if (!first) return null;
      const ex = first.cloneNode(true);
      if (sel === '.ask-q') { ex.textContent = L('“quote” · open source', '„cytat” · otwórz źródło'); ex.className = 'ask-cite ask-qx src-link'; }
      const li = el('li', {});
      li.append(ex, document.createTextNode(' → ' + t));
      return li;
    }).filter(Boolean);
    if (!items.length) return;
    const box = el('div', { class: 'ask-legend' },
      el('p', {}, L('Click any highlighted tag in the answer — it opens the source behind it:', 'Kliknij dowolny podświetlony znacznik w odpowiedzi — otworzy źródło, na którym się opiera:')));
    const ul = el('ul', {});
    items.forEach(li => ul.append(li));
    box.append(ul);
    ans.before(box);
  };
  const renderAskOut = () => { renderAskOut0(); askLegend(); };
  const askSend = async (q, key = presetKeyOf(q)) => {
    if (!q.trim()) return;
    askLast = { q, key, res: 'pending', steps: [] };
    renderAskOut();
    if (!ASK_URL) { askLast.res = { error: 'network' }; renderAskOut(); return; }
    $('#ask-go').disabled = true;
    const ctl = new AbortController();
    const kill = setTimeout(() => ctl.abort(), ASK_LIMIT_S * 1000);
    const mine = askLast;
    try {
      mine.res = await askWorker({ question: q, lang: LANG },
        e => { addStage(mine.steps, e); if (askLast === mine) renderAskOut(); }, ctl.signal);
    } catch (e) {
      mine.res = { error: e.name === 'AbortError' ? 'timeout' : 'network' };
    }
    clearTimeout(kill);
    if (askLast !== mine) return;   // a newer question replaced this one
    $('#ask-go').disabled = false;
    renderAskOut();
  };
  const renderAsk = () => {
    const box = $('#ask-presets');
    box.innerHTML = '';
    ASK_PRESETS().forEach(([key, k, q]) => {
      const b = el('button', { class: 'chip', type: 'button' }, k);
      b.title = q;
      b.onclick = () => { $('#ask-q').value = q; askSend(q, key); };
      box.append(b);
    });
    $('#ask-go').disabled = askLast && askLast.res === 'pending';
    renderAskOut();
  };
  $('#ask-form').onsubmit = e => { e.preventDefault(); askSend($('#ask-q').value); };

  /* ---------------- source popup ---------------- */
  // Any source on the page — an investigation tag, a quote, a "PSI-26 row 55"
  // in an SI answer, a row in the data search — opens this one dialog, which
  // shows the record itself: the file it comes from, the row, the values. The
  // SI suggests; this is where the reader checks what the suggestion rests on.
  const SRC_FIELD = {
    objective:  ['Objective', 'Cel'],
    fuel:       ['Fuel', 'Paliwo'],
    sample:     ['Sample', 'Próbka'],
    varied:     ['What changed between tests', 'Co zmieniano między testami'],
    sensors:    ['Sensors', 'Czujniki'],
    apparatus:  ['Apparatus', 'Aparatura'],
    conclusion: ['Fire-safety conclusion', 'Wniosek dla bezpieczeństwa pożarowego'],
  };
  const pctTxt = v => v == null ? '—' : `${fmt(v * 100, 1)}%`;
  const barTxt = v => v == null ? '—' : `${fmt(v, 3)} bar`;
  const rangeTxt = (a, f) => a ? (f(a[0]) === f(a[1]) ? f(a[0]) : `${f(a[0])} – ${f(a[1])}`) : L('not recorded', 'nie zapisano');
  const srcAttr = (kind, id, extra = {}) =>
    `data-src-kind="${kind}" data-src-id="${esc(id)}"` + Object.entries(extra).map(([k, v]) => ` data-src-${k}="${esc(v)}"`).join('');
  const tableOf = r => { const i = INV[r.i]; return i && i.tables && i.tables[r.t || 0] || L('table file not recorded', 'nie zapisano pliku tabeli'); };
  const dl = pairs => '<dl class="src-dl">' + pairs.filter(p => p).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') + '</dl>';
  const popFoot = () => `<p class="src-foot">${L(
    'IGNIS shows what the archive contains; it does not certify a material or an atmosphere. Check the source before relying on it.',
    'IGNIS pokazuje, co zawiera archiwum; nie certyfikuje materiału ani atmosfery. Sprawdź źródło, zanim się na nim oprzesz.')}</p>`;
  const quoteHtml = (acc, field, cell) =>
    `<blockquote class="src-q">“${esc(cell.q)}”</blockquote>` + dl([
      [L('Field', 'Pole'), esc(SRC_FIELD[field] ? L(...SRC_FIELD[field]) : field)],
      [L('File', 'Plik'), `<code>${esc(cell.f)}</code>` + (cell.ext ? ` · <span class="si-ext">${L('outside PSI — NASA Researcher\'s Guide (2015)', 'spoza PSI — NASA Researcher\'s Guide (2015)')}</span>` : ` · ${L('in this accession\'s PSI folder', 'w folderze PSI tej akcesji')}`)],
      [L('Checked', 'Sprawdzono'), L('the sentence appears word for word in that file — scripts/verify_insights.py re-reads it on every build',
                                     'zdanie występuje dosłownie w tym pliku — scripts/verify_insights.py czyta go ponownie przy każdej budowie')],
    ]);
  const openSource = (kind, id, extra = {}) => {
    const body = $('#src-pop-body');
    const btns = [];
    let h = '';
    if (kind === 'inv') {
      const i = INV[id];
      if (!i) return;
      const s = SI[id] || {};
      h = `<p class="src-k">${L('Investigation', 'Badanie')} · ${esc(id)}</p><h3 id="src-pop-h">${esc(i.acronym)}<small>${esc(i.name)}</small></h3>` + dl([
        [L('Material class', 'Klasa materiału'), esc(phaseName(i.phase))],
        [L('Test points', 'Punkty testowe'), `${fmt(i.rows)} ${L('usable', 'użytecznych')} · ${fmt(i.raw_rows)} ${L('rows in the table', 'wierszy w tabeli')}`],
        [L('Oxygen', 'Tlen'), rangeTxt(i.o2, pctTxt)],
        [L('Pressure', 'Ciśnienie'), rangeTxt(i.p, barTxt)],
        [L('Air flow column', 'Kolumna przepływu'), i.has_flow ? L('yes', 'tak') : L('no', 'nie')],
        i.materials.length ? [L('Samples', 'Próbki'), esc(i.materials.join(' · ')) + (i.n_materials > i.materials.length ? ' …' : '')] : null,
        [L('Source table', 'Tabela źródłowa'), (i.tables || []).map(f => `<code>${esc(f)}</code>`).join('<br>') || '—'],
      ]);
      const qs = Object.keys(SRC_FIELD).filter(k => s[k] && s[k].q);
      if (qs.length) h += `<p class="src-sub">${L('Verified quotes from its documents', 'Zweryfikowane cytaty z jego dokumentów')}</p>` +
        qs.map(k => `<button type="button" class="src-qline" ${srcAttr('quote', id, { field: k })}><b>${esc(L(...SRC_FIELD[k]))}</b> “${esc(s[k].q.length > 140 ? s[k].q.slice(0, 140) + '…' : s[k].q)}”</button>`).join('');
      if (i.rows) btns.push([L('Show its test points in the search', 'Pokaż jego punkty w wyszukiwarce'), () => { dsSet({ q: '', inv: id }); goTab('search'); }]);
      btns.push([L('Open its Atlas card', 'Otwórz jego kartę w Atlasie'), () => showAtlasRow('atlas-' + id)]);
    } else if (kind === 'quote') {
      const cell = id === 'EARTH' ? (window.EARTH || {})[extra.field] : SI[id] && SI[id][extra.field];
      if (!cell || !cell.q) return;
      h = `<p class="src-k">${L('Verified quote', 'Zweryfikowany cytat')} · ${esc(id)}</p><h3 id="src-pop-h">${esc(id === 'EARTH' ? 'NASA Researcher\'s Guide (2015)' : (INV[id] ? INV[id].acronym : id))}</h3>` + quoteHtml(id, extra.field, cell);
      if (INV[id]) btns.push([L('About this investigation', 'O tym badaniu'), () => openSource('inv', id)]);
    } else if (kind === 'row') {
      const rn = +extra.row;
      const pts = ROWS.filter(r => r.i === id && r.r === rn);
      const i = INV[id];
      h = `<p class="src-k">${L('Test point', 'Punkt testowy')} · ${esc(id)} · ${L('row', 'wiersz')} ${fmt(rn)}</p><h3 id="src-pop-h">${esc(i ? i.acronym : id)}</h3>`;
      if (!pts.length) h += `<p class="ask-bad">${L('No test point with this row number in the dataset — the reference cannot be backed.', 'W danych nie ma punktu o tym numerze wiersza — odwołania nie da się potwierdzić.')}</p>`;
      pts.forEach(r => {
        h += dl([
          [L('File', 'Plik'), `<code>${esc(tableOf(r))}</code>`],
          [L('Row', 'Wiersz'), `${fmt(r.r)} <span class="src-dim">${L('(data row, counted from the first row under the header)', '(wiersz danych, licząc od pierwszego pod nagłówkiem)')}</span>`],
          [L('Material class', 'Klasa materiału'), esc(phaseName(r.ph))],
          r.m ? [L('Sample', 'Próbka'), esc(r.m)] : null,
          r.fu ? [L('Fuel', 'Paliwo'), esc(r.fu)] : null,
          [L('Oxygen', 'Tlen'), pctTxt(r.o2)],
          [L('Pressure', 'Ciśnienie'), barTxt(r.p) + (r.pd ? ` <span class="src-dim">${L('(from the report, not the table)', '(z raportu, nie z tabeli)')}</span>` : '')],
          r.f != null ? [L('Flow / rate', 'Przepływ / tempo'), `${fmt(r.f, 2)} <span class="src-dim">${L('(units as in the table)', '(jednostki jak w tabeli)')}</span>`] : null,
          r.o ? [L('Outcome', 'Wynik'), esc(r.o)] : null,
          r.ob ? [L('Operator note', 'Notatka operatora'), esc(r.ob)] : null,
          ...Object.entries(r.x || {}).map(([k, v]) => [esc(k), typeof v === 'number' ? fmt(v, 3) : esc(v)]),
        ]);
      });
      if (i) btns.push([L('About this investigation', 'O tym badaniu'), () => openSource('inv', id)]);
      if (pts.length) btns.push([L('Show nearby rows in the search', 'Pokaż sąsiednie wiersze w wyszukiwarce'), () => { dsSet({ q: '', inv: id, sort: 'row' }); goTab('search'); }]);
    }
    body.innerHTML = h + '<div class="src-btns"></div>' + popFoot();
    const bx = body.querySelector('.src-btns');
    btns.forEach(([t, fn]) => { const b = el('button', { type: 'button', class: 'chip' }, t); b.onclick = () => { pop.close(); fn(); }; bx.append(b); });
    if (!pop.open) pop.showModal();
    body.scrollTop = 0;
  };
  const pop = $('#src-pop');
  pop.addEventListener('click', e => { if (e.target === pop) pop.close(); });   // click on the backdrop
  document.addEventListener('click', e => {
    // Links to an Atlas card from the findings cards open the source first.
    const at = e.target.closest('a[href^="#atlas-PSI-"]:not([data-src-kind])');
    if (at && !at.closest('.src-pop')) { e.preventDefault(); openSource('inv', at.getAttribute('href').slice(7)); return; }
    const a = e.target.closest('[data-src-kind]');
    if (!a) return;
    e.preventDefault();
    openSource(a.dataset.srcKind, a.dataset.srcId, { field: a.dataset.srcField, row: a.dataset.srcRow });
  });
  document.addEventListener('keydown', e => {
    const a = e.target.closest && e.target.closest('[data-src-kind]');
    if (a && (e.key === 'Enter' || e.key === ' ') && a.tagName !== 'BUTTON' && a.tagName !== 'A') { e.preventDefault(); a.click(); }
  });

  /* ---------------- data search (no SI) ---------------- */
  // Plain filtering over every test point: no model, no network. Each result
  // row opens its source record.
  const HAY = ROWS.map(r => [r.i, r.a, r.m, r.fu, r.o, r.ob, INV[r.i] && INV[r.i].name, r.ph].filter(Boolean).join(' ').toLowerCase());
  const DS0 = { q: '', inv: '', ph: '', o2lo: '', o2hi: '', phi: '', both: false, sort: 'o2', n: 15 };
  let DS = { ...DS0 };
  const numIn = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
  const dsMatch = () => {
    const words = DS.q.toLowerCase().split(/\s+/).filter(Boolean);
    const lo = numIn(DS.o2lo), hi = numIn(DS.o2hi), phi = numIn(DS.phi);
    const out = [];
    ROWS.forEach((r, k) => {
      if (DS.inv && r.i !== DS.inv) return;
      if (DS.ph && r.ph !== DS.ph) return;
      if (DS.both && (r.o2 == null || r.p == null)) return;
      if (lo != null && !(r.o2 != null && r.o2 * 100 >= lo - 1e-9)) return;
      if (hi != null && !(r.o2 != null && r.o2 * 100 <= hi + 1e-9)) return;
      if (phi != null && !(r.p != null && r.p <= phi + 1e-9)) return;
      if (words.length && !words.every(w => HAY[k].includes(w))) return;
      out.push(r);
    });
    const by = {
      o2: (a, b) => (b.o2 ?? -1) - (a.o2 ?? -1),
      p: (a, b) => (a.p ?? 99) - (b.p ?? 99),
      row: (a, b) => a.i.localeCompare(b.i) || (a.t || 0) - (b.t || 0) || a.r - b.r,
    }[DS.sort];
    return by ? out.sort(by) : out;
  };
  const dsSet = patch => { DS = { ...DS, ...patch, n: DS0.n }; renderSearch(); };
  const renderSearch = () => {
    const host = $('#ds');
    const phases = [...new Set(ROWS.map(r => r.ph))];
    const invs = D.investigations.filter(i => i.rows);
    // Quick filters, each built from a definition the page already uses.
    const QUICK = [
      [L('Solid materials', 'Materiały stałe'), { ph: 'solid' }],
      [L(`Oxygen ≥ ${fmt(CH_O2 * 100, 0)}% (challenge)`, `Tlen ≥ ${fmt(CH_O2 * 100, 0)}% (challenge)`), { o2lo: String(CH_O2 * 100) }],
      [L(`Pressure ≤ ${fmt(CH_P, 3)} bar (challenge)`, `Ciśnienie ≤ ${fmt(CH_P, 3)} bar (challenge)`), { phi: String(CH_P) }],
      [L('With oxygen and pressure', 'Z tlenem i ciśnieniem'), { both: true }],
    ];
    host.innerHTML = `
      <p class="ds-help">${L(
        `Filter all ${fmt(ROWS.length)} test points from the PSI tables. Type a sample, fuel, investigation or outcome (all words must match), narrow by class, oxygen and pressure, then click any row to see its source file and every value recorded for it.`,
        `Filtruj wszystkie ${fmt(ROWS.length)} punkty testowe z tabel PSI. Wpisz próbkę, paliwo, badanie lub wynik (muszą pasować wszystkie słowa), zawęź klasą, tlenem i ciśnieniem, a potem kliknij dowolny wiersz, żeby zobaczyć plik źródłowy i wszystkie zapisane wartości.`)}</p>
      <div class="ds-row">
        <label class="ds-q"><span>${L('Text', 'Tekst')}</span><input id="ds-q" type="search" value="${esc(DS.q)}" placeholder="${L('e.g. Nomex, PMMA, BASS, extinguished', 'np. Nomex, PMMA, BASS, extinguished')}"></label>
        <label><span>${L('Investigation', 'Badanie')}</span><select id="ds-inv"><option value="">${L('all', 'wszystkie')}</option>${invs.map(i => `<option value="${i.id}"${DS.inv === i.id ? ' selected' : ''}>${esc(i.acronym)} · ${i.id}</option>`).join('')}</select></label>
        <label><span>${L('Material class', 'Klasa materiału')}</span><select id="ds-ph"><option value="">${L('all', 'wszystkie')}</option>${phases.map(p => `<option value="${p}"${DS.ph === p ? ' selected' : ''}>${esc(phaseName(p))}</option>`).join('')}</select></label>
        <label class="ds-n"><span>${L('O₂ from %', 'O₂ od %')}</span><input id="ds-o2lo" inputmode="decimal" value="${esc(DS.o2lo && fmt(numIn(DS.o2lo), 1))}"></label>
        <label class="ds-n"><span>${L('O₂ to %', 'O₂ do %')}</span><input id="ds-o2hi" inputmode="decimal" value="${esc(DS.o2hi && fmt(numIn(DS.o2hi), 1))}"></label>
        <label class="ds-n"><span>${L('Pressure ≤ bar', 'Ciśnienie ≤ bar')}</span><input id="ds-phi" inputmode="decimal" value="${esc(DS.phi && fmt(numIn(DS.phi), 3))}"></label>
        <label><span>${L('Sort', 'Sortuj')}</span><select id="ds-sort">
          <option value="o2"${DS.sort === 'o2' ? ' selected' : ''}>${L('highest oxygen first', 'najwyższy tlen najpierw')}</option>
          <option value="p"${DS.sort === 'p' ? ' selected' : ''}>${L('lowest pressure first', 'najniższe ciśnienie najpierw')}</option>
          <option value="row"${DS.sort === 'row' ? ' selected' : ''}>${L('table order', 'kolejność w tabeli')}</option></select></label>
      </div>
      <div class="ds-quick"><span>${L('Quick filters:', 'Szybkie filtry:')}</span></div>
      <div id="ds-res"></div>`;
    const qk = host.querySelector('.ds-quick');
    QUICK.forEach(([t, patch]) => { const b = el('button', { type: 'button', class: 'chip' }, t); b.onclick = () => dsSet(patch); qk.append(b); });
    const clr = el('button', { type: 'button', class: 'chip ds-clear' }, L('Clear all', 'Wyczyść wszystko'));
    clr.onclick = () => { DS = { ...DS0 }; renderSearch(); };
    qk.append(clr);
    const bind = (id, key, ev = 'change') => { const n = $('#' + id); n.addEventListener(ev, () => { DS = { ...DS, [key]: n.type === 'checkbox' ? n.checked : n.value, n: DS0.n }; renderResults(); }); };
    bind('ds-q', 'q', 'input'); bind('ds-inv', 'inv'); bind('ds-ph', 'ph'); bind('ds-sort', 'sort');
    ['o2lo', 'o2hi', 'phi'].forEach(k => bind('ds-' + k, k, 'input'));
    renderResults();
  };
  const renderResults = () => {
    const res = $('#ds-res');
    const hits = dsMatch();
    const nInv = new Set(hits.map(r => r.i)).size;
    // Quotes are searched too: a word typed here may be in a document, not a table.
    const words = DS.q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const qhits = [];
    if (words.length) Object.entries(SI).forEach(([acc, s]) => Object.keys(SRC_FIELD).forEach(k => {
      const c = s[k];
      if (c && c.q && words.every(w => c.q.toLowerCase().includes(w))) qhits.push([acc, k, c]);
    }));
    const shown = hits.slice(0, DS.n);
    const cell = v => v == null ? '<span class="src-dim">—</span>' : v;
    res.innerHTML =
      `<div class="ds-sum"><b>${fmt(hits.length)}</b> ${L('of', 'z')} ${fmt(ROWS.length)} ${L('test points', 'punktów testowych')} · ${fmt(nInv)} ${L(nInv === 1 ? 'investigation' : 'investigations', nInv === 1 ? 'badanie' : plFew(nInv) ? 'badania' : 'badań')}
        <button type="button" class="chip" id="ds-csv"${hits.length ? '' : ' disabled'}>${L('Download these rows (CSV)', 'Pobierz te wiersze (CSV)')}</button></div>` +
      (qhits.length ? `<div class="ds-quotes"><p class="src-sub">${L('Also in the documents — verified quotes', 'Także w dokumentach — zweryfikowane cytaty')} (${fmt(qhits.length)})</p>` +
        qhits.slice(0, 6).map(([acc, k, c]) => `<button type="button" class="src-qline" ${srcAttr('quote', acc, { field: k })}><b>${esc(INV[acc] ? INV[acc].acronym : acc)} · ${esc(L(...SRC_FIELD[k]))}</b> “${esc(c.q.length > 150 ? c.q.slice(0, 150) + '…' : c.q)}”</button>`).join('') + '</div>' : '') +
      (hits.length ? `<div class="ds-table-w"><table class="ds-table"><thead><tr>
          <th>${L('Investigation', 'Badanie')}</th><th>${L('Row', 'Wiersz')}</th><th>${L('Class', 'Klasa')}</th><th>${L('Sample or fuel', 'Próbka lub paliwo')}</th>
          <th class="num">O₂</th><th class="num">${L('Pressure', 'Ciśnienie')}</th><th>${L('Outcome', 'Wynik')}</th></tr></thead><tbody>` +
        shown.map(r => `<tr tabindex="0" ${srcAttr('row', r.i, { row: r.r })} title="${L('Open the source record', 'Otwórz rekord źródłowy')}">
          <td><b>${esc(r.a)}</b> <span class="src-dim">${r.i}</span></td><td class="num">${fmt(r.r)}</td><td><i class="ds-dot" style="background:${PHASE_COLOR[r.ph] || '#888'}"></i>${esc(phaseName(r.ph))}</td>
          <td>${cell(esc(r.m || r.fu || ''))}</td><td class="num">${cell(r.o2 == null ? null : pctTxt(r.o2))}</td>
          <td class="num">${cell(r.p == null ? null : fmt(r.p, 3) + ' bar')}</td><td>${cell(r.o ? esc(r.o) : null)}</td></tr>`).join('') +
        '</tbody></table></div>' : `<p class="ds-none">${L('No test point matches. Loosen a filter — an empty result here is itself a finding: the archive has nothing there.', 'Żaden punkt nie pasuje. Poluzuj filtr — pusty wynik też jest wnioskiem: archiwum nic tam nie ma.')}</p>`) +
      (hits.length > shown.length ? `<button type="button" class="chip ds-more" id="ds-more">${L(`Show more (${fmt(hits.length - shown.length)} left)`, `Pokaż więcej (zostało ${fmt(hits.length - shown.length)})`)}</button>` : '');
    const more = $('#ds-more');
    if (more) more.onclick = () => { DS.n += DS0.n; renderResults(); };
    $('#ds-csv').onclick = () => {
      const head = EXPORT_COLS.map(c => c[0]).join(',');
      download('ignis-search.csv', 'text/csv;charset=utf-8', head + '\n' + hits.map(r => EXPORT_COLS.map(([, f]) => csvCell(f(r))).join(',')).join('\n') + '\n');
    };
  };

  /* ---------------- details: collapsed until asked for ---------------- */
  const detBody = $('#details-body'), detBtn = $('#details-toggle');
  const setDetails = open => {
    if (!detBody || !detBtn) return;
    detBody.hidden = !open;
    detBtn.setAttribute('aria-expanded', String(open));
    detBtn.dataset.en = open ? 'Hide the details' : 'Show the details: air flow, corpus, export, telemetry';
    detBtn.dataset.pl = open ? 'Ukryj szczegóły' : 'Pokaż szczegóły: przepływ, korpus, eksport, telemetria';
    detBtn.textContent = LANG === 'pl' ? detBtn.dataset.pl : detBtn.dataset.en;
  };
  if (detBtn) detBtn.onclick = () => setDetails(detBody.hidden);
  // Anything that scrolls to a section inside the collapsed details opens it first.
  const sivOrig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...a) {
    if (detBody && detBody.hidden && detBody.contains(this)) setDetails(true);
    return sivOrig.apply(this, a);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !detBody || !detBody.hidden) return;
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (t && detBody.contains(t)) setDetails(true);
  }, true);
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t && detBody && detBody.contains(t)) setDetails(true); }

  /* ---------------- tabs: search / SI ---------------- */
  let TAB = 'si';
  const goTab = (t, scroll = true) => {
    TAB = t;
    $('#tab-search').setAttribute('aria-selected', String(t === 'search'));
    $('#tab-si').setAttribute('aria-selected', String(t === 'si'));
    $('#pane-search').hidden = t !== 'search';
    $('#pane-si').hidden = t !== 'si';
    if (scroll) $('#ask').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('#tab-search').onclick = () => goTab('search', false);
  $('#tab-si').onclick = () => goTab('si', false);

  /* ---------------- purpose ---------------- */
  const renderPurpose = () => {
    const cards = [
      [L('Where to test next', 'Gdzie testować dalej'),
       L('Shows where NASA\'s open combustion data stops — by oxygen, pressure and material — and suggests the tests that would close the gap. A starting point for researchers, not a safety rating.',
         'Pokazuje, gdzie kończą się otwarte dane NASA o spalaniu — według tlenu, ciśnienia i materiału — i sugeruje testy, które zamknęłyby lukę. Punkt wyjścia dla badaczy, nie ocena bezpieczeństwa.'), 'verdict'],
      [L('Faster access to the data', 'Szybszy dostęp do danych'),
       L(`Search and filter all ${fmt(ROWS.length)} test points from ${fmt(D.meta.tables)} NASA tables in one place and one set of units, without opening a spreadsheet.`,
         `Przeszukuj i filtruj wszystkie ${fmt(ROWS.length)} punkty testowe z ${fmt(D.meta.tables)} tabel NASA w jednym miejscu i w jednych jednostkach, bez otwierania arkusza.`), 'ask'],
      [L('Every claim has a source', 'Każde twierdzenie ma źródło'),
       L('Click any source tag, quote or row reference to see the file and row behind it. The SI writes suggestions; the cited tests are the evidence.',
         'Kliknij dowolny znacznik źródła, cytat lub odwołanie do wiersza, żeby zobaczyć plik i wiersz, na którym się opiera. SI pisze sugestie; dowodem są cytowane testy.'), 'takeaways'],
    ];
    const host = $('#purpose-cards');
    host.innerHTML = '';
    cards.forEach(([h, p, to], k) => {
      const a = el('a', { class: 'purpose-c', href: '#' + to }, el('b', {}, h), el('span', {}, p));
      if (k === 1) a.onclick = e => { e.preventDefault(); goTab('search'); };
      host.append(a);
    });
  };

  /* ---------------- section bar ---------------- */
  // Every section, in page order, always on screen: [section id, label, what it is, tab].
  const NAV = () => [
    ['top', L('About', 'O narzędziu'), L('what IGNIS is for', 'do czego służy IGNIS')],
    ['takeaways', L('Findings', 'Wnioski'), L('four suggestions, each with its limit and its source', 'cztery sugestie, każda z ograniczeniem i źródłem')],
    ['map', L('Coverage', 'Pokrycie'), L('oxygen against pressure: where tests exist and where none do', 'tlen względem ciśnienia: gdzie są testy, a gdzie ich brak')],
    ['ask', L('Ask SI', 'Zapytaj SI'), L('a written answer, checked against the corpus, with clickable sources', 'odpowiedź opisowa, sprawdzona względem korpusu, z klikalnymi źródłami'), 'si'],
    ['ask', L('Search data', 'Szukaj w danych'), L('every test point, filterable, each with its source row — no SI', 'każdy punkt testowy, z filtrami i wierszem źródłowym — bez SI'), 'search'],
    ['atlas', L('Atlas', 'Atlas'), L('every investigation, what it measured, ranked for a mission', 'każde badanie, co mierzyło, uszeregowane dla misji')],
    ['solver', L('Check an atmosphere', 'Sprawdź atmosferę'), L('pick a cabin; see the nearest real tests and how far away they are', 'wybierz kabinę; zobacz najbliższe prawdziwe testy i ich odległość')],
    ['verdict', L('Test plan', 'Plan testów'), L('what the archive does not cover and the tests that would cover it', 'czego archiwum nie pokrywa i testy, które by to pokryły')],
    ['details', L('Details', 'Szczegóły'), L('for the curious: where the numbers come from', 'dla dociekliwych: skąd biorą się liczby'), null, 'sep'],
    ['flowmap', L('O₂ × flow', 'O₂ × przepływ'), L('oxygen against air flow, with how each test ended', 'tlen względem przepływu, z tym, jak skończył się każdy test'), null, 'sub'],
    ['funnel', L('Corpus', 'Korpus'), L('how the published rows become usable test points', 'jak opublikowane wiersze stają się punktami testowymi'), null, 'sub'],
    ['pillars', L('Pillars & export', 'Filary i eksport'), L('prevention, detection, suppression, Earth — and the model-ready export', 'zapobieganie, wykrywanie, gaszenie, Ziemia — i eksport dla modeli'), null, 'sub'],
    ['telemetry', L('Telemetry', 'Telemetria'), L('one real flame test, instrument by instrument', 'jeden prawdziwy test płomienia, przyrząd po przyrządzie'), null, 'sub'],
  ];
  // The main path, in reading order: each section ends with a link to the next one.
  const NEXT = () => [
    ['takeaways', 'map', L('Coverage: where the tests are', 'Pokrycie: gdzie są testy')],
    ['map', 'ask', L('Ask the SI or search the data', 'Zapytaj SI albo szukaj w danych')],
    ['ask', 'atlas', L('Atlas: every investigation', 'Atlas: każde badanie')],
    ['atlas', 'solver', L('Check your own atmosphere', 'Sprawdź własną atmosferę')],
    ['solver', 'verdict', L('Test plan: what to test next', 'Plan testów: co testować dalej')],
    ['verdict', 'details', L('Details: where the numbers come from', 'Szczegóły: skąd biorą się liczby')],
  ];
  const renderNext = () => {
    NEXT().forEach(([from, to, t]) => {
      const sec = document.getElementById(from);
      if (!sec) return;
      sec.querySelectorAll(':scope > .next-step').forEach(n => n.remove());
      const a = el('a', { class: 'next-step', href: '#' + to }, el('small', {}, L('Next', 'Dalej')), el('span', {}, t + ' →'));
      a.onclick = e => {
        e.preventDefault();
        document.getElementById(to).scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '#' + to); } catch (er) { /* file:// */ }
      };
      sec.append(a);
    });
  };
  let navHere = 'top';
  const navKey = (id, tab) => id + (tab ? ':' + tab : '');
  const renderNav = () => {
    const host = $('#nav-menu');
    host.innerHTML = '';
    let k = 0;
    NAV().forEach(([id, t, d, tab, sep]) => {
      if (sep === 'sub') return; // detail sections: one "Details" link keeps the bar on one line
      const a = sep
        ? el('a', { href: '#' + id, 'data-nav': id, title: d, class: 'nav-sep' }, t)
        : el('a', { href: '#' + id, 'data-nav': navKey(id, tab), title: d }, el('small', {}, String(++k).padStart(2, '0')), t);
      a.onclick = e => {
        e.preventDefault();
        if (tab) goTab(tab); else document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '#' + id); } catch (er) { /* file:// */ }
      };
      host.append(a);
    });
    markHere();
  };
  const markHere = () => {
    const sub = NAV().some(x => x[0] === navHere && x[4] === 'sub');
    const key = navHere === 'ask' ? 'ask:' + TAB : sub ? 'details' : navHere;
    let cur = null;
    document.querySelectorAll('#nav-menu a').forEach(a => { const on = a.dataset.nav === key; a.classList.toggle('here', on); if (on) cur = a; });
    // Keep the current section's link in view inside the bar, without moving the page.
    const bar = $('#nav-menu');
    if (cur && bar.scrollWidth > bar.clientWidth) {
      const l = cur.offsetLeft - bar.offsetLeft, r = l + cur.offsetWidth;
      if (l < bar.scrollLeft || r > bar.scrollLeft + bar.clientWidth) bar.scrollTo({ left: Math.max(0, l - 24), behavior: 'smooth' });
    }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) { navHere = en.target.id; markHere(); } });
    }, { rootMargin: '-30% 0px -65% 0px' });
    [...new Set(NAV().map(x => x[0]))].forEach(id => { const n = document.getElementById(id); if (n) io.observe(n); });
  }
  ['#tab-search', '#tab-si'].forEach(s => $(s).addEventListener('click', markHere));

  /* ---------------- language switch ---------------- */
  const langBtn = $('#lang-toggle');

  const applyStatic = () => {
    const pl = LANG === 'pl';
    const k = pl ? 'pl' : 'en';
    document.documentElement.lang = k;
    document.title = L('IGNIS — Fire Safety Intelligence for Human Spaceflight', 'IGNIS — analiza bezpieczeństwa pożarowego w lotach załogowych');
    document.querySelectorAll('[data-en]').forEach(n => { n.textContent = n.dataset[k]; });
    document.querySelectorAll('[data-en-html]').forEach(n => { n.innerHTML = n.dataset[k + 'Html']; });
    document.querySelectorAll('[data-en-ph]').forEach(n => { n.placeholder = n.dataset[k + 'Ph']; });
    document.querySelectorAll('[data-en-al]').forEach(n => { n.setAttribute('aria-label', n.dataset[k + 'Al']); });
    langBtn.querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.lang === k));
    // keep the numeric fields in the locale's own notation
    [[svP, 3], [svO, 1]].forEach(([n, d]) => {
      const v = parseFloat(String(n.value).replace(',', '.'));
      if (isFinite(v)) n.value = fmt(v, d).replace(/[,.]0$/, '');
    });
  };

  const render = () => {
    renderPurpose(); renderNav(); renderNext(); renderSearch(); goTab(TAB, false);
    renderHero(); renderTakeaways(); renderAsk(); renderFunnel(); renderMap(); renderFlowMap(); renderAtlas(); renderTele(); solve(); renderPillars(); renderExport(); renderVerdict(); renderCampaign();
  };

  langBtn.onclick = () => {
    LANG = LANG === 'pl' ? 'en' : 'pl';
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* ignore */ }
    applyStatic();
    render();
  };

  applyStatic();
  render();
})();
