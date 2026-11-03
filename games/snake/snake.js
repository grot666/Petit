(function () {
  'use strict';
  var N = 20, cv = document.getElementById('board'), c = cv.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2), S = 420;
  cv.width = S * dpr; cv.height = S * dpr; c.scale(dpr, dpr);
  var cell = S / N, KEY = 'petit.snake.best';
  var scoreEl = document.getElementById('score'), bestEl = document.getElementById('best');
  var overlay = document.getElementById('overlay'), msg = document.getElementById('msg');
  var snake, dir, queue, food, score, running, paused, timer, speed;
  var best = +(load() || 0); bestEl.textContent = best;

  function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = { x: 1, y: 0 }; queue = []; score = 0; speed = 130; paused = false;
    scoreEl.textContent = 0; placeFood(); draw();
  }
  function placeFood() {
    do { food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
    while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
  }
  function start() {
    reset(); running = true; overlay.hidden = true;
    clearTimeout(timer); tick();
  }
  function tick() {
    if (!running) return;
    if (!paused) step();
    if (running) timer = setTimeout(tick, speed);
  }
  function step() {
    if (queue.length) dir = queue.shift();
    var h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    var willEat = h.x === food.x && h.y === food.y;
    var body = willEat ? snake : snake.slice(0, -1);
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || body.some(function (s) { return s.x === h.x && s.y === h.y; })) return over();
    snake.unshift(h);
    if (willEat) {
      score++; scoreEl.textContent = score; speed = Math.max(60, 130 - score * 2.5);
      if (snake.length === N * N) return over(true);
      placeFood();
    } else snake.pop();
    draw();
  }
  function over(won) {
    running = false; clearTimeout(timer);
    if (score > best) { best = score; save(best); bestEl.textContent = best; }
    msg.textContent = (won ? 'You filled the board! ' : 'Game over · ') + score + ' point' + (score === 1 ? '' : 's');
    overlay.hidden = false; draw();
  }
  function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function draw() {
    c.fillStyle = '#fff'; c.fillRect(0, 0, S, S);
    c.fillStyle = '#f4f1ea';
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if ((x + y) % 2) c.fillRect(x * cell, y * cell, cell, cell);
    c.fillStyle = '#b4553c'; c.beginPath(); c.arc((food.x + .5) * cell, (food.y + .5) * cell, cell * .36, 0, Math.PI * 2); c.fill();
    snake.forEach(function (s, i) {
      c.fillStyle = i === 0 ? '#2a2723' : 'rgba(42,39,35,' + Math.max(.45, 1 - i * .02) + ')';
      rr(s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3, 5); c.fill();
    });
  }
  function turn(x, y) {
    if (!running) { start(); }
    var last = queue.length ? queue[queue.length - 1] : dir;
    if ((x === -last.x && y === -last.y) || (x === last.x && y === last.y)) return;
    if (queue.length < 3) queue.push({ x: x, y: y });
  }
  var keys = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
  document.addEventListener('keydown', function (e) {
    if (keys[e.key]) { e.preventDefault(); turn(keys[e.key][0], keys[e.key][1]); }
    else if (e.key === ' ') { e.preventDefault(); if (running) paused = !paused; else start(); }
  });
  var tx, ty;
  cv.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  cv.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { if (!running) start(); return; }
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
  });
  cv.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  document.getElementById('restart').onclick = start;
  document.getElementById('play').onclick = start;
  reset();
})();
