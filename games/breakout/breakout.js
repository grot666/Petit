(function () {
  'use strict';
  var cv = document.getElementById('board'), c = cv.getContext('2d');
  var W = 420, H = 560, dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr; c.scale(dpr, dpr);
  var scoreEl = document.getElementById('score'), livesEl = document.getElementById('lives'), bestEl = document.getElementById('best');
  var overlay = document.getElementById('overlay'), msg = document.getElementById('msg'), go = document.getElementById('go');
  var KEY = 'petit.breakout.best', best = 0;
  try { best = +(localStorage.getItem(KEY) || 0); } catch (e) {}
  bestEl.textContent = best;
  var COLS = 8, ROWS = 6, BW = (W - 20) / COLS, BH = 18;
  var COLORS = ['#c8553d', '#d98a3d', '#d2a645', '#8fa85a', '#5e8c61', '#4f7c8a'];
  var bricks, pad, ball, score, lives, running, stuck, keys = {}, level, last;

  function bricksFor() {
    bricks = [];
    for (var r = 0; r < ROWS; r++) for (var k = 0; k < COLS; k++)
      bricks.push({ x: 10 + k * BW, y: 60 + r * (BH + 6), alive: true, color: COLORS[r], pts: (ROWS - r) * 10 });
  }
  function resetBall() { stuck = true; ball = { x: pad.x, y: H - 46, r: 7, vx: 0, vy: 0 }; }
  function newGame() {
    pad = { x: W / 2, w: 78, h: 10 }; score = 0; lives = 3; level = 1;
    bricksFor(); resetBall(); hud();
  }
  function hud() { scoreEl.textContent = score; livesEl.textContent = lives; }
  function launch() {
    if (!stuck) return;
    var sp = 5 + level * .6, a = -Math.PI / 2 + (Math.random() - .5) * .8;
    ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; stuck = false;
  }
  function start() { if (!running) { overlay.hidden = true; running = true; last = performance.now(); requestAnimationFrame(loop); } launch(); }
  function end(text) {
    running = false;
    if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch (e) {} }
    msg.innerHTML = text; go.textContent = 'Play again 再来'; overlay.hidden = false; newGame(); draw();
  }
  function step(dt) {
    if (keys.ArrowLeft) pad.x -= 7 * dt; if (keys.ArrowRight) pad.x += 7 * dt;
    pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, pad.x));
    if (stuck) { ball.x = pad.x; return; }
    var n = 4;
    for (var s = 0; s < n; s++) {
      ball.x += ball.vx * dt / n; ball.y += ball.vy * dt / n;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      var py = H - 34;
      if (ball.vy > 0 && ball.y + ball.r >= py && ball.y + ball.r <= py + pad.h + 8 && Math.abs(ball.x - pad.x) <= pad.w / 2 + ball.r) {
        var hit = (ball.x - pad.x) / (pad.w / 2), sp = Math.hypot(ball.vx, ball.vy), a = -Math.PI / 2 + hit * 1.05;
        ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.y = py - ball.r;
      }
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i]; if (!b.alive) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + BW - 4 && ball.y + ball.r > b.y && ball.y - ball.r < b.y + BH) {
          b.alive = false; score += b.pts; hud();
          var ox = Math.min(ball.x + ball.r - b.x, b.x + BW - 4 - (ball.x - ball.r)), oy = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
          if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
          var sp2 = Math.hypot(ball.vx, ball.vy);
          if (sp2 < 9) { ball.vx *= 1.012; ball.vy *= 1.012; }
          break;
        }
      }
      if (ball.y > H + 20) {
        lives--; hud();
        if (lives <= 0) return end('Game over · 游戏结束<br>Score 得分 ' + score);
        resetBall(); return;
      }
    }
    if (bricks.every(function (b) { return !b.alive; })) { level++; bricksFor(); resetBall(); }
  }
  function draw() {
    c.fillStyle = '#1d1b19'; c.fillRect(0, 0, W, H);
    bricks.forEach(function (b) { if (!b.alive) return; c.fillStyle = b.color; c.beginPath(); c.roundRect ? c.roundRect(b.x, b.y, BW - 4, BH, 4) : c.rect(b.x, b.y, BW - 4, BH); c.fill(); });
    c.fillStyle = '#faf8f4'; c.beginPath(); c.roundRect ? c.roundRect(pad.x - pad.w / 2, H - 34, pad.w, pad.h, 5) : c.rect(pad.x - pad.w / 2, H - 34, pad.w, pad.h); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '12px -apple-system,Helvetica,Arial,sans-serif'; c.textAlign = 'left';
    c.fillText('Level ' + level + ' · 第 ' + level + ' 关', 12, 30);
    if (stuck && running) { c.textAlign = 'center'; c.fillText('Tap / Space to launch · 点击发射', W / 2, H / 2 + 40); }
  }
  function loop(t) {
    if (!running) return;
    var dt = Math.min(2.5, (t - last) / 16.67); last = t;
    step(dt); if (running) { draw(); requestAnimationFrame(loop); }
  }
  function toX(e) { var r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
  cv.addEventListener('pointermove', function (e) { pad.x = toX(e); if (stuck) ball.x = pad.x; if (!running) draw(); });
  cv.addEventListener('pointerdown', function (e) { pad.x = toX(e); if (running) launch(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
    if (e.key === ' ') { e.preventDefault(); start(); }
  });
  document.addEventListener('keyup', function (e) { keys[e.key] = false; });
  go.onclick = start;
  newGame(); draw();
})();
