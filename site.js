// Project site: fills every [data-k] number from app/data/dataset.js so the pages never drift
// from the dashboard, and reveals sections on scroll. The HTML carries the same numbers as a
// fallback for no-JS readers and link previews.
(() => {
  const D = window.DATASET;
  const fmt = n => Number(n).toLocaleString('en-US');
  const pct = (a, b) => `${+(a * 100).toFixed(1)}-${+(b * 100).toFixed(1)}%`;
  const bar = (a, b) => a === b || a.toFixed(2) === b.toFixed(2) ? `${a.toFixed(2)} bar` : `${a.toFixed(2)}-${b.toFixed(2)} bar`;

  if (D) {
    const solid = D.testpoints.filter(t => t.ph === 'solid');
    const F = D.funnel, M = D.meta, C = D.challenge;
    const K = {
      ceil: D.pillars.prevention.solid_ceiling_pct,
      chO2: +(C.o2_frac * 100).toFixed(0),
      psi: C.pressure_psi,
      gap: C.gap_pp,
      solid: fmt(solid.length),
      at30: solid.filter(t => t.o2 != null && t.o2 >= C.o2_frac).length,
      tp: fmt(M.testpoints), inv: M.investigations, tables: M.tables,
      files: fmt(M.files), gb: M.gigabytes,
      published: fmt(F.published_rows), rejected: fmt(F.rejected_rows), kept: fmt(F.rows_kept),
      bre_rows: F.bre_rows, bre_points: F.bre_points,
      tests: D.campaign.tests,
    };
    document.querySelectorAll('[data-k]').forEach(el => {
      if (K[el.dataset.k] != null) el.textContent = K[el.dataset.k];
    });

    const causes = document.getElementById('causes');
    if (causes) {
      const label = { blank: 'empty rows', unmapped_tables: 'unmapped tables', summary_sheet: 'summary sheet', saffire: 'Saffire non-test rows' };
      causes.innerHTML = Object.entries(F.rejected_by_cause)
        .map(([k, n]) => `<li><span>${label[k] || k}</span><span>${fmt(n)}</span></li>`).join('');
    }

    const solidRows = document.getElementById('solid-rows');
    if (solidRows) {
      solidRows.innerHTML = D.investigations
        .filter(v => v.phase === 'solid')
        .sort((a, b) => b.rows - a.rows)
        .map(v => `<tr><td>${v.acronym} <span class="sub">${v.id}</span></td>
          <td class="n">${fmt(v.rows)}</td>
          <td class="n">${v.o2 ? pct(v.o2[0], v.o2[1]) : '<span class="dim">not recorded</span>'}</td>
          <td class="n">${v.p ? bar(v.p[0], v.p[1]) : '<span class="dim">not in table</span>'}</td></tr>`).join('');
    }
  }

  // Film: a poster until clicked, so YouTube loads nothing (and sets no cookies) before the viewer asks.
  document.querySelectorAll('a[data-yt]').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0&modestbranding=1`;
    f.title = 'IGNIS, 30-second film';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    a.replaceChildren(f);
    a.removeAttribute('href');
  }));

  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(e => io.observe(e));
})();
