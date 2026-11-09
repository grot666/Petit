(function () {
  'use strict';
  var cv = document.getElementById('c'), c = cv.getContext('2d'), S = 900;
  cv.width = cv.height = S;
  var PAL = {
    cathedral: ['#1f4e8c', '#b0283a', '#e0a526', '#2f7a4f', '#6b3b8c', '#2a8fbf', '#d9622b'],
    sea: ['#7fb7be', '#a8d5c2', '#4f8a8b', '#d7eadf', '#92b6d5', '#3f6e7a', '#c4dfe6'],
    autumn: ['#a63d2b', '#d98a3d', '#e3b04b', '#7a5c3a', '#b8742a', '#6e7a3a', '#c8553d'],
    candy: ['#f28fb0', '#f7c873', '#8fd3c8', '#b39ddb', '#f5a37a', '#9ad0f5', '#f2e28f']
  };
  var seeds, palSel = document.getElementById('pal'), G = 12, cell = S / G;
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function color() { var p = PAL[palSel.value]; return hex(p[Math.floor(Math.random() * p.length)]); }
  function regen() {
    seeds = [];
    for (var gy = 0; gy < G; gy++) for (var gx = 0; gx < G; gx++)
      seeds.push({ x: (gx + .1 + Math.random() * .8) * cell, y: (gy + .1 + Math.random() * .8) * cell, col: color(), n: Math.random() });
    render();
  }
  function recolor() { seeds.forEach(function (s) { s.col = color(); }); render(); }
  function render() {
    var buckets = [];
    for (var i = 0; i < G * G; i++) buckets.push([]);
    seeds.forEach(function (s) { buckets[Math.min(G - 1, Math.floor(s.y / cell)) * G + Math.min(G - 1, Math.floor(s.x / cell))].push(s); });
    var img = c.createImageData(S, S), d = img.data, lead = 3.2, frame = 26;
    for (var y = 0; y < S; y++) {
      var by = Math.floor(y / cell);
      for (var x = 0; x < S; x++) {
        var j = (y * S + x) * 4;
        if (x < frame || y < frame || x >= S - frame || y >= S - frame) { var f = 40 + ((x + y) % 7); d[j] = f; d[j + 1] = f - 4; d[j + 2] = f - 8; d[j + 3] = 255; continue; }
        var bx = Math.floor(x / cell), d1 = 1e9, d2 = 1e9, s1 = null;
        for (var oy = -2; oy <= 2; oy++) { var yy = by + oy; if (yy < 0 || yy >= G) continue;
          for (var ox = -2; ox <= 2; ox++) { var xx = bx + ox; if (xx < 0 || xx >= G) continue;
            var b = buckets[yy * G + xx];
            for (var k = 0; k < b.length; k++) { var s = b[k], dx = s.x - x, dy = s.y - y, dd = dx * dx + dy * dy;
              if (dd < d1) { d2 = d1; d1 = dd; s1 = s; } else if (dd < d2) d2 = dd; } } }
        var r1 = Math.sqrt(d1), r2 = Math.sqrt(d2), edge = (r2 - r1) / 2;
        if (edge < lead) { var lv = 38 + edge * 6; d[j] = lv; d[j + 1] = lv - 2; d[j + 2] = lv - 4; d[j + 3] = 255; continue; }
        var cx = x - S / 2, cy = y - S * .35, light = 1.15 - Math.sqrt(cx * cx + cy * cy) / S * .9;
        var rim = Math.min(1, (edge - lead) / 14), tex = .93 + .07 * Math.sin(x * .09 + s1.n * 9) * Math.sin(y * .07 + s1.n * 5) + (Math.random() - .5) * .05;
        var m = light * (0.72 + .28 * rim) * tex;
        d[j] = Math.min(255, s1.col[0] * m + 18 * rim); d[j + 1] = Math.min(255, s1.col[1] * m + 18 * rim); d[j + 2] = Math.min(255, s1.col[2] * m + 18 * rim); d[j + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  }
  cv.addEventListener('pointerdown', function (e) {
    var r = cv.getBoundingClientRect();
    seeds.push({ x: (e.clientX - r.left) / r.width * S, y: (e.clientY - r.top) / r.height * S, col: color(), n: Math.random() });
    render();
  });
  document.getElementById('regen').onclick = regen;
  palSel.onchange = recolor;
  document.getElementById('dl').onclick = function () { var a = document.createElement('a'); a.download = 'petit-stained-glass.png'; a.href = cv.toDataURL('image/png'); a.click(); };
  regen();
})();
