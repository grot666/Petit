(function () {
  'use strict';
  var KEY = 'petit.2048.best', board = document.getElementById('board');
  var scoreEl = document.getElementById('score'), bestEl = document.getElementById('best');
  var overlay = document.getElementById('overlay'), msg = document.getElementById('msg'), keepBtn = document.getElementById('keep');
  var colors = { 2: '#f3ede3', 4: '#efe3cc', 8: '#ecb889', 16: '#e89a6c', 32: '#e57f61', 64: '#e0613f', 128: '#e9cf75', 256: '#e8ca62', 512: '#e7c450', 1024: '#e6bf3f', 2048: '#e5b92e' };
  var grid, score, best, won, keep, cells = [], fresh = [];
  try { best = +(localStorage.getItem(KEY) || 0); } catch (e) { best = 0; }
  bestEl.textContent = best;
  for (var i = 0; i < 16; i++) { var d = document.createElement('div'); d.className = 't'; board.appendChild(d); cells.push(d); }

  function newGame() {
    grid = []; for (var i = 0; i < 16; i++) grid.push(0);
    score = 0; won = false; keep = false; overlay.hidden = true;
    add(); add(); render();
  }
  function add() {
    var empty = []; grid.forEach(function (v, i) { if (!v) empty.push(i); });
    if (!empty.length) return;
    var idx = empty[Math.floor(Math.random() * empty.length)];
    grid[idx] = Math.random() < 0.9 ? 2 : 4; fresh.push(idx);
  }
  function line(dirIdx, k) { // returns indices of row/col k in move order
    var out = [];
    for (var j = 0; j < 4; j++) {
      if (dirIdx === 0) out.push(k * 4 + j);          // left
      else if (dirIdx === 1) out.push(k * 4 + 3 - j); // right
      else if (dirIdx === 2) out.push(j * 4 + k);     // up
      else out.push((3 - j) * 4 + k);                 // down
    }
    return out;
  }
  function move(dirIdx) {
    if (!overlay.hidden) return;
    var moved = false;
    for (var k = 0; k < 4; k++) {
      var idx = line(dirIdx, k), vals = idx.map(function (i) { return grid[i]; }).filter(Boolean), res = [];
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) { res.push(vals[i] * 2); score += vals[i] * 2; if (vals[i] * 2 === 2048) won = true; i++; }
        else res.push(vals[i]);
      }
      while (res.length < 4) res.push(0);
      idx.forEach(function (gi, j) { if (grid[gi] !== res[j]) moved = true; grid[gi] = res[j]; });
    }
    if (!moved) return;
    add(); render();
    if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch (e) {} }
    if (won && !keep) { msg.textContent = 'You made 2048!'; keepBtn.hidden = false; overlay.hidden = false; }
    else if (!canMove()) { msg.textContent = 'No moves left · ' + score; keepBtn.hidden = true; overlay.hidden = false; }
  }
  function canMove() {
    for (var i = 0; i < 16; i++) {
      if (!grid[i]) return true;
      if (i % 4 < 3 && grid[i] === grid[i + 1]) return true;
      if (i < 12 && grid[i] === grid[i + 4]) return true;
    }
    return false;
  }
  function render() {
    scoreEl.textContent = score;
    grid.forEach(function (v, i) {
      var el = cells[i];
      el.textContent = v || '';
      el.style.background = v ? (colors[v] || '#3a342e') : '';
      el.style.color = v >= 8 ? '#fff' : '';
      el.className = 't' + (v >= 1024 ? ' huge' : v >= 128 ? ' big' : '') + (fresh.indexOf(i) >= 0 ? ' pop' : '');
    });
    fresh = [];
  }
  var map = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3, A: 0, D: 1, W: 2, S: 3 };
  document.addEventListener('keydown', function (e) { if (e.key in map) { e.preventDefault(); move(map[e.key]); } });
  var sx, sy;
  board.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  board.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  board.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 0); else move(dy > 0 ? 3 : 2);
  });
  document.getElementById('restart').onclick = newGame;
  document.getElementById('again').onclick = newGame;
  keepBtn.onclick = function () { keep = true; overlay.hidden = true; };
  newGame();
})();
