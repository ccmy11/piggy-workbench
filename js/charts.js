/* charts.js — 零依赖 SVG 图表（ring/bars/line/ratio） */
(function () {
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // 环形进度：ratio 0~1，color，size 直径
  function ring(ratio, color, size, label) {
    size = size || 74;
    const r = (size - 10) / 2, c = 2 * Math.PI * r;
    ratio = Math.max(0, Math.min(1, ratio || 0));
    const dash = (ratio * c).toFixed(1);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="7"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round" ' +
      'stroke-dasharray="' + dash + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-size="' + Math.round(size / 4.6) + '" font-weight="700" fill="currentColor">' + esc(label) + '</text>' +
      '</svg>';
  }

  // 柱状图：data=[{label, val}]，h 高度
  function bars(data, color, h) {
    h = h || 120;
    const w = 300, n = data.length || 1, gap = 12;
    const bw = Math.min(34, (w - gap * (n + 1)) / n);
    const max = Math.max.apply(null, data.map(function (d) { return d.val; }).concat([1]));
    let out = '<svg width="100%" viewBox="0 0 ' + w + ' ' + (h + 22) + '" preserveAspectRatio="xMidYMid meet">';
    data.forEach(function (d, i) {
      const x = gap + i * ((w - gap) / n) + ((w - gap) / n - bw) / 2;
      const bh = Math.max(3, (d.val / max) * (h - 14));
      const y = h - bh;
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="5" fill="' + (d.val > 0 ? color : "var(--line)") + '"/>';
      if (d.val > 0) out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="9.5" fill="currentColor" opacity=".75">' + esc(d.tip || d.val) + '</text>';
      out += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (h + 15) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">' + esc(d.label) + '</text>';
    });
    return out + '</svg>';
  }

  // 折线图：pts=[{label,val}]（按时间升序）
  function line(pts, color, h) {
    h = h || 130;
    const w = 300, padL = 34, padR = 10, padT = 12, padB = 22;
    if (pts.length === 0) return "";
    if (pts.length === 1) pts = [pts[0], pts[0]];
    const vals = pts.map(function (p) { return p.val; });
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max += 1; min -= 1; }
    const span = max - min;
    const X = function (i) { return padL + i * ((w - padL - padR) / (pts.length - 1)); };
    const Y = function (v) { return padT + (1 - (v - min) / span) * (h - padT - padB); };
    let path = "", dots = "", grid = "";
    pts.forEach(function (p, i) {
      path += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.val).toFixed(1) + " ";
      dots += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.val).toFixed(1) + '" r="3.2" fill="' + color + '"/>';
    });
    [min, max].forEach(function (v) {
      grid += '<text x="' + (padL - 5) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end" font-size="9.5" fill="currentColor" opacity=".55">' + esc(v) + '</text>';
    });
    return '<svg width="100%" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + grid +
      '<text x="' + X(0).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">' + esc(pts[0].label) + '</text>' +
      '<text x="' + X(pts.length - 1).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">' + esc(pts[pts.length - 1].label) + '</text>' +
      '</svg>';
  }

  // 占比条：items=[{label, val, color}]
  function ratio(items) {
    let segW = 0;
    const total = items.reduce(function (s, it) { return s + it.val; }, 0) || 1;
    let seg = "", legend = "";
    items.forEach(function (it) {
      const pct = it.val / total * 100;
      seg += '<rect x="' + segW.toFixed(3) + '" y="0" width="' + (pct).toFixed(3) + '" height="14" fill="' + it.color + '"/>';
      segW += pct;
    });
    items.forEach(function (it) {
      const pct = it.val / total * 100;
      legend += '<div class="lg-row"><span class="lg-dot" style="background:' + it.color + '"></span>' +
        '<span class="lg-name">' + esc(it.label) + '</span><span class="lg-val">' + pct.toFixed(1) + '% · ' + esc(it.val) + '</span></div>';
    });
    return '<svg width="100%" viewBox="0 0 100 14" preserveAspectRatio="none" style="border-radius:7px;display:block"><rect x="0" y="0" width="100" height="14" fill="var(--line)"/>' + seg + '</svg>' +
      '<div class="lg-list" style="margin-top:10px">' + legend + '</div>';
  }

  window.Charts = { ring: ring, bars: bars, line: line, ratio: ratio };
  if (typeof module !== "undefined") module.exports = window.Charts;
})();
