(function () {
  'use strict';
  var pad = document.getElementById('pad'), big = document.getElementById('big'), small = document.getElementById('small');
  var avgEl = document.getElementById('avg'), bestEl = document.getElementById('best'), triesEl = document.getElementById('tries');
  var KEY = 'petit.reaction.best', state = 'idle', timer, t0, times = [];
  function getBest() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  var b0 = getBest(); if (b0) bestEl.textContent = b0 + ' ms';
  function show(cls, a, b) { pad.className = cls; big.textContent = a; small.textContent = b; }
  function arm() {
    state = 'wait'; show('wait', 'Wait for green…', '等变绿…');
    timer = setTimeout(function () { state = 'go'; t0 = performance.now(); show('go', 'TAP!', '点！'); }, 1200 + Math.random() * 2800);
  }
  function rate(ms) { return ms < 200 ? 'Lightning 闪电' : ms < 250 ? 'Sharp 很快' : ms < 320 ? 'Normal 正常' : 'Sleepy 有点困'; }
  function hit() {
    if (state === 'idle' || state === 'result') { if (times.length >= 5) { times = []; triesEl.innerHTML = ''; avgEl.textContent = '–'; } return arm(); }
    if (state === 'wait') { clearTimeout(timer); state = 'result'; return show('early', 'Too soon!', '太早了！点击重试'); }
    if (state === 'go') {
      var ms = Math.round(performance.now() - t0); times.push(ms);
      var s = document.createElement('span'); s.textContent = ms + ' ms'; triesEl.appendChild(s);
      var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length); avgEl.textContent = avg + ' ms';
      state = 'result';
      if (times.length >= 5) {
        var b = getBest(); if (!b || avg < +b) { try { localStorage.setItem(KEY, avg); } catch (e) {} bestEl.textContent = avg + ' ms'; }
        show('', avg + ' ms avg', rate(avg) + ' · tap to go again 点击再测');
      } else show('', ms + ' ms', rate(ms) + ' · ' + (5 - times.length) + ' to go 还剩 ' + (5 - times.length) + ' 次，点击继续');
    }
  }
  pad.addEventListener('pointerdown', function (e) { e.preventDefault(); hit(); });
  document.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(); } });
})();
