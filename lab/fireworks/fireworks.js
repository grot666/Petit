(function () {
  'use strict';
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rockets = [], sparks = [];
  var PAL = [
    ['#ff6b4a', '#ffd166', '#fff1c1'],
    ['#6ec6ff', '#b8e1ff', '#ffffff'],
    ['#c3f584', '#7ddea0', '#e8ffe8'],
    ['#f7a8ff', '#ff7eb3', '#ffe0f0'],
    ['#ffd56b', '#ff9f43', '#fff3d0'],
    ['#a78bfa', '#c4b5fd', '#ede9fe']
  ];
  var running = true;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function launch(tx, ty) {
    rockets.push({
      x: tx + rand(-8, 8),
      y: H + 10,
      tx: tx, ty: ty,
      vx: (tx - (W / 2)) * 0.01 + rand(-0.4, 0.4),
      vy: -rand(9, 13),
      life: 1,
      hue: pick(PAL)
    });
  }

  function explode(x, y, hue) {
    var n = reduce ? 28 : 70 + ((Math.random() * 40) | 0);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = rand(1.2, reduce ? 4.5 : 6.5);
      sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.7, 1.2),
        decay: rand(0.012, 0.025),
        size: rand(1.2, 2.8),
        color: hue[(Math.random() * hue.length) | 0],
        trail: []
      });
    }
    // secondary glitter
    if (!reduce) {
      for (i = 0; i < 18; i++) {
        a = Math.random() * Math.PI * 2;
        sp = rand(0.4, 2.2);
        sparks.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rand(0.9, 1.6), decay: rand(0.008, 0.015),
          size: rand(0.6, 1.4), color: '#fff7e0', trail: []
        });
      }
    }
  }

  function pointerPos(e) {
    var r = canvas.getBoundingClientRect();
    var src = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    return {
      x: (src.clientX - r.left) * (W / r.width),
      y: (src.clientY - r.top) * (H / r.height)
    };
  }

  function onDown(e) {
    e.preventDefault();
    var p = pointerPos(e);
    launch(p.x, Math.min(p.y, H * 0.55));
  }
  canvas.addEventListener('pointerdown', onDown, { passive: false });
  canvas.addEventListener('touchstart', onDown, { passive: false });

  document.getElementById('clear').onclick = function () {
    rockets.length = 0; sparks.length = 0;
    ctx.fillStyle = '#0e0e12'; ctx.fillRect(0, 0, W, H);
  };
  document.getElementById('burst').onclick = function () {
    for (var i = 0; i < (reduce ? 2 : 4); i++) {
      launch(rand(W * 0.15, W * 0.85), rand(H * 0.18, H * 0.45));
    }
  };

  // soft night base
  ctx.fillStyle = '#0e0e12'; ctx.fillRect(0, 0, W, H);

  var last = performance.now();
  function frame(now) {
    if (!running) return;
    var dt = Math.min(32, now - last) / 16.67;
    last = now;

    // trail fade
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = reduce ? 'rgba(14,14,18,0.35)' : 'rgba(14,14,18,0.18)';
    ctx.fillRect(0, 0, W, H);

    // rockets
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.vy += 0.12 * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      ctx.beginPath();
      ctx.fillStyle = r.hue[0];
      ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // ember trail
      ctx.fillStyle = 'rgba(255,200,120,0.35)';
      ctx.fillRect(r.x - 1, r.y + 4, 2, 8);
      if (r.vy >= -1.5 || r.y <= r.ty) {
        explode(r.x, r.y, r.hue);
        rockets.splice(i, 1);
      }
    }

    ctx.globalCompositeOperation = 'lighter';
    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.vy += 0.045 * dt;
      s.vx *= Math.pow(0.995, dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= s.decay * dt;
      if (!reduce) {
        s.trail.push([s.x, s.y]);
        if (s.trail.length > 6) s.trail.shift();
      }
      if (s.life <= 0 || s.y > H + 20) { sparks.splice(i, 1); continue; }
      var a = Math.max(0, Math.min(1, s.life));
      if (s.trail && s.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = a * 0.35;
        ctx.lineWidth = s.size * 0.7;
        ctx.moveTo(s.trail[0][0], s.trail[0][1]);
        for (var t = 1; t < s.trail.length; t++) ctx.lineTo(s.trail[t][0], s.trail[t][1]);
        ctx.stroke();
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // gentle opening burst
  setTimeout(function () {
    launch(W * 0.5, H * 0.32);
  }, 400);

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });
})();
