(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var DAY = Math.floor(Date.now() / 86400000);

  // ---------- utilities ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  function makeNoise(r) {
    var p = new Uint8Array(512), i, perm = [];
    for (i = 0; i < 256; i++) perm[i] = i;
    for (i = 255; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (i = 0; i < 512; i++) p[i] = perm[i & 255];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function grad(h, x, y) {
      switch (h & 7) {
        case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
        case 4: return x; case 5: return -x; case 6: return y; default: return -y;
      }
    }
    function noise(x, y) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      var u = fade(x), v = fade(y);
      var a = p[X] + Y, b = p[X + 1] + Y;
      var n00 = grad(p[a], x, y), n10 = grad(p[b], x - 1, y);
      var n01 = grad(p[a + 1], x, y - 1), n11 = grad(p[b + 1], x - 1, y - 1);
      var nx0 = n00 + u * (n10 - n00), nx1 = n01 + u * (n11 - n01);
      return nx0 + v * (nx1 - nx0); // ~[-1,1]
    }
    noise.fbm = function (x, y, oct) {
      var s = 0, amp = 0.5, f = 1;
      for (var o = 0; o < (oct || 4); o++) { s += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; }
      return s;
    };
    return noise;
  }

  // ---------- works ----------
  var works = [
    {
      title: 'Drift', w: 800, h: 1000,
      desc: 'Two thousand ink lines released into an invisible current. Each one follows the field until it runs out of breath.',
      draw: function (c, W, H, r) {
        var n = makeNoise(r);
        c.fillStyle = '#f6f3ec'; c.fillRect(0, 0, W, H);
        var sc = 0.0022 + r() * 0.0012, twist = 2 + r() * 1.5;
        c.lineCap = 'round';
        for (var i = 0; i < 2200; i++) {
          var x = r() * W * 1.2 - W * 0.1, y = r() * H * 1.2 - H * 0.1;
          var len = 40 + r() * 160;
          var dark = r() < 0.08;
          c.strokeStyle = dark ? 'rgba(150,52,38,0.55)' : 'rgba(30,30,34,' + (0.1 + r() * 0.25).toFixed(2) + ')';
          c.lineWidth = dark ? 1.1 : 0.4 + r() * 0.8;
          c.beginPath(); c.moveTo(x, y);
          for (var s = 0; s < len; s++) {
            var a = n.fbm(x * sc, y * sc, 3) * TAU * twist;
            x += Math.cos(a) * 1.6; y += Math.sin(a) * 1.6;
            c.lineTo(x, y);
          }
          c.stroke();
        }
      }
    },
    {
      title: 'Partition', w: 900, h: 900,
      desc: 'A square divided, and divided again, by a rule that grows tired. Colour is permitted only where the cuts allow.',
      draw: function (c, W, H, r) {
        c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, W, H);
        var rects = [];
        (function split(x, y, w, h, d) {
          if (d > 0 && (w * h < 9000 || r() < 0.08 * d || d > 5)) { rects.push([x, y, w, h]); return; }
          var vert = w > h ? r() < 0.8 : r() < 0.2;
          var t = 0.3 + r() * 0.4;
          if (vert) { var a = Math.round(w * t); split(x, y, a, h, d + 1); split(x + a, y, w - a, h, d + 1); }
          else { var b = Math.round(h * t); split(x, y, w, b, d + 1); split(x, y + b, w, h - b, d + 1); }
        })(0, 0, W, H, 0);
        var palette = ['#c8312a', '#1f3f8f', '#e9c13b', '#151515'];
        var colored = 0;
        rects.forEach(function (q) {
          var fill = '#f4f1ea';
          if (r() < 0.22 && colored < 7) { fill = palette[Math.floor(r() * (r() < 0.85 ? 3 : 4))]; colored++; }
          c.fillStyle = fill; c.fillRect(q[0], q[1], q[2], q[3]);
        });
        c.strokeStyle = '#151515'; c.lineWidth = 9;
        rects.forEach(function (q) { c.strokeRect(q[0], q[1], q[2], q[3]); });
        c.strokeRect(0, 0, W, H);
      }
    },
    {
      title: 'Quorum', w: 900, h: 900,
      desc: 'Circles arrive one at a time and claim whatever room is left, until nothing more fits. A crowd that never touches.',
      draw: function (c, W, H, r) {
        c.fillStyle = '#f5f2eb'; c.fillRect(0, 0, W, H);
        var circles = [], pad = 3, M = 50;
        var cx = W / 2, cy = H / 2, R = W / 2 - M;
        for (var t = 0; t < 14000 && circles.length < 900; t++) {
          var x = M + r() * (W - 2 * M), y = M + r() * (H - 2 * M);
          var rad = R - Math.hypot(x - cx, y - cy);
          if (rad < 2) continue;
          rad = Math.min(rad, 110 * Math.pow(r(), 1.6) + 3);
          for (var i = 0; i < circles.length && rad >= 2; i++) {
            var q = circles[i];
            rad = Math.min(rad, Math.hypot(x - q[0], y - q[1]) - q[2] - pad);
          }
          if (rad >= 2) circles.push([x, y, rad]);
        }
        var cols = ['#22313f', '#b4553c', '#d8b26e', '#7d8f7a', '#22313f'];
        circles.forEach(function (q) {
          c.beginPath(); c.arc(q[0], q[1], q[2], 0, TAU);
          if (q[2] > 14 && r() < 0.5) {
            c.fillStyle = cols[Math.floor(r() * cols.length)]; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
          } else {
            c.strokeStyle = '#22313f'; c.lineWidth = q[2] > 8 ? 1.2 : 0.8; c.stroke();
          }
        });
      }
    },
    {
      title: 'Isobar', w: 800, h: 1000,
      desc: 'A map of a place that does not exist, surveyed in pressure lines. Where the lines crowd, the weather would be wild.',
      draw: function (c, W, H, r) {
        var n = makeNoise(r);
        c.fillStyle = '#f6f3ec'; c.fillRect(0, 0, W, H);
        var step = 5, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
        var f = new Float32Array(cols * rows), sc = 0.0028 + r() * 0.001;
        var ox = r() * 100, oy = r() * 100;
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++)
          f[j * cols + i] = n.fbm(ox + i * step * sc, oy + j * step * sc, 4);
        var levels = 26;
        for (var L = 0; L < levels; L++) {
          var th = -0.6 + 1.2 * L / levels;
          var major = L % 5 === 0;
          c.strokeStyle = major ? 'rgba(40,44,52,0.85)' : 'rgba(40,44,52,0.45)';
          c.lineWidth = major ? 1.3 : 0.7;
          c.beginPath();
          for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
            var a = f[j * cols + i], b = f[j * cols + i + 1], d = f[(j + 1) * cols + i], e = f[(j + 1) * cols + i + 1];
            var x = i * step, y = j * step, pts = [];
            if ((a < th) !== (b < th)) pts.push([x + step * (th - a) / (b - a), y]);
            if ((b < th) !== (e < th)) pts.push([x + step, y + step * (th - b) / (e - b)]);
            if ((d < th) !== (e < th)) pts.push([x + step * (th - d) / (e - d), y + step]);
            if ((a < th) !== (d < th)) pts.push([x, y + step * (th - a) / (d - a)]);
            if (pts.length >= 2) { c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); }
            if (pts.length === 4) { c.moveTo(pts[2][0], pts[2][1]); c.lineTo(pts[3][0], pts[3][1]); }
          }
          c.stroke();
        }
      }
    },
    {
      title: 'Slow Orbits', w: 900, h: 900, animated: true,
      desc: 'Small bodies circling an empty centre at their own unhurried speeds. The only moving work in the room; it never repeats exactly.',
      setup: function (r) {
        var bodies = [], k = 9 + Math.floor(r() * 4);
        for (var i = 0; i < k; i++) bodies.push({
          rad: 60 + i * (330 / k) + r() * 12,
          speed: (0.00006 + r() * 0.00018) * (r() < 0.3 ? -1 : 1),
          phase: r() * TAU, size: 2 + r() * 5, ecc: 0.85 + r() * 0.15, tilt: r() * TAU
        });
        return { bodies: bodies, t0: null };
      },
      draw: function (c, W, H, r, state, now) {
        c.fillStyle = 'rgba(246,243,236,0.08)'; c.fillRect(0, 0, W, H);
        if (state.t0 === null) { c.fillStyle = '#f6f3ec'; c.fillRect(0, 0, W, H); state.t0 = now; }
        var t = now - state.t0 + 4e5, cx = W / 2, cy = H / 2;
        state.bodies.forEach(function (b, i) {
          c.save(); c.translate(cx, cy); c.rotate(b.tilt);
          c.strokeStyle = 'rgba(40,40,46,0.05)'; c.lineWidth = 0.6;
          c.beginPath(); c.ellipse(0, 0, b.rad, b.rad * b.ecc, 0, 0, TAU); c.stroke();
          var a = b.phase + t * b.speed;
          c.fillStyle = i % 4 === 0 ? '#b0472f' : '#26262c';
          c.beginPath(); c.arc(Math.cos(a) * b.rad, Math.sin(a) * b.rad * b.ecc, b.size, 0, TAU); c.fill();
          c.restore();
        });
        c.fillStyle = '#26262c'; c.beginPath(); c.arc(cx, cy, 3, 0, TAU); c.fill();
      }
    },
    {
      title: 'Wash', w: 800, h: 1000,
      desc: 'Translucent pigment laid down in hundreds of thin, deformed layers, the way watercolour pools at its own edges.',
      draw: function (c, W, H, r) {
        c.fillStyle = '#f7f4ec'; c.fillRect(0, 0, W, H);
        function deform(pts, depth, v) {
          for (var d = 0; d < depth; d++) {
            var out = [];
            for (var i = 0; i < pts.length; i++) {
              var a = pts[i], b = pts[(i + 1) % pts.length];
              var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
              var vv = (a[2] + b[2]) / 2 * v;
              out.push(a, [mx + gauss(r) * len * 0.3 * vv, my + gauss(r) * len * 0.3 * vv, a[2] * (0.85 + r() * 0.3)]);
            }
            pts = out;
          }
          return pts;
        }
        function poly(x, y, R, k) {
          var p = [];
          for (var i = 0; i < k; i++) { var a = TAU * i / k; p.push([x + Math.cos(a) * R, y + Math.sin(a) * R, 0.5 + r()]); }
          return p;
        }
        var palette = [[176, 70, 52], [38, 70, 112], [214, 166, 82], [94, 120, 104]];
        var blobs = 4 + Math.floor(r() * 2);
        c.globalCompositeOperation = 'multiply';
        for (var b = 0; b < blobs; b++) {
          var col = palette[b % palette.length];
          var base = deform(poly(W * (0.2 + r() * 0.6), H * (0.15 + r() * 0.7), 120 + r() * 140, 10), 3, 1);
          for (var l = 0; l < 60; l++) {
            var p = deform(base, 3, 0.6);
            c.fillStyle = 'rgba(' + col.join(',') + ',0.022)';
            c.beginPath(); c.moveTo(p[0][0], p[0][1]);
            for (var i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
            c.closePath(); c.fill();
          }
        }
        c.globalCompositeOperation = 'source-over';
      }
    },
    {
      title: 'Undulation', w: 900, h: 900,
      desc: 'Black and white bands bent by a single slow wave. Stand still and they will not; the movement is in the eye.',
      draw: function (c, W, H, r) {
        c.fillStyle = '#f5f2ea'; c.fillRect(0, 0, W, H);
        var N = 54, h = H / N, k = 0.006 + r() * 0.004, ph = r() * TAU;
        c.fillStyle = '#141414';
        for (var i = -2; i < N + 2; i++) {
          var amp = h * 2.2 * Math.sin(i / N * Math.PI + ph * 0.2);
          c.beginPath();
          var x, top = [], bot = [];
          for (x = 0; x <= W; x += 4) {
            var y = i * h + amp * Math.sin(x * k + i * 0.18 + ph);
            var thick = h * (0.5 + 0.35 * Math.sin(x * k * 1.7 - i * 0.12 + ph));
            top.push([x, y]); bot.push([x, y + thick]);
          }
          c.moveTo(top[0][0], top[0][1]);
          top.forEach(function (p) { c.lineTo(p[0], p[1]); });
          for (var j = bot.length - 1; j >= 0; j--) c.lineTo(bot[j][0], bot[j][1]);
          c.closePath(); c.fill();
        }
      }
    },
    {
      title: 'Morning Grid', w: 900, h: 900,
      desc: 'A pencil grid drawn by a hand that is not quite steady, over pale bands of colour. Best seen from a few steps back.',
      draw: function (c, W, H, r) {
        c.fillStyle = '#f6f1e7'; c.fillRect(0, 0, W, H);
        var bands = ['rgba(232,196,190,0.35)', 'rgba(246,241,231,0)', 'rgba(198,214,226,0.32)', 'rgba(246,241,231,0)'];
        var bh = H / (8 + Math.floor(r() * 4));
        for (var y = 0, i = 0; y < H; y += bh, i++) { c.fillStyle = bands[i % bands.length]; c.fillRect(0, y, W, bh); }
        var M = 60, cells = 24 + Math.floor(r() * 10), s = (W - 2 * M) / cells;
        function pencil(x1, y1, x2, y2) {
          var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6), drift = 0;
          c.beginPath(); c.moveTo(x1, y1);
          for (var k = 1; k <= steps; k++) {
            drift += gauss(r) * 0.12; drift *= 0.9;
            var t = k / steps, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
            if (x1 === x2) px += drift; else py += drift;
            c.lineTo(px, py);
          }
          c.strokeStyle = 'rgba(70,68,66,' + (0.28 + r() * 0.2).toFixed(2) + ')';
          c.lineWidth = 0.5 + r() * 0.35; c.stroke();
        }
        for (var g = 0; g <= cells; g++) {
          pencil(M + g * s, M, M + g * s, H - M);
          pencil(M, M + g * s, W - M, M + g * s);
        }
      }
    }
  ];

  // ---------- build page ----------
  var root = document.getElementById('works');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  works.forEach(function (wk, idx) {
    var sec = document.createElement('section'); sec.className = 'work';
    var frame = document.createElement('div'); frame.className = 'frame';
    var cv = document.createElement('canvas');
    cv.width = wk.w * dpr; cv.height = wk.h * dpr;
    cv.style.setProperty('--ar', wk.w + ' / ' + wk.h);
    cv.style.setProperty('--r', (wk.w / wk.h).toFixed(4));
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', wk.title);
    frame.appendChild(cv);
    var cap = document.createElement('div'); cap.className = 'caption';
    cap.innerHTML = '<div class="no">' + ['I','II','III','IV','V','VI','VII','VIII'][idx] + '</div>' +
      '<p class="title"></p><p class="meta">2026<br>Generative, JavaScript on canvas</p><p class="desc"></p>';
    cap.querySelector('.title').textContent = wk.title;
    cap.querySelector('.desc').textContent = wk.desc;
    sec.appendChild(frame); sec.appendChild(cap); root.appendChild(sec);
    wk.canvas = cv; wk.section = sec; wk.seed = (idx + 1) * 7919 + DAY;
  });

  function render(wk) {
    var c = wk.canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = rng(wk.seed);
    if (wk.animated) {
      var state = wk.setup(r);
      var loop = function (now) {
        if (wk.visible) wk.draw(c, wk.w, wk.h, r, state, now);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } else {
      wk.draw(c, wk.w, wk.h, r);
    }
  }

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var wk = works.filter(function (w) { return w.section === e.target; })[0];
      wk.visible = e.isIntersecting;
      if (e.isIntersecting) {
        wk.section.classList.add('seen');
        if (!wk.rendered) { wk.rendered = true; render(wk); }
      }
    });
  }, { rootMargin: '300px 0px' }) : null;

  works.forEach(function (wk) {
    if (io) io.observe(wk.section);
    else { wk.visible = true; wk.rendered = true; wk.section.classList.add('seen'); render(wk); }
  });
})();
