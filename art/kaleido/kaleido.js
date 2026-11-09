(function () {
  'use strict';
  var cv = document.getElementById('c'), c = cv.getContext('2d'), S = 900;
  cv.width = cv.height = S;
  var symEl = document.getElementById('sym'), autoBtn = document.getElementById('auto');
  var last = null, hue = Math.random() * 360, auto = false, at = 0;
  function clear() { c.fillStyle = '#121016'; c.fillRect(0, 0, S, S); }
  function seg(x0, y0, x1, y1) {
    var n = +symEl.value, cx = S / 2, cy = S / 2;
    var ax = x0 - cx, ay = y0 - cy, bx = x1 - cx, by = y1 - cy, w = Math.max(1.5, 7 - Math.hypot(bx - ax, by - ay) * .12);
    hue = (hue + .8) % 360;
    c.strokeStyle = 'hsla(' + hue + ',75%,62%,.85)'; c.lineWidth = w; c.lineCap = 'round';
    c.shadowColor = 'hsla(' + hue + ',90%,60%,.6)'; c.shadowBlur = 8;
    for (var i = 0; i < n; i++) {
      c.save(); c.translate(cx, cy); c.rotate(i * Math.PI * 2 / n);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.scale(1, -1); c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      c.restore();
    }
    c.shadowBlur = 0;
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S, (e.clientY - r.top) / r.height * S]; }
  cv.addEventListener('pointerdown', function (e) { last = pos(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) { if (!last) return; var p = pos(e); seg(last[0], last[1], p[0], p[1]); last = p; });
  cv.addEventListener('pointerup', function () { last = null; });
  cv.addEventListener('pointercancel', function () { last = null; });
  var ap = null;
  function tick() {
    if (auto) {
      at += .018;
      var r = 90 + 300 * (.5 + .5 * Math.sin(at * .37)) * (.6 + .4 * Math.sin(at * 1.7));
      var p = [S / 2 + Math.cos(at) * r, S / 2 + Math.sin(at * 1.3) * r * .6];
      if (ap) seg(ap[0], ap[1], p[0], p[1]); ap = p;
    }
    requestAnimationFrame(tick);
  }
  autoBtn.onclick = function () { auto = !auto; ap = null; autoBtn.textContent = auto ? 'Stop 停止' : 'Auto draw 自动画'; };
  document.getElementById('clear').onclick = clear;
  document.getElementById('dl').onclick = function () { var a = document.createElement('a'); a.download = 'petit-kaleidoscope.png'; a.href = cv.toDataURL('image/png'); a.click(); };
  clear();
  // a few seed strokes so the first view is not empty
  auto = true; for (var k = 0; k < 160; k++) { at += .018; var r = 90 + 300 * (.5 + .5 * Math.sin(at * .37)) * (.6 + .4 * Math.sin(at * 1.7)); var p = [S / 2 + Math.cos(at) * r, S / 2 + Math.sin(at * 1.3) * r * .6]; if (ap) seg(ap[0], ap[1], p[0], p[1]); ap = p; }
  auto = false; ap = null;
  requestAnimationFrame(tick);
})();
