(function () {
  'use strict';
  // Levels from David W. Skinner's freely distributed "Microban" set.
  var LEVELS = [
    ['####', '# .#', '#  ###', '#*@  #', '#  $ #', '#  ###', '####'],
    ['######', '#    #', '# #@ #', '# $* #', '# .* #', '#    #', '######'],
    ['  ####', '###  ####', '#     $ #', '# #  #$ #', '# . .#@ #', '#########'],
    ['########', '#      #', '# .**$@#', '#      #', '#####  #', '    ####'],
    [' #######', ' #     #', ' # .$. #', '## $@$ #', '#  .$. #', '#      #', '########']
  ];
  var cv = document.getElementById('board'), cx = cv.getContext('2d');
  var lvEl = document.getElementById('lv'), mvEl = document.getElementById('mv');
  var overlay = document.getElementById('overlay'), msg = document.getElementById('msg'), go = document.getElementById('go');
  var KEY = 'petit.sokoban.level';
  var lv = 0, W, H, wall, goal, box, px, py, hist, won;
  try { lv = Math.min(+(localStorage.getItem(KEY) || 0), LEVELS.length - 1); } catch (e) {}

  function load(i) {
    lv = (i + LEVELS.length) % LEVELS.length;
    var L = LEVELS[lv]; H = L.length; W = Math.max.apply(null, L.map(function (s) { return s.length; }));
    wall = {}; goal = {}; box = {}; hist = []; won = false; overlay.hidden = true;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var ch = L[y][x] || ' ', k = x + ',' + y;
      if (ch === '#') wall[k] = 1;
      if (ch === '.' || ch === '*' || ch === '+') goal[k] = 1;
      if (ch === '$' || ch === '*') box[k] = 1;
      if (ch === '@' || ch === '+') { px = x; py = y; }
    }
    lvEl.textContent = (lv + 1) + '/' + LEVELS.length; mvEl.textContent = 0; draw();
  }
  function move(dx, dy) {
    if (won) return;
    var nx = px + dx, ny = py + dy, k = nx + ',' + ny;
    if (wall[k]) return;
    var pushed = false;
    if (box[k]) {
      var bk = (nx + dx) + ',' + (ny + dy);
      if (wall[bk] || box[bk]) return;
      delete box[k]; box[bk] = 1; pushed = [k, bk];
    }
    hist.push([px, py, pushed]); px = nx; py = ny; mvEl.textContent = hist.length; draw();
    if (Object.keys(box).every(function (b) { return goal[b]; })) {
      won = true;
      try { localStorage.setItem(KEY, Math.min(lv + 1, LEVELS.length - 1)); } catch (e) {}
      setTimeout(function () {
        msg.textContent = lv === LEVELS.length - 1 ? 'All levels cleared! 全部通关！ (' + hist.length + ' moves)' : 'Solved in ' + hist.length + ' moves · ' + hist.length + ' 步过关';
        go.textContent = lv === LEVELS.length - 1 ? 'Back to level 1 回到第一关' : 'Next level 下一关';
        overlay.hidden = false;
      }, 250);
    }
  }
  function undo() {
    if (!hist.length || won) return;
    var h = hist.pop(); px = h[0]; py = h[1];
    if (h[2]) { delete box[h[2][1]]; box[h[2][0]] = 1; }
    mvEl.textContent = hist.length; draw();
  }
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), S = 420;
    cv.width = S * dpr; cv.height = S * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var c = Math.floor(Math.min(S / W, S / H)), ox = (S - c * W) / 2, oy = (S - c * H) / 2;
    cx.fillStyle = '#efe9df'; cx.fillRect(0, 0, S, S);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var k = x + ',' + y, X = ox + x * c, Y = oy + y * c;
      if (wall[k]) { cx.fillStyle = '#6f665b'; rr(X + 1, Y + 1, c - 2, c - 2, c * .14); cx.fill(); continue; }
      if (goal[k]) { cx.fillStyle = '#b4553c'; cx.beginPath(); cx.arc(X + c / 2, Y + c / 2, c * .13, 0, 7); cx.fill(); }
      if (box[k]) {
        cx.fillStyle = goal[k] ? '#5e8c61' : '#d2a645'; rr(X + c * .1, Y + c * .1, c * .8, c * .8, c * .12); cx.fill();
        cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = Math.max(1, c * .05);
        cx.beginPath(); cx.moveTo(X + c * .25, Y + c * .25); cx.lineTo(X + c * .75, Y + c * .75); cx.moveTo(X + c * .75, Y + c * .25); cx.lineTo(X + c * .25, Y + c * .75); cx.stroke();
      }
    }
    var X0 = ox + px * c + c / 2, Y0 = oy + py * c + c / 2;
    cx.fillStyle = '#2a2723'; cx.beginPath(); cx.arc(X0, Y0, c * .32, 0, 7); cx.fill();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(X0 - c * .11, Y0 - c * .06, c * .06, 0, 7); cx.arc(X0 + c * .11, Y0 - c * .06, c * .06, 0, 7); cx.fill();
  }
  var DIRS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  document.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (DIRS[k]) { e.preventDefault(); move(DIRS[k][0], DIRS[k][1]); }
    else if (k === 'u' || k === 'z') undo();
    else if (k === 'r') load(lv);
    else if (k === 'Enter' && won) load(lv + 1);
  });
  var sx, sy;
  cv.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  cv.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0); else move(0, dy > 0 ? 1 : -1);
  });
  document.querySelectorAll('.pad button').forEach(function (b) {
    b.addEventListener('click', function () { var d = b.dataset.d.split(','); move(+d[0], +d[1]); });
  });
  document.getElementById('undo').onclick = undo;
  document.getElementById('restart').onclick = function () { load(lv); };
  document.getElementById('prev').onclick = function () { load(lv - 1); };
  document.getElementById('next').onclick = function () { load(lv + 1); };
  go.onclick = function () { load(lv + 1); };
  load(lv);
})();
