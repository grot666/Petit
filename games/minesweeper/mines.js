(function () {
  'use strict';
  var W = 9, H = 9, MINES = 10, KEY = 'petit.mines.best';
  var board = document.getElementById('board'), leftEl = document.getElementById('left'), timeEl = document.getElementById('time');
  var bestEl = document.getElementById('best'), overlay = document.getElementById('overlay'), msg = document.getElementById('msg');
  var modeBtn = document.getElementById('mode');
  var cells, mine, opened, flag, first, over, timer, start, flagMode = false, openedCount;
  var best = null; try { best = localStorage.getItem(KEY); } catch (e) {}
  bestEl.textContent = best || '–';

  function nb(i) {
    var x = i % W, y = Math.floor(i / W), out = [];
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      var nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
    }
    return out;
  }
  function count(i) { return nb(i).filter(function (j) { return mine[j]; }).length; }
  function newGame() {
    clearInterval(timer); board.innerHTML = ''; cells = []; mine = []; opened = []; flag = [];
    first = true; over = false; openedCount = 0; overlay.hidden = true; timeEl.textContent = 0; leftEl.textContent = MINES;
    for (var i = 0; i < W * H; i++) {
      mine.push(false); opened.push(false); flag.push(false);
      var b = document.createElement('button'); b.className = 'c'; b.dataset.i = i; b.setAttribute('aria-label', 'Hidden');
      board.appendChild(b); cells.push(b);
    }
  }
  function plant(safe) {
    var avoid = nb(safe).concat(safe), placed = 0;
    while (placed < MINES) {
      var r = Math.floor(Math.random() * W * H);
      if (mine[r] || avoid.indexOf(r) >= 0) continue;
      mine[r] = true; placed++;
    }
  }
  function reveal(i) {
    if (over || opened[i] || flag[i]) return;
    if (first) {
      first = false; plant(i); start = Date.now();
      timer = setInterval(function () { timeEl.textContent = Math.floor((Date.now() - start) / 1000); }, 250);
    }
    if (mine[i]) { cells[i].classList.add('boom'); return lose(); }
    var stack = [i];
    while (stack.length) {
      var k = stack.pop();
      if (opened[k] || flag[k]) continue;
      opened[k] = true; openedCount++;
      var n = count(k), el = cells[k];
      el.classList.add('open'); el.textContent = n || ''; if (n) el.classList.add('n' + n);
      el.setAttribute('aria-label', n ? String(n) : 'Empty');
      if (!n) nb(k).forEach(function (j) { if (!opened[j]) stack.push(j); });
    }
    if (openedCount === W * H - MINES) win();
  }
  function chord(i) { // click on an opened number with matching flags reveals neighbours
    if (!opened[i]) return;
    var n = count(i), f = nb(i).filter(function (j) { return flag[j]; }).length;
    if (n && n === f) nb(i).forEach(reveal);
  }
  function toggleFlag(i) {
    if (over || opened[i]) return;
    flag[i] = !flag[i]; cells[i].textContent = flag[i] ? '🚩' : '';
    cells[i].setAttribute('aria-label', flag[i] ? 'Flagged' : 'Hidden');
    leftEl.textContent = MINES - flag.filter(Boolean).length;
  }
  function showMines() { mine.forEach(function (m, i) { if (m && !flag[i]) cells[i].textContent = '💣'; }); }
  function lose() { over = true; clearInterval(timer); showMines(); msg.textContent = 'Boom. Try again?'; setTimeout(function () { overlay.hidden = false; }, 600); }
  function win() {
    over = true; clearInterval(timer);
    var s = Math.floor((Date.now() - start) / 1000), isBest = !best || s < +best;
    if (isBest) { best = s; bestEl.textContent = s; try { localStorage.setItem(KEY, s); } catch (e) {} }
    mine.forEach(function (m, i) { if (m) cells[i].textContent = '🚩'; });
    leftEl.textContent = 0;
    msg.textContent = 'Cleared in ' + s + 's' + (isBest ? ' · new best!' : ''); overlay.hidden = false;
  }

  var pressTimer = null, longPressed = false;
  board.addEventListener('contextmenu', function (e) { e.preventDefault(); var t = e.target.closest('.c'); if (t && !longPressed) toggleFlag(+t.dataset.i); });
  board.addEventListener('touchstart', function (e) {
    var t = e.target.closest('.c'); if (!t) return; longPressed = false;
    pressTimer = setTimeout(function () { longPressed = true; toggleFlag(+t.dataset.i); if (navigator.vibrate) navigator.vibrate(20); }, 420);
  }, { passive: true });
  board.addEventListener('touchend', function () { clearTimeout(pressTimer); });
  board.addEventListener('touchmove', function () { clearTimeout(pressTimer); }, { passive: true });
  board.addEventListener('click', function (e) {
    var t = e.target.closest('.c'); if (!t) return;
    if (longPressed) { longPressed = false; return; }
    var i = +t.dataset.i;
    if (opened[i]) chord(i);
    else if (flagMode) toggleFlag(i);
    else reveal(i);
  });
  modeBtn.onclick = function () { flagMode = !flagMode; modeBtn.classList.toggle('on', flagMode); modeBtn.textContent = '🚩 Flag mode: ' + (flagMode ? 'on' : 'off'); };
  document.getElementById('restart').onclick = newGame;
  document.getElementById('again').onclick = newGame;
  newGame();
})();
