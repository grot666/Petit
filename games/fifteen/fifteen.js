(function () {
  'use strict';
  var board = document.getElementById('board'), mvEl = document.getElementById('mv'), tmEl = document.getElementById('tm'), bestEl = document.getElementById('best');
  var overlay = document.getElementById('overlay'), msg = document.getElementById('msg');
  var N = 4, cells, tiles, moves, t0, timer, done;
  function key() { return 'petit.fifteen.best' + N; }
  function getBest() { try { return localStorage.getItem(key()); } catch (e) { return null; } }
  function setup(n) {
    N = n; board.innerHTML = ''; tiles = [];
    document.querySelectorAll('.sizes [data-n]').forEach(function (b) { b.classList.toggle('on', +b.dataset.n === N); });
    for (var i = 1; i < N * N; i++) {
      var t = document.createElement('div'); t.className = 'tile'; t.textContent = i; t.dataset.v = i;
      t.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(+this.dataset.v); });
      board.appendChild(t); tiles[i] = t;
    }
    var b = getBest(); bestEl.textContent = b ? b + 's' : '–';
    shuffle();
  }
  function shuffle() {
    cells = []; for (var i = 1; i < N * N; i++) cells.push(i); cells.push(0);
    var e = N * N - 1, last = -1;
    for (var k = 0; k < N * N * 40; k++) { // random legal moves => always solvable
      var nb = neighbors(e).filter(function (p) { return p !== last; });
      var p = nb[Math.floor(Math.random() * nb.length)];
      cells[e] = cells[p]; cells[p] = 0; last = e; e = p;
    }
    if (solved()) return shuffle();
    moves = 0; done = false; mvEl.textContent = 0; tmEl.textContent = 0; clearInterval(timer); t0 = null; overlay.hidden = true; layout();
  }
  function neighbors(i) {
    var r = Math.floor(i / N), c = i % N, o = [];
    if (r > 0) o.push(i - N); if (r < N - 1) o.push(i + N); if (c > 0) o.push(i - 1); if (c < N - 1) o.push(i + 1);
    return o;
  }
  function layout() {
    var gap = 2, s = 100 / N;
    cells.forEach(function (v, i) {
      if (!v) return; var t = tiles[v];
      t.style.left = 'calc(' + (i % N) * s + '% + ' + gap + 'px)'; t.style.top = 'calc(' + Math.floor(i / N) * s + '% + ' + gap + 'px)';
      t.style.width = t.style.height = 'calc(' + s + '% - ' + gap * 2 + 'px)';
      t.classList.toggle('ok', v === i + 1);
    });
  }
  function solved() { for (var i = 0; i < N * N - 1; i++) if (cells[i] !== i + 1) return false; return true; }
  function tap(v) {
    if (done) return;
    var i = cells.indexOf(v), e = cells.indexOf(0), r = Math.floor(i / N), c = i % N, er = Math.floor(e / N), ec = e % N;
    if (r !== er && c !== ec) return;
    var step = r === er ? (ec > c ? -1 : 1) : (er > r ? -N : N);
    while (e !== i) { cells[e] = cells[e + step]; cells[e + step] = 0; e += step; moves++; } // slide a whole row/column
    afterMove();
  }
  function afterMove() {
    if (!t0) { t0 = Date.now(); timer = setInterval(function () { tmEl.textContent = Math.floor((Date.now() - t0) / 1000); }, 250); }
    mvEl.textContent = moves; layout();
    if (solved()) {
      done = true; clearInterval(timer);
      var secs = Math.max(1, Math.round((Date.now() - t0) / 1000)), b = getBest();
      if (!b || secs < +b) { try { localStorage.setItem(key(), secs); } catch (e) {} bestEl.textContent = secs + 's'; }
      msg.textContent = 'Solved! 完成！ ' + moves + ' moves 步 · ' + secs + 's';
      setTimeout(function () { overlay.hidden = false; }, 200);
    }
  }
  document.addEventListener('keydown', function (e) {
    var d = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 }[e.key];
    if (d === undefined || done) return; e.preventDefault();
    var em = cells.indexOf(0), src = em + d;
    if (src < 0 || src >= N * N) return;
    if ((d === 1 || d === -1) && Math.floor(src / N) !== Math.floor(em / N)) return;
    cells[em] = cells[src]; cells[src] = 0; moves++; afterMove();
  });
  document.querySelectorAll('.sizes [data-n]').forEach(function (b) { b.onclick = function () { setup(+b.dataset.n); }; });
  document.getElementById('shuffle').onclick = shuffle;
  document.getElementById('again').onclick = shuffle;
  setup(4);
})();
