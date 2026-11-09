(function () {
  'use strict';
  var cv = document.getElementById('c'), c = cv.getContext('2d');
  var N = 240; cv.width = cv.height = N; cv.style.imageRendering = 'auto';
  var A = new Float32Array(N * N), B = new Float32Array(N * N), A2 = new Float32Array(N * N), B2 = new Float32Array(N * N);
  var img = c.createImageData(N, N);
  var PRE = { coral: [.0545, .062], spots: [.035, .065], maze: [.029, .057], mitosis: [.0367, .0649] };
  var PAL = {
    ink: [[250, 248, 244], [42, 39, 35]],
    ember: [[29, 27, 25], [235, 120, 60], [250, 220, 150]],
    sea: [[238, 241, 236], [79, 124, 138], [20, 40, 60]]
  };
  var feed, kill, pal;
  var preset = document.getElementById('preset'), palSel = document.getElementById('pal');
  function set() { var p = PRE[preset.value]; feed = p[0]; kill = p[1]; pal = PAL[palSel.value]; }
  function blob(cx, cy, r) {
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      var i = ((cy + y + N) % N) * N + ((cx + x + N) % N); B[i] = 1; A[i] = .5 + Math.random() * .1;
    }
  }
  function reset() {
    A.fill(1); B.fill(0);
    for (var k = 0; k < 14; k++) blob(Math.floor(Math.random() * N), Math.floor(Math.random() * N), 3 + Math.floor(Math.random() * 4));
  }
  function step() {
    for (var y = 0; y < N; y++) {
      var ym = ((y - 1 + N) % N) * N, y0 = y * N, yp = ((y + 1) % N) * N;
      for (var x = 0; x < N; x++) {
        var xm = (x - 1 + N) % N, xp = (x + 1) % N, i = y0 + x;
        var a = A[i], b = B[i];
        var la = -a + .2 * (A[ym + x] + A[yp + x] + A[y0 + xm] + A[y0 + xp]) + .05 * (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]);
        var lb = -b + .2 * (B[ym + x] + B[yp + x] + B[y0 + xm] + B[y0 + xp]) + .05 * (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]);
        var abb = a * b * b;
        A2[i] = a + (1.0 * la - abb + feed * (1 - a));
        B2[i] = b + (.5 * lb + abb - (kill + feed) * b);
      }
    }
    var t = A; A = A2; A2 = t; t = B; B = B2; B2 = t;
  }
  function render() {
    var d = img.data;
    for (var i = 0; i < N * N; i++) {
      var v = Math.max(0, Math.min(1, (A[i] - B[i] - .1) * 1.6)), u = 1 - v, col;
      if (pal.length === 2) col = [pal[0][0] * v + pal[1][0] * u, pal[0][1] * v + pal[1][1] * u, pal[0][2] * v + pal[1][2] * u];
      else {
        var p0 = u < .5 ? pal[0] : pal[1], p1 = u < .5 ? pal[1] : pal[2], f = u < .5 ? u * 2 : (u - .5) * 2;
        col = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f];
      }
      var j = i * 4; d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }
  function loop() { for (var k = 0; k < 10; k++) step(); render(); requestAnimationFrame(loop); }
  var down = false;
  function stir(e) { var r = cv.getBoundingClientRect(); blob(Math.floor((e.clientX - r.left) / r.width * N), Math.floor((e.clientY - r.top) / r.height * N), 3); }
  cv.addEventListener('pointerdown', function (e) { down = true; cv.setPointerCapture(e.pointerId); stir(e); });
  cv.addEventListener('pointermove', function (e) { if (down) stir(e); });
  cv.addEventListener('pointerup', function () { down = false; });
  cv.addEventListener('pointercancel', function () { down = false; });
  preset.onchange = function () { set(); reset(); };
  palSel.onchange = set;
  document.getElementById('reset').onclick = reset;
  document.getElementById('dl').onclick = function () {
    var o = document.createElement('canvas'); o.width = o.height = 960; var oc = o.getContext('2d'); oc.imageSmoothingEnabled = true; oc.drawImage(cv, 0, 0, 960, 960);
    var a = document.createElement('a'); a.download = 'petit-turing.png'; a.href = o.toDataURL('image/png'); a.click();
  };
  set(); reset(); for (var k = 0; k < 600; k++) step(); render(); requestAnimationFrame(loop);
})();
