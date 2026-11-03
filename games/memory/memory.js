(function () {
  'use strict';
  var ICONS = ['🌙', '🍋', '🌿', '🐚', '🎈', '🪐', '🍄', '🦋', '🌸', '🐟', '🍒', '⭐'];
  var KEY = 'petit.memory.best';
  var board = document.getElementById('board'), movesEl = document.getElementById('moves'), timeEl = document.getElementById('time');
  var bestEl = document.getElementById('best'), overlay = document.getElementById('overlay'), msg = document.getElementById('msg');
  var open, moves, matched, lock, timer, start;
  var best = null; try { best = localStorage.getItem(KEY); } catch (e) {}
  bestEl.textContent = best || '–';

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function newGame() {
    clearInterval(timer); start = null; open = []; moves = 0; matched = 0; lock = false;
    movesEl.textContent = 0; timeEl.textContent = 0; overlay.hidden = true; board.innerHTML = '';
    var set = shuffle(ICONS.slice()).slice(0, 8), deck = shuffle(set.concat(set));
    deck.forEach(function (ic) {
      var b = document.createElement('button'); b.className = 'card'; b.dataset.icon = ic; b.setAttribute('aria-label', 'Hidden card');
      b.innerHTML = '<div class="inner"><div class="face back"></div><div class="face front">' + ic + '</div></div>';
      b.addEventListener('click', function () { flip(b); });
      board.appendChild(b);
    });
  }
  function flip(b) {
    if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
    if (!start) { start = Date.now(); timer = setInterval(function () { timeEl.textContent = Math.floor((Date.now() - start) / 1000); }, 250); }
    b.classList.add('up'); b.setAttribute('aria-label', b.dataset.icon); open.push(b);
    if (open.length < 2) return;
    moves++; movesEl.textContent = moves;
    var a = open[0], c = open[1]; open = [];
    if (a.dataset.icon === c.dataset.icon) {
      a.classList.add('done'); c.classList.add('done'); matched += 2;
      if (matched === 16) win();
    } else {
      lock = true;
      setTimeout(function () {
        a.classList.remove('up'); c.classList.remove('up');
        a.setAttribute('aria-label', 'Hidden card'); c.setAttribute('aria-label', 'Hidden card'); lock = false;
      }, 750);
    }
  }
  function win() {
    clearInterval(timer);
    var secs = Math.floor((Date.now() - start) / 1000), nb = !best || moves < +best;
    if (nb) { best = moves; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch (e) {} }
    setTimeout(function () { msg.textContent = 'All pairs found · ' + moves + ' moves · ' + secs + 's' + (nb ? ' · new best!' : ''); overlay.hidden = false; }, 500);
  }
  document.getElementById('restart').onclick = newGame;
  document.getElementById('again').onclick = newGame;
  newGame();
})();
