(function () {
  'use strict';
  var cv = document.getElementById('c'), c = cv.getContext('2d'), S = 900;
  var wind = document.getElementById('wind');
  var RULES = [
    ['F[+X]F[-X]+X', 'F[-X][+X]FX', 'F-[[X]+X]+F[+FX]-X', 'F[+X][-X]FX'],
  ];
  var LEAF = [['#c8553d', '#d98a3d', '#e3b04b'], ['#5e8c61', '#8fa85a', '#b9c46a'], ['#c96f8f', '#e3a1b5', '#f2d0da'], ['#4f7c8a', '#7aa6b0', '#b7d3d6']];
  var trees, t0, sky, ground;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function grow(n) {
    var s = 'X';
    for (var i = 0; i < n; i++) {
      var o = '';
      for (var j = 0; j < s.length; j++) {
        var ch = s[j];
        if (ch === 'X') o += RULES[0][Math.floor(Math.random() * RULES[0].length)];
        else if (ch === 'F') o += Math.random() < .85 ? 'FF' : 'F';
        else o += ch;
      }
      s = o;
    }
    return s;
  }
  function plant(x) {
    var n = Math.random() < .5 ? 5 : 6, str = grow(n), leaves = LEAF[Math.floor(Math.random() * LEAF.length)];
    var h = rnd(.42, .62) * S, len = h / Math.pow(2, n) * rnd(.9, 1.25);
    return { x: x, str: str, len: len, ang: rnd(18, 28) * Math.PI / 180, lean: rnd(-.08, .08), phase: rnd(0, 6), leaves: leaves, born: performance.now(), speed: rnd(.9, 1.3) };
  }
  function scene() {
    var hue = Math.floor(rnd(0, 4));
    sky = [['#f6efe4', '#efd9c6'], ['#eef1ec', '#d9e3dc'], ['#f3ece6', '#e6d3d8'], ['#eef0f3', '#d6dde6']][hue];
    ground = ['#d9cdb9', '#c9d1bd', '#dcc9c4', '#c8ccd3'][hue];
    trees = [];
    var k = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < k; i++) trees.push(plant(S * (i + .5) / k + rnd(-40, 40)));
    t0 = performance.now();
  }
  function drawTree(tr, now) {
    var age = (now - tr.born) / 1000 * tr.speed, reach = age * 55; // segments of path length revealed
    var w = wind.value / 100, t = now / 1000;
    var x = tr.x, y = S * .86, a = -Math.PI / 2 + tr.lean, d = 0, depth = 0, stack = [], segs = [], tips = [];
    var str = tr.str;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === 'F') {
        if (d > reach) continue;
        var sway = w * .045 * Math.sin(t * 1.3 + tr.phase + depth * .7) * (1 + depth * .35);
        a += sway * .25;
        var nx = x + Math.cos(a) * tr.len, ny = y + Math.sin(a) * tr.len;
        segs.push([x, y, nx, ny, depth]); x = nx; y = ny; d++;
      } else if (ch === '+') a += tr.ang; else if (ch === '-') a -= tr.ang;
      else if (ch === '[') { stack.push([x, y, a, d, depth]); depth++; }
      else if (ch === ']') { if (d <= reach && depth > 2) tips.push([x, y, depth]); var p = stack.pop(); x = p[0]; y = p[1]; a = p[2]; d = p[3]; depth = p[4]; }
    }
    c.lineCap = 'round';
    for (var s = 0; s < segs.length; s++) {
      var g = segs[s];
      c.strokeStyle = 'rgba(58,46,38,' + (0.95 - g[4] * .06) + ')';
      c.lineWidth = Math.max(.6, 9 / (1 + g[4] * 1.1));
      c.beginPath(); c.moveTo(g[0], g[1]); c.lineTo(g[2], g[3]); c.stroke();
    }
    var leafA = Math.min(1, Math.max(0, (age * 55 - 40) / 60));
    for (var l = 0; l < tips.length; l++) {
      var tp = tips[l]; c.globalAlpha = leafA * .8;
      c.fillStyle = tr.leaves[(l * 7 + tp[2]) % 3];
      c.beginPath(); c.arc(tp[0], tp[1], 2.2 + (l % 3), 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }
  function frame(now) {
    var g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    c.fillStyle = ground; c.beginPath(); c.moveTo(0, S * .86);
    for (var x = 0; x <= S; x += 30) c.lineTo(x, S * .86 + Math.sin(x * .01) * 6);
    c.lineTo(S, S); c.lineTo(0, S); c.fill();
    trees.forEach(function (tr) { drawTree(tr, now); });
    requestAnimationFrame(frame);
  }
  cv.addEventListener('pointerdown', function (e) {
    var r = cv.getBoundingClientRect(); trees.push(plant((e.clientX - r.left) / r.width * S));
    if (trees.length > 7) trees.shift();
  });
  document.getElementById('regen').onclick = scene;
  document.getElementById('dl').onclick = function () { var a = document.createElement('a'); a.download = 'petit-wind-trees.png'; a.href = cv.toDataURL('image/png'); a.click(); };
  scene(); requestAnimationFrame(frame);
})();
