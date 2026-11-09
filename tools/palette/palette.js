(function () {
  'use strict';
  var sw = document.getElementById('sw'), rule = document.getElementById('rule'), msg = document.getElementById('msg');
  var cols = [], locks = [false, false, false, false, false];
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  function lum(hex) { var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function R(a, b) { return a + Math.random() * (b - a); }
  function gen() {
    var h = R(0, 360), r = rule.value, out = [];
    for (var i = 0; i < 5; i++) {
      var hh, s = R(35, 75), l = 22 + i * 15 + R(-5, 5);
      if (r === 'analog') hh = h + (i - 2) * R(14, 24);
      else if (r === 'comp') hh = h + (i % 2 ? 180 : 0) + R(-10, 10);
      else if (r === 'triad') hh = h + (i % 3) * 120 + R(-8, 8);
      else if (r === 'mono') { hh = h; s = R(25, 60); }
      else { hh = R(0, 360); s = R(30, 85); l = R(20, 85); }
      out.push(hsl2hex(hh, s, Math.max(10, Math.min(92, l))));
    }
    if (r !== 'random' && Math.random() < .5) out.reverse();
    for (i = 0; i < 5; i++) if (!locks[i] || !cols[i]) cols[i] = out[i];
    paint();
    try { history.replaceState(null, '', '#' + cols.map(function (c) { return c.slice(1); }).join('-')); } catch (e) {}
  }
  function copy(t, what) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { msg.textContent = 'Copied 已复制 ' + what; }, function () { msg.textContent = t; });
  }
  function paint() {
    sw.innerHTML = '';
    cols.forEach(function (hex, i) {
      var d = document.createElement('div'); d.className = 'c'; d.style.background = hex; d.style.color = lum(hex) > .58 ? '#2a2723' : '#fff';
      var hx = document.createElement('button'); hx.type = 'button'; hx.className = 'hex'; hx.textContent = hex.toUpperCase(); hx.onclick = function () { copy(hex.toUpperCase(), hex.toUpperCase()); };
      var lk = document.createElement('button'); lk.type = 'button'; lk.textContent = locks[i] ? '🔒 Locked 已锁' : '🔓 Lock 锁定'; lk.setAttribute('aria-pressed', locks[i]);
      lk.onclick = function () { locks[i] = !locks[i]; paint(); };
      d.appendChild(hx); d.appendChild(lk); sw.appendChild(d);
    });
  }
  document.getElementById('gen').onclick = function () { gen(); this.blur(); };
  document.getElementById('copyall').onclick = function () { copy(cols.join(' ').toUpperCase(), 'all 5 colours 全部五个颜色'); };
  rule.onchange = gen;
  document.addEventListener('keydown', function (e) { if (e.key === ' ' && e.target.tagName !== 'SELECT') { e.preventDefault(); gen(); } });
  var m = location.hash.match(/^#([0-9a-f]{6}(-[0-9a-f]{6}){4})$/i);
  if (m) { cols = m[1].split('-').map(function (c) { return '#' + c.toLowerCase(); }); paint(); } else gen();
})();
