(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ball = $('ball'), phaseEl = $('phase'), countEl = $('count'), go = $('go'), leftEl = $('left');
  var PATS = {
    box: [['in', 4], ['hold', 4], ['out', 4], ['hold2', 4]],
    '478': [['in', 4], ['hold', 7], ['out', 8]],
    calm: [['in', 5], ['out', 5]]
  };
  var NAMES = { in: 'Breathe in 吸气', hold: 'Hold 屏住', out: 'Breathe out 呼气', hold2: 'Hold 屏住' };
  var pat = 'box', running = false, raf, t0, endAt;
  document.querySelectorAll('#pat button').forEach(function (b) {
    b.onclick = function () { pat = b.dataset.p; document.querySelectorAll('#pat button').forEach(function (x) { x.classList.toggle('on', x === b); }); if (running) begin(); };
  });
  function begin() { running = true; t0 = performance.now(); var L = +$('len').value; endAt = L ? t0 + L * 1000 : 0; go.textContent = 'Stop 停止'; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  function end(msg) { running = false; cancelAnimationFrame(raf); phaseEl.textContent = msg || 'Ready 准备'; countEl.textContent = ''; ball.style.transform = 'scale(.4)'; go.textContent = 'Start 开始'; leftEl.textContent = ''; }
  function frame(now) {
    if (endAt && now >= endAt) return end('Done · 完成 🌿');
    var P = PATS[pat], cyc = P.reduce(function (a, p) { return a + p[1]; }, 0), t = ((now - t0) / 1000) % cyc, acc = 0, i = 0;
    while (i < P.length - 1 && t >= acc + P[i][1]) { acc += P[i][1]; i++; }
    var ph = P[i][0], f = (t - acc) / P[i][1], e = .5 - .5 * Math.cos(Math.PI * f), sc;
    if (ph === 'in') sc = .4 + .6 * e; else if (ph === 'out') sc = 1 - .6 * e; else if (ph === 'hold') sc = 1; else sc = .4;
    ball.style.transform = 'scale(' + sc.toFixed(3) + ')';
    phaseEl.textContent = NAMES[ph]; countEl.textContent = Math.ceil(P[i][1] - (t - acc));
    if (endAt) { var s = Math.ceil((endAt - now) / 1000); leftEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' left 剩余'; }
    raf = requestAnimationFrame(frame);
  }
  go.onclick = function () { if (running) end(); else begin(); };
})();
