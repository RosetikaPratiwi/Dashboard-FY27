/* Contract Monitoring Dashboard FY27 - vanilla JS + Chart.js. Data: data/data.json */
(function () {
  'use strict';
  var C = { navy: '#1F3A5F', green: '#16A34A', amber: '#F59E0B', red: '#DC2626', blue: '#2563EB' };
  var STAT = ['On Progress', 'Committed', 'Booked', 'Abandoned'];
  var STC = [C.amber, C.blue, C.green, C.red];
  var D = null, charts = {}, S = { pic: null, period: 'all' };
  var mapImg = new Image();
  mapImg.src = 'assets/indonesia-map.png';
  mapImg.onload = function () { if (charts.cMap) charts.cMap.update(); };

  /* Real map: Natural Earth country shapes (world-atlas) drawn with the same bounds as the bubble axes.
     If the file cannot be loaded, the old picture assets/indonesia-map.png is used instead. */
  var GEO = null, geoCache = null;
  var X0 = 94, X1 = 142, Y0 = -11.5, Y1 = 6.5;
  var polysOf = function (f) { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; };
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
    .then(function (r) { return r.json(); })
    .then(function (t) {
      GEO = window.topojson.feature(t, t.objects.countries).features.filter(function (f) {
        return polysOf(f).some(function (poly) { return poly[0].some(function (p) { return p[0] > 90 && p[0] < 146 && p[1] > -15 && p[1] < 10; }); });
      });
      geoCache = null;
      if (charts.cMap) charts.cMap.update();
    })
    .catch(function () { GEO = null; });

  function buildMap(w, h, dpr) {
    var c = document.createElement('canvas');
    c.width = w * dpr; c.height = h * dpr;
    var x = c.getContext('2d');
    x.scale(dpr, dpr);
    var px = function (lon) { return (lon - X0) / (X1 - X0) * w; };
    var py = function (lat) { return (Y1 - lat) / (Y1 - Y0) * h; };
    x.fillStyle = '#EAF2F9'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 1; x.fillStyle = '#8A99AE'; x.font = '10px system-ui,sans-serif'; x.textAlign = 'left';
    for (var lon = 95; lon <= 140; lon += 5) { x.beginPath(); x.moveTo(px(lon), 0); x.lineTo(px(lon), h); x.stroke(); x.fillText(lon + '°E', px(lon) + 3, h - 4); }
    for (var lat = 5; lat >= -10; lat -= 5) { x.beginPath(); x.moveTo(0, py(lat)); x.lineTo(w, py(lat)); x.stroke(); x.fillText(lat > 0 ? lat + '°N' : lat < 0 ? -lat + '°S' : '0°', 3, py(lat) - 3); }
    x.lineJoin = 'round'; x.lineWidth = 0.6; x.strokeStyle = '#8FA0B8';
    GEO.forEach(function (f) {
      x.fillStyle = f.properties.name === 'Indonesia' ? '#CBD5E1' : '#E4E9F0';
      x.beginPath();
      polysOf(f).forEach(function (poly) {
        poly.forEach(function (ring) {
          ring.forEach(function (p, i) { if (i) x.lineTo(px(p[0]), py(p[1])); else x.moveTo(px(p[0]), py(p[1])); });
          x.closePath();
        });
      });
      x.fill('evenodd'); x.stroke();
    });
    x.fillStyle = '#7B8BA3'; x.font = '600 10px system-ui,sans-serif'; x.textAlign = 'center';
    [['SUMATRA', 101.2, -0.6], ['KALIMANTAN', 114, 0.4], ['JAVA', 110.3, -9.1], ['SULAWESI', 121.4, -1.9], ['MALUKU', 128.6, -5.3], ['PAPUA', 138.3, -4.9], ['NUSA TENGGARA', 119, -10.4]]
      .forEach(function (l) { x.fillText(l[0], px(l[1]), py(l[2])); });
    return { w: w, h: h, c: c };
  }
  function drawMap(ch) {
    var a = ch.chartArea, w = Math.round(a.width), h = Math.round(a.height);
    if (!GEO) { if (mapImg.complete && mapImg.naturalWidth) ch.ctx.drawImage(mapImg, a.left, a.top, a.width, a.height); return; }
    if (!geoCache || geoCache.w !== w || geoCache.h !== h) geoCache = buildMap(w, h, window.devicePixelRatio || 1);
    ch.ctx.drawImage(geoCache.c, a.left, a.top, a.width, a.height);
  }
  try { S = Object.assign(S, JSON.parse(localStorage.getItem('dash.state'))); } catch (e) { /* ignore */ }

  var $ = function (id) { return document.getElementById(id); };
  var sum = function (a, f) { return a.reduce(function (s, r) { return s + f(r); }, 0); };
  var pct = function (x, d) { return (x * 100).toFixed(d || 0) + '%'; };
  var num = function (v) { return Math.round(v).toLocaleString('en-US'); };
  var bucket = function (p) { return p < 0.4 ? C.red : p < 0.8 ? C.amber : C.green; };
  var tickM = function (v) { return v / 1e9 + 'B'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function money(v) {
    if (v >= 1e9) return 'IDR ' + +(v / 1e9).toFixed(2) + ' B';
    if (v >= 1e6) return 'IDR ' + +(v / 1e6).toFixed(1) + ' M';
    return 'IDR ' + num(v);
  }
  function cards(id, list) {
    $(id).innerHTML = list.map(function (c) {
      return '<div class="card" style="border-top-color:' + c[3] + '"><small>' + c[0] + '</small><b>' + c[1] + '</b><span>' + c[2] + '</span></div>';
    }).join('');
  }
  function mk(id, cfg) {
    if (!window.Chart) return;
    if (charts[id]) charts[id].destroy();
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }, cfg.options);
    charts[id] = new window.Chart($(id), cfg);
  }

  var COLS = [['Oppty No', 'oppty'], ['PIC', 'pic'], ['BU', 'bu'], ['Modality', 'modality'], ['Equipment No', 'eqNo'], ['Serial No', 'serial'],
    ['Ship to Party', 'shipTo'], ['End Customer', 'customer'], ['Status', 'status'], ['Progress (%)', 'progress', function (v) { return Math.round(v * 100) + '%'; }],
    ['SLA', 'sla'], ['Value / Year', 'valueYear', num], ['Contract Period', 'contractPeriod'], ['Total Value', 'totalValue', num],
    ['Margin', 'margin'], ['Vertical Hospital', 'vertical'], ['City', 'city']];

  function renderTable(rows) {
    var t = $('tbl');
    t.textContent = '';
    var tr = t.createTHead().insertRow();
    COLS.forEach(function (c) { var th = document.createElement('th'); th.textContent = c[0]; tr.appendChild(th); });
    var tb = t.createTBody();
    rows.slice(0, 400).forEach(function (r) {
      var row = tb.insertRow();
      COLS.forEach(function (c) {
        var v = r[c[1]];
        row.insertCell().textContent = (v === null || v === undefined || v === '') ? '–' : (c[2] ? c[2](v) : v);
      });
    });
    var f = t.createTFoot().insertRow();
    COLS.forEach(function (c, i) {
      var v = '';
      if (i === 0) v = 'TOTAL (' + rows.length + ' rows)';
      if (c[1] === 'progress') v = rows.length ? pct(sum(rows, function (r) { return r.progress; }) / rows.length) : '–';
      if (c[1] === 'valueYear' || c[1] === 'totalValue') v = num(sum(rows, function (r) { return r[c[1]]; }));
      f.insertCell().textContent = v;
    });
    $('tblInfo').textContent = 'Showing ' + Math.min(rows.length, 400) + ' of ' + rows.length + ' rows';
  }

  function render() {
    if (!D) return;
    var q = D.quotations;
    var byP = q.filter(function (r) { return S.period === 'all' || r.period === S.period; });
    var rows = byP.filter(function (r) { return !S.pic || r.pic === S.pic; });
    var allPics = Array.from(new Set(q.map(function (r) { return r.pic; }))).sort();
    if (S.pic && allPics.indexOf(S.pic) < 0) S.pic = null;
    var pics = S.pic ? [S.pic] : allPics;
    var ps = $('picSel');
    ps.innerHTML = '<option value="">All PIC</option>' + allPics.map(function (p) {
      return '<option value="' + esc(p) + '">' + esc(p) + ' · ' + byP.filter(function (r) { return r.pic === p; }).length + ' unit</option>';
    }).join('');
    ps.value = S.pic || '';

    $('title').textContent = 'Contract Monitoring Dashboard FY27 • ' + (S.pic ? 'PIC: ' + S.pic : 'All PIC');
    var box = $('pics');
    box.textContent = '';
    allPics.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = p === S.pic ? 'on' : '';
      b.textContent = p + ' · ' + byP.filter(function (r) { return r.pic === p; }).length + ' unit';
      b.onclick = function () { S.pic = S.pic === p ? null : p; save(); render(); };
      box.appendChild(b);
    });

    /* quotation value cards */
    var tot = sum(rows, function (r) { return r.totalValue; });
    var val = STAT.map(function (s) { return rows.filter(function (r) { return r.status === s; }); });
    var tgOf = function (arr) { return S.pic ? 0 : S.period === 'all' ? sum(arr, function (x) { return x; }) : arr[+S.period.slice(1) - 1]; };
    var tgB = tgOf(D.targets.booked), tgC = tgOf(D.targets.committed);
    var nq = new Set(rows.map(function (r) { return r.oppty; }).filter(Boolean)).size;
    var tgt = function (v, t) { return t ? ' • target ' + money(t) + ' (' + pct(v / t) + ')' : ''; };
    var sv = val.map(function (a) { return sum(a, function (r) { return r.totalValue; }); });
    var avgP = val[0].length ? pct(sum(val[0], function (r) { return r.progress; }) / val[0].length) : '–';
    cards('cardsQ', [
      ['Total Value', money(tot), nq + ' quotation • ' + rows.length + ' equipment', C.navy],
      ['On Progress', money(sv[0]), val[0].length + ' unit • avg progress ' + avgP, C.amber],
      ['Committed', money(sv[1]), val[1].length + ' unit' + tgt(sv[1], tgC), C.blue],
      ['Booked', money(sv[2]), val[2].length + ' unit' + tgt(sv[2], tgB), C.green],
      ['Abandoned', money(sv[3]), val[3].length + ' unit', C.red]]);

    /* revenue cards */
    var perP = [];
    for (var i = 1; i <= 12; i++) {
      perP.push(sum(q.filter(function (r) { return r.status === 'Booked' && r.period === 'P' + i && (!S.pic || r.pic === S.pic); }), function (r) { return r.totalValue; }));
    }
    var best = perP.indexOf(Math.max.apply(null, perP));
    cards('cardsR', [
      ['Total Revenue', money(sv[2]), val[2].length + ' unit Booked', C.navy],
      ['% of Total Value', tot ? pct(sv[2] / tot, 1) : '–', 'from ' + money(tot) + ' total value', C.navy],
      ['Target Achievement', tgB ? pct(sv[2] / tgB) : '–', tgB ? 'target Booked ' + money(tgB) : 'available for All PIC', C.blue],
      ['Avg Revenue / Unit', val[2].length ? money(sv[2] / val[2].length) : '–', 'per equipment Booked', C.amber],
      ['Best Period', perP[best] > 0 ? 'P' + (best + 1) : '–', perP[best] > 0 ? money(perP[best]) : 'no Booked yet', C.green]]);

    /* stage + average progress */
    var th = [0.2, 0.4, 0.6, 0.8, 1];
    mk('cStage', { type: 'bar', data: { labels: ['Screening Budget Cust', 'Offering Quot', 'Presentation Onsite', 'Negotiation Quot', 'Final PO'],
      datasets: [{ data: th.map(function (t) { return rows.filter(function (r) { return r.progress >= t - 0.001; }).length; }), backgroundColor: C.navy }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
    var avgs = pics.map(function (p) { var a = byP.filter(function (r) { return r.pic === p; }); return a.length ? sum(a, function (r) { return r.progress; }) / a.length : 0; });
    mk('cAvg', { type: 'bar', data: { labels: pics, datasets: [{ data: avgs, backgroundColor: avgs.map(bucket) }] },
      options: { indexAxis: 'y', scales: { x: { min: 0, max: 1, ticks: { callback: function (v) { return v * 100 + '%'; } } } } } });

    /* revenue charts */
    var T = D.targets.booked;
    var labels = perP.map(function (_, i) { return 'P' + (i + 1); });
    mk('cPer', { type: 'bar', data: { labels: labels, datasets: [
      { label: 'Revenue (Booked)', data: perP, backgroundColor: C.green },
      { type: 'line', label: 'Target Booked', data: perP.map(function (_, i) { return S.pic ? null : T[i]; }), borderColor: C.navy, borderDash: [6, 4], pointBackgroundColor: C.navy, pointRadius: 3 }] },
      options: { scales: { y: { min: 0, ticks: { callback: tickM } } }, plugins: { legend: { display: true, position: 'bottom' } } } });
    mk('cPic', { type: 'bar', data: { labels: pics, datasets: [{ data: pics.map(function (p) { return sum(byP.filter(function (r) { return r.pic === p && r.status === 'Booked'; }), function (r) { return r.totalValue; }); }), backgroundColor: C.green }] },
      options: { indexAxis: 'y', scales: { x: { ticks: { callback: tickM } } } } });
    mk('cStat', { type: 'doughnut', data: { labels: STAT, datasets: [{ data: sv, backgroundColor: STC, borderColor: '#fff' }] },
      options: { cutout: '58%', plugins: { legend: { display: true, position: 'right' } } } });
    var qs = [0, 1, 2, 3].map(function (k) { return perP[k * 3] + perP[k * 3 + 1] + perP[k * 3 + 2]; });
    mk('cQtr', { type: 'bar', data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [
      { label: 'Revenue (Booked)', data: qs, backgroundColor: C.green },
      { type: 'line', label: 'Target Booked', data: qs.map(function (_, k) { return S.pic ? null : T[k * 3] + T[k * 3 + 1] + T[k * 3 + 2]; }), borderColor: C.navy, borderDash: [6, 4], pointBackgroundColor: C.navy, pointRadius: 4 }] },
      options: { scales: { y: { min: 0, ticks: { callback: tickM } } }, plugins: { legend: { display: true, position: 'bottom' } } } });

    /* map */
    var g = {};
    rows.forEach(function (r) {
      var c = D.cities[r.city];
      if (!c) return;
      var key = c[2] || r.city;
      var o = g[key] = g[key] || { n: 0, v: 0, p: 0, c: c };
      o.n++; o.v += r.totalValue; o.p += r.progress;
    });
    var cities = Object.keys(g);
    var mapped = sum(cities, function (k) { return g[k].n; });
    mk('cMap', { type: 'bubble', data: { datasets: [{
      data: cities.map(function (k) { var o = g[k]; return { x: o.c[1], y: o.c[0], r: Math.min(9, 2.5 + 1.4 * Math.sqrt(o.v / 1e9)), l: k + ' • progress ' + pct(o.p / o.n) + ' • ' + o.n + ' unit • ' + money(o.v) }; }),
      backgroundColor: cities.map(function (k) { return bucket(g[k].p / g[k].n) + 'CC'; }), borderColor: '#fff', borderWidth: 1 }] },
      options: { layout: { padding: 0 }, elements: { point: { hoverRadius: 2 } }, scales: { x: { min: 94, max: 142, display: false }, y: { min: -11.5, max: 6.5, display: false } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.raw.l; } } } } },
      plugins: [{ id: 'bg', beforeDraw: drawMap }] });
    cards('mapCards', [['Quotation Mapped (unit)', mapped, '', C.navy], ['Not Mapped (unit)', rows.length - mapped, '', C.navy], ['Active Cities', cities.length, '', C.navy]]);

    /* service contracts */
    var kr = (D.thresholds && D.thresholds.kritis) || 30, wr = (D.thresholds && D.thresholds.warning) || 90;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cnt = [0, 0, 0];
    D.contracts.forEach(function (c) {
      if (S.pic && c.pic !== S.pic) return;
      var d = Math.ceil((new Date(c.end) - today) / 864e5);
      if (isNaN(d) || d < 0) return;
      cnt[d <= kr ? 0 : d <= wr ? 1 : 2]++;
    });
    var total = cnt[0] + cnt[1] + cnt[2], urgent = cnt[0] + cnt[1];
    mk('cSvc', { type: 'doughnut', data: { labels: ['Critical', 'Warning', 'Safe'], datasets: [{ data: cnt, backgroundColor: [C.red, C.amber, C.green], borderColor: '#fff' }] }, options: { cutout: '72%' } });
    $('svcTotal').textContent = total;
    $('svcLegend').innerHTML = [['Critical (≤ ' + kr + ' days)', C.red], ['Warning (≤ ' + wr + ' days)', C.amber], ['Safe (> ' + wr + ' days)', C.green]].map(function (l, i) {
      return '<div><b style="color:' + l[1] + '">' + cnt[i] + '</b>' + l[0] + '</div>';
    }).join('');
    $('svcPanel').innerHTML = '<small class="muted">NEEDS RENEWAL SOON • ' + (S.pic ? 'PIC: ' + esc(S.pic) : 'ALL PIC') + '</small><b>' + urgent + ' equipment</b>' +
      (urgent ? 'Contracts ending within ' + wr + ' days: ' + cnt[0] + ' Critical and ' + cnt[1] + ' Warning. Ask the customer for renewal soon.' : 'No contract ends within ' + wr + ' days. All active contracts are Safe.');

    renderTable(rows);
  }

  function save() {
    try { localStorage.setItem('dash.state', JSON.stringify(S)); } catch (e) { /* ignore */ }
    $('period').value = S.period;
    $('periodLbl') && ($('periodLbl').textContent = '');
  }

  function load() {
    $('sync').textContent = 'Loading…';
    return fetch('data/data.json?v=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        D = d;
        $('sync').textContent = 'Synced ' + new Date().toLocaleString('en-GB') + ' | ' + D.quotations.length + ' rows | data updated ' + (D.updated || '–');
        render();
      })
      .catch(function () { $('sync').textContent = 'Could not load data/data.json. Showing the last data.'; });
  }

  var sel = $('period');
  sel.innerHTML = '<option value="all">All Periods</option>' + Array.from({ length: 12 }, function (_, i) { return '<option value="P' + (i + 1) + '">P' + (i + 1) + '</option>'; }).join('');
  sel.value = S.period;
  sel.onchange = function () { S.period = sel.value; save(); render(); };
  $('picSel').onchange = function () { S.pic = this.value || null; save(); render(); };
  $('reset').onclick = function () { S.pic = null; S.period = 'all'; save(); render(); };
  $('refresh').onclick = load;
  if (window.Auth) {
    $('whoami').textContent = 'Signed in as ' + Auth.user();
    $('logout').onclick = function () { Auth.logout(); };
  }
  load();
  setInterval(load, 10 * 60 * 1000);
})();
