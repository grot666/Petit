(function () {
  'use strict';
  var cv = document.getElementById('c'), c = cv.getContext('2d'), S = 900;
  cv.width = cv.height = S;
  var armsEl = document.getElementById('arms'), stars, tilt = .55, hueBase, dust;
  function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; }
  function regen() {
    var arms = +armsEl.value, n = 6500; stars = []; hueBase = Math.random() * 360;
    for (var i = 0; i < n; i++) {
      var core = Math.random() < .22, r, th;
      if (core) { r = Math.abs(gauss()) * 70; th = Math.random() * Math.PI * 2; }
      else { r = 30 + Math.pow(Math.random(), 1.1) * 380; var arm = Math.floor(Math.random() * arms); th = arm * Math.PI * 2 / arms + Math.log(r / 30) * 1.9 + gauss() * (.35 + r / 900); }
      var warm = Math.max(0, 1 - r / 160);
      stars.push({ r: r, th: th, z: gauss() * (core ? 22 : 9), s: Math.random() < .04 ? 2.6 : Math.random() * 1.5 + .7,
        h: (hueBase + (warm > .1 ? 30 : 200) + gauss() * 30) % 360, l: 68 + warm * 22 + Math.random() * 10, tw: Math.random() * 6 });
    }
    dust = [];
    for (var k = 0; k < 220; k++) dust.push({ x: Math.random() * S, y: Math.random() * S, s: Math.random() * 1.1 + .2, a: Math.random() * .6 + .2 });
  }
  function frame(now) {
    var t = now / 1000;
    c.fillStyle = 'rgba(6,6,14,1)'; c.fillRect(0, 0, S, S);
    dust.forEach(function (d) { c.fillStyle = 'rgba(255,255,255,' + d.a * (.6 + .4 * Math.sin(t * 2 + d.x)) + ')'; c.fillRect(d.x, d.y, d.s, d.s); });
    var g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, 160);
    g.addColorStop(0, 'hsla(' + (hueBase + 40) + ',80%,85%,.55)'); g.addColorStop(.4, 'hsla(' + (hueBase + 30) + ',70%,60%,.15)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    c.globalCompositeOperation = 'lighter';
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = s.th + t * 18 / (s.r + 40);
      var x = Math.cos(a) * s.r, y = Math.sin(a) * s.r, z = s.z;
      var py = y * ct - z * st;
      c.fillStyle = 'hsla(' + s.h + ',70%,' + s.l + '%,' + (.7 + .3 * Math.sin(t * 1.5 + s.tw)) + ')';
      c.fillRect(S / 2 + x, S / 2 + py, s.s, s.s);
    }
    c.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  var dragging = false, y0, tilt0;
  cv.addEventListener('pointerdown', function (e) { dragging = true; y0 = e.clientY; tilt0 = tilt; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) { if (dragging) tilt = Math.max(0, Math.min(1.45, tilt0 + (e.clientY - y0) / 200)); });
  cv.addEventListener('pointerup', function () { dragging = false; });
  cv.addEventListener('pointercancel', function () { dragging = false; });
  document.getElementById('regen').onclick = regen;
  armsEl.oninput = regen;
  document.getElementById('dl').onclick = function () { var a = document.createElement('a'); a.download = 'petit-galaxy.png'; a.href = cv.toDataURL('image/png'); a.click(); };
  regen(); requestAnimationFrame(frame);
})();
