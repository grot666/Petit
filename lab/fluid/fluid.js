(function () {
  'use strict';
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d', { alpha: false });
  var W = canvas.width, H = canvas.height;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAX = reduce ? 900 : 2200;
  var particles = [];
  var drawing = false, lx = 0, ly = 0;
  var hue = 12 + Math.random() * 40; // warm vermilion family by default
  var running = true;

  var PALETTES = [
    function () { return 8 + Math.random() * 28; },   // vermilion
    function () { return 200 + Math.random() * 30; }, // blue
    function () { return 150 + Math.random() * 30; }, // teal
    function () { return 280 + Math.random() * 40; }, // violet
    function () { return 40 + Math.random() * 20; }   // gold
  ];
  var palIdx = 0;

  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, W, H);

  function spawn(x, y, vx, vy, n) {
    for (var i = 0; i < n; i++) {
      if (particles.length >= MAX) particles.shift();
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: vx * 0.35 + (Math.random() - 0.5) * 1.2,
        vy: vy * 0.35 + (Math.random() - 0.5) * 1.2,
        life: 1,
        decay: 0.004 + Math.random() * 0.008,
        size: 4 + Math.random() * 10,
        h: hue + (Math.random() - 0.5) * 18,
        s: 45 + Math.random() * 35,
        l: 35 + Math.random() * 25
      });
    }
  }

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var src = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    return {
      x: (src.clientX - r.left) * (W / r.width),
      y: (src.clientY - r.top) * (H / r.height)
    };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    var p = pos(e);
    lx = p.x; ly = p.y;
    spawn(p.x, p.y, 0, 0, reduce ? 6 : 14);
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pos(e);
    var dx = p.x - lx, dy = p.y - ly;
    var dist = Math.hypot(dx, dy);
    var steps = Math.max(1, Math.min(8, (dist / 4) | 0));
    for (var i = 0; i < steps; i++) {
      var t = (i + 1) / steps;
      spawn(lx + dx * t, ly + dy * t, dx, dy, reduce ? 3 : 7);
    }
    lx = p.x; ly = p.y;
  }
  function end(e) {
    if (!drawing) return;
    drawing = false;
    if (e) e.preventDefault();
  }

  canvas.addEventListener('pointerdown', start, { passive: false });
  canvas.addEventListener('pointermove', move, { passive: false });
  canvas.addEventListener('pointerup', end, { passive: false });
  canvas.addEventListener('pointercancel', end, { passive: false });
  canvas.addEventListener('pointerleave', end, { passive: false });
  // touch fallbacks for older mobile
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end, { passive: false });

  document.getElementById('clear').onclick = function () {
    particles.length = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f4f0e8';
    ctx.fillRect(0, 0, W, H);
  };
  document.getElementById('shuffle').onclick = function () {
    palIdx = (palIdx + 1) % PALETTES.length;
    hue = PALETTES[palIdx]();
  };

  var last = performance.now();
  function frame(now) {
    if (!running) return;
    var dt = Math.min(32, now - last) / 16.67;
    last = now;

    // soft paper wash
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = reduce ? 0.08 : 0.045;
    ctx.fillStyle = '#f4f0e8';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // advect + draw
    ctx.globalCompositeOperation = 'multiply';
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      // mild curl / drift
      var curl = Math.sin(p.y * 0.01 + now * 0.0004) * 0.15;
      p.vx += curl * dt;
      p.vy += Math.cos(p.x * 0.01 - now * 0.0003) * 0.12 * dt;
      p.vx *= Math.pow(0.985, dt);
      p.vy *= Math.pow(0.985, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      p.size *= Math.pow(0.997, dt);
      if (p.life <= 0 || p.size < 0.4) { particles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.fillStyle = 'hsla(' + p.h + ',' + p.s + '%,' + p.l + '%,' + (p.life * 0.22) + ')';
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // welcome swirl
  for (var a = 0; a < Math.PI * 2; a += 0.18) {
    spawn(W / 2 + Math.cos(a) * 40, H / 2 + Math.sin(a) * 40, Math.cos(a) * 4, Math.sin(a) * 4, 2);
  }

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });
})();
