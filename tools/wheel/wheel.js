(function () {
  'use strict';
  var cv = document.getElementById('w'), c = cv.getContext('2d'), S = 760, ta = document.getElementById('opts'), res = document.getElementById('result');
  var COLORS = ['#c8553d', '#d2a645', '#5e8c61', '#4f7c8a', '#8a6fb0', '#d98a3d', '#7aa6b0', '#b9c46a', '#c96f8f', '#6f665b'];
  var PRE = {
    food: '面条 Noodles\n饺子 Dumplings\n火锅 Hotpot\n沙拉 Salad\n汉堡 Burger\n寿司 Sushi\n麻辣烫 Malatang\n煲仔饭 Claypot rice',
    yn: 'Yes 是\nNo 否\nYes 是\nNo 否', dice: '1\n2\n3\n4\n5\n6', who: '我 Me\n你 You\n他 Him\n她 Her\nAA 平分'
  };
  var KEY = 'petit.wheel.opts', angle = 0, spinning = false;
  try { ta.value = localStorage.getItem(KEY) || PRE.food; } catch (e) { ta.value = PRE.food; }
  function opts() { var o = ta.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); return o.length ? o : ['?']; }
  function draw() {
    var o = opts(), n = o.length, r = S / 2 - 8, seg = Math.PI * 2 / n;
    c.clearRect(0, 0, S, S); c.save(); c.translate(S / 2, S / 2); c.rotate(angle);
    for (var i = 0; i < n; i++) {
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * seg, (i + 1) * seg); c.closePath();
      var ci = i % COLORS.length; if (i === n - 1 && n > 1 && ci === 0) ci = 1; // avoid two neighbours sharing a colour
      c.fillStyle = COLORS[ci]; c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
      c.save(); c.rotate(i * seg + seg / 2); c.fillStyle = '#fff'; c.textAlign = 'right'; c.textBaseline = 'middle';
      var fs = Math.max(16, Math.min(34, 260 / Math.max(4, n))); c.font = '600 ' + fs + 'px -apple-system,Helvetica,Arial,sans-serif';
      var t = o[i]; while (c.measureText(t + '…').width > r - 90 && t.length > 1) t = t.slice(0, -1);
      if (t !== o[i]) t += '…';
      c.fillText(t, r - 22, 0); c.restore();
    }
    c.restore();
    c.beginPath(); c.arc(S / 2, S / 2, 34, 0, 7); c.fillStyle = '#faf8f4'; c.fill(); c.strokeStyle = '#2a2723'; c.lineWidth = 3; c.stroke();
  }
  function spin() {
    if (spinning) return; spinning = true; res.textContent = '…';
    var o = opts(), n = o.length, start = angle, extra = Math.PI * 2 * (5 + Math.random() * 3) + Math.random() * Math.PI * 2, dur = 4200, t0 = performance.now();
    function f(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      angle = start + extra * e; draw();
      if (p < 1) return requestAnimationFrame(f);
      spinning = false;
      var a = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2), idx = Math.floor(a / (Math.PI * 2 / n));
      res.textContent = '→ ' + o[idx];
    }
    requestAnimationFrame(f);
  }
  ta.addEventListener('input', function () { try { localStorage.setItem(KEY, ta.value); } catch (e) {} draw(); });
  document.getElementById('preset').onchange = function () { if (this.value) { ta.value = PRE[this.value]; ta.dispatchEvent(new Event('input')); this.value = ''; } };
  cv.addEventListener('click', spin);
  document.getElementById('spin').onclick = spin;
  document.addEventListener('keydown', function (e) { if (e.key === ' ' && e.target !== ta && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') { e.preventDefault(); spin(); } });
  draw();
})();
