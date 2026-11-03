(function () {
  'use strict';
  var WORDS = ('the quiet river carried light past the old mill while small birds argued in the hedges above a road that ' +
    'nobody used anymore summer came late that year and the orchard filled with pears soft enough to bruise at a ' +
    'glance she kept a notebook of clouds and named each one after a city she had never seen paper lanterns hung ' +
    'from every window in the square and children counted them twice to be sure good tea needs patient water and ' +
    'a cup that remembers the last one a fox crossed the field at dusk looking back once as if to check we were ' +
    'still there the map was wrong in three places which made it far more interesting to follow every library has ' +
    'one book that nobody has opened in years waiting with perfect calm the train slowed for a station without a ' +
    'name and then thought better of it a single lamp in the window is enough to make a dark street feel kind').split(' ');
  var LEN = 30, KEY = 'petit.typing.best';
  var textEl = document.getElementById('text'), input = document.getElementById('input');
  var timeEl = document.getElementById('time'), wpmEl = document.getElementById('wpm'), accEl = document.getElementById('acc');
  var bestEl = document.getElementById('best'), resultEl = document.getElementById('result');
  var target, typed, started, startTime, timer, done, keystrokes, errors, spans;
  var best = 0; try { best = +(localStorage.getItem(KEY) || 0); } catch (e) {}
  bestEl.textContent = best;

  function makeText() {
    var out = [], i = Math.floor(Math.random() * WORDS.length);
    while (out.join(' ').length < 600) { out.push(WORDS[i % WORDS.length]); i += 1 + (Math.random() < 0.15 ? Math.floor(Math.random() * 20) : 0); }
    return out.join(' ');
  }
  function reset() {
    clearInterval(timer);
    target = makeText(); typed = ''; started = false; done = false; keystrokes = 0; errors = 0;
    textEl.innerHTML = ''; spans = [];
    for (var i = 0; i < target.length; i++) { var s = document.createElement('span'); s.textContent = target[i]; textEl.appendChild(s); spans.push(s); }
    timeEl.textContent = LEN; wpmEl.textContent = 0; accEl.textContent = '100%'; resultEl.textContent = '';
    input.value = ''; paint(); focus();
  }
  function focus() { input.focus({ preventScroll: true }); }
  function correctChars() { var n = 0; for (var i = 0; i < typed.length; i++) if (typed[i] === target[i]) n++; return n; }
  function stats() {
    var mins = Math.max((Date.now() - startTime) / 60000, 1 / 60);
    var wpm = Math.round(correctChars() / 5 / mins);
    var acc = keystrokes ? Math.round(100 * (keystrokes - errors) / keystrokes) : 100;
    return { wpm: wpm, acc: acc };
  }
  function paint() {
    for (var i = 0; i < spans.length; i++) {
      var cls = i < typed.length ? (typed[i] === target[i] ? 'ok' : 'bad') : '';
      if (i === typed.length) cls += ' cur';
      spans[i].className = cls;
    }
    var cur = spans[typed.length];
    if (cur) textEl.scrollTop = Math.max(0, cur.offsetTop - textEl.offsetTop - 36);
  }
  function finish() {
    done = true; clearInterval(timer); timeEl.textContent = 0;
    var s = stats(); wpmEl.textContent = s.wpm; accEl.textContent = s.acc + '%';
    var nb = s.wpm > best;
    if (nb) { best = s.wpm; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch (e) {} }
    resultEl.innerHTML = '<b>' + s.wpm + '</b> words per minute · ' + s.acc + '% accuracy' + (nb ? ' · new best!' : '');
  }
  input.addEventListener('input', function () {
    if (done) { input.value = typed; return; }
    var v = input.value;
    if (!started && v.length) {
      started = true; startTime = Date.now();
      timer = setInterval(function () {
        var left = LEN - Math.floor((Date.now() - startTime) / 1000);
        timeEl.textContent = Math.max(0, left);
        var s = stats(); wpmEl.textContent = s.wpm; accEl.textContent = s.acc + '%';
        if (left <= 0) finish();
      }, 200);
    }
    if (v.length > typed.length) {
      for (var i = typed.length; i < v.length; i++) { keystrokes++; if (v[i] !== target[i]) errors++; }
    }
    typed = v.slice(0, target.length);
    if (typed.length === target.length) finish();
    paint();
  });
  textEl.addEventListener('click', focus);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || (e.key === 'Enter' && done)) { e.preventDefault(); reset(); return; }
    if (document.activeElement !== input && e.key.length === 1 && !e.metaKey && !e.ctrlKey) focus();
  });
  document.getElementById('restart').onclick = reset;
  reset();
})();
