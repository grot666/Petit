(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var clock = $('clock'), label = $('label'), arc = $('arc'), ring = $('ring'), startBtn = $('start'), dots = $('dots');
  var C = 2 * Math.PI * 52; arc.style.strokeDasharray = C;
  var LBL = { focus: 'Focus · 专注', short: 'Short break · 短休息', long: 'Long break · 长休息' };
  var KEY = 'petit.pomodoro', st = { f: 25, s: 5, l: 15, done: 0, day: '' };
  try { var sv = JSON.parse(localStorage.getItem(KEY)); if (sv) st = Object.assign(st, sv); } catch (e) {}
  var today = new Date().toDateString(); if (st.day !== today) { st.day = today; st.done = 0; }
  $('fMin').value = st.f; $('sMin').value = st.s; $('lMin').value = st.l;
  var mode = 'focus', total, left, endAt = null, timer = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function mins(m) { return m === 'focus' ? st.f : m === 'short' ? st.s : st.l; }
  function setMode(m) {
    mode = m; stop(); total = left = mins(m) * 60;
    document.querySelectorAll('#modes button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === m); });
    ring.classList.toggle('brk', m !== 'focus'); label.textContent = LBL[m]; paint();
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function paint() {
    clock.textContent = fmt(left); arc.style.strokeDashoffset = C * (1 - left / total);
    document.title = (endAt ? fmt(left) + ' · ' : '') + 'Pomodoro · 番茄钟';
    dots.textContent = st.done ? '🍅'.repeat(Math.min(st.done, 12)) + (st.done > 12 ? ' ×' + st.done : '') : '';
  }
  function chime() {
    try {
      var A = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880, 990].forEach(function (f, i) {
        var o = A.createOscillator(), g = A.createGain(); o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0, A.currentTime + i * .25); g.gain.linearRampToValueAtTime(.2, A.currentTime + i * .25 + .02); g.gain.exponentialRampToValueAtTime(.001, A.currentTime + i * .25 + .9);
        o.connect(g); g.connect(A.destination); o.start(A.currentTime + i * .25); o.stop(A.currentTime + i * .25 + 1);
      });
    } catch (e) {}
  }
  function tick() {
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) { left = 0; finish(); return; }
    paint();
  }
  function start() { endAt = Date.now() + left * 1000; timer = setInterval(tick, 250); startBtn.textContent = 'Pause 暂停'; paint(); }
  function stop() { clearInterval(timer); timer = null; endAt = null; startBtn.textContent = 'Start 开始'; }
  function finish() {
    stop(); chime();
    if (mode === 'focus') { st.done++; save(); setMode(st.done % 4 === 0 ? 'long' : 'short'); } else setMode('focus');
  }
  startBtn.onclick = function () { if (timer) { stop(); paint(); } else start(); };
  $('reset').onclick = function () { setMode(mode); };
  $('skip').onclick = function () { stop(); if (mode === 'focus') setMode('short'); else setMode('focus'); };
  document.querySelectorAll('#modes button').forEach(function (b) { b.onclick = function () { setMode(b.dataset.m); }; });
  ['fMin', 'sMin', 'lMin'].forEach(function (id, i) {
    $(id).onchange = function () { var v = Math.max(1, Math.min(120, +this.value || 1)); this.value = v; st[['f', 's', 'l'][i]] = v; save(); if (!timer) setMode(mode); };
  });
  setMode('focus');
})();
