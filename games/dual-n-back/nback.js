(function () {
  'use strict';
  var LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
  var POS = [0, 1, 2, 3, 5, 6, 7, 8]; // centre square stays empty, as in Brain Workshop
  var KEY = 'petit.nback';
  var q = new URLSearchParams(location.search);
  var TRIAL_MS = +q.get('ms') || 3000, SHOW_MS = Math.min(500, TRIAL_MS * 0.4);
  var $ = function (id) { return document.getElementById(id); };
  var gridEl = $('grid'), posBtn = $('posBtn'), sndBtn = $('sndBtn'), startBtn = $('start');
  var progress = $('progress'), resultEl = $('result');
  var sq = [];
  for (var i = 0; i < 9; i++) { var d = document.createElement('div'); d.className = 'sq' + (i === 4 ? ' mid' : ''); gridEl.appendChild(d); sq.push(d); }

  var data = { n: 2, best: 2, history: [] };
  try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) data = Object.assign(data, s); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  if (data.best) try { localStorage.setItem('petit.nback.best', data.best); } catch (e) {}

  var speech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  var voice = null;
  function pickVoice() {
    if (!speech) return;
    var vs = speechSynthesis.getVoices();
    voice = vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || vs[0] || null;
  }
  if (speech) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  if (!speech) $('speechNote').hidden = false;
  function say(letter) {
    if (!speech) { sq[4].textContent = letter; return; }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(letter.toLowerCase() === 'l' ? 'el' : letter);
      if (voice) u.voice = voice; u.lang = voice ? voice.lang : 'en-US'; u.rate = 1.1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  var running = false, timer = null, seq, t, resp, stats;

  function renderMeta() {
    $('n').textContent = data.n; $('best').textContent = data.best; $('sessions').textContent = data.history.length;
    var h = $('history'); h.innerHTML = '';
    data.history.slice(-15).reverse().forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = new Date(r.date).toLocaleString() + ' · N=' + r.n + ' · ' + r.score + '%' + (r.next !== r.n ? ' → N=' + r.next : '');
      h.appendChild(li);
    });
    if (!data.history.length) h.innerHTML = '<li>No sessions yet · 暂无记录</li>';
  }

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function pickOther(arr, not) { var c; do { c = arr[Math.floor(Math.random() * arr.length)]; } while (c === not); return c; }

  function makeSequence(n) {
    var total = 20 + n, eligible = [];
    for (var i = n; i < total; i++) eligible.push(i);
    var posT = shuffle(eligible.slice()).slice(0, 6);
    var overlap = shuffle(posT.slice()).slice(0, 2);
    var rest = shuffle(eligible.filter(function (i) { return posT.indexOf(i) < 0; })).slice(0, 4);
    var sndT = overlap.concat(rest);
    var p = [], l = [];
    for (i = 0; i < total; i++) {
      if (i < n) { p.push(pickOther(POS)); l.push(pickOther(LETTERS)); continue; }
      p.push(posT.indexOf(i) >= 0 ? p[i - n] : pickOther(POS, p[i - n]));
      l.push(sndT.indexOf(i) >= 0 ? l[i - n] : pickOther(LETTERS, l[i - n]));
    }
    return { n: n, pos: p, snd: l, total: total };
  }
  function isMatch(kind, i) { return i >= seq.n && seq[kind][i] === seq[kind][i - seq.n]; }

  function flash(btn, cls) { btn.classList.remove('good', 'bad', 'miss'); void btn.offsetWidth; btn.classList.add(cls); setTimeout(function () { btn.classList.remove(cls); }, 350); }

  function press(kind) {
    if (!running || t < 0 || resp[kind]) return;
    resp[kind] = true;
    var btn = kind === 'pos' ? posBtn : sndBtn;
    if (isMatch(kind, t)) { stats[kind].hit++; flash(btn, 'good'); }
    else { stats[kind].fa++; flash(btn, 'bad'); }
  }

  function endTrial() {
    ['pos', 'snd'].forEach(function (k) {
      if (isMatch(k, t) && !resp[k]) { stats[k].miss++; flash(k === 'pos' ? posBtn : sndBtn, 'miss'); }
    });
  }

  function step() {
    if (t >= 0) endTrial();
    t++;
    if (t >= seq.total) return finish();
    resp = { pos: false, snd: false };
    progress.textContent = 'Trial ' + (t + 1) + ' / ' + seq.total + ' · N = ' + seq.n;
    var cell = sq[seq.pos[t]];
    cell.classList.add('on');
    say(seq.snd[t]);
    setTimeout(function () { cell.classList.remove('on'); if (!speech) sq[4].textContent = ''; }, SHOW_MS);
    timer = setTimeout(step, TRIAL_MS);
  }

  function start() {
    if (speech) { try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {} } // unlock audio on iOS
    seq = makeSequence(data.n); t = -1; running = true;
    stats = { pos: { hit: 0, miss: 0, fa: 0 }, snd: { hit: 0, miss: 0, fa: 0 } };
    resultEl.hidden = true; startBtn.textContent = 'Stop'; setNButtons(true);
    timer = setTimeout(step, 600);
  }
  function stop(msg) {
    running = false; clearTimeout(timer); startBtn.textContent = 'Start'; setNButtons(false);
    sq.forEach(function (s) { s.classList.remove('on'); }); sq[4].textContent = '';
    if (speech) try { speechSynthesis.cancel(); } catch (e) {}
    progress.textContent = msg || '';
  }
  function pct(s) { var d = s.hit + s.miss + s.fa; return d ? Math.round(100 * s.hit / d) : 100; }
  function finish() {
    var P = stats.pos, S = stats.snd;
    var hits = P.hit + S.hit, denom = hits + P.miss + S.miss + P.fa + S.fa;
    var score = denom ? Math.round(100 * hits / denom) : 100;
    var n = seq.n, next = n;
    if (score >= 80) next = Math.min(9, n + 1); else if (score < 50) next = Math.max(1, n - 1);
    data.n = next; data.best = Math.max(data.best, n, next);
    data.history.push({ date: Date.now(), n: n, score: score, next: next, pos: P, snd: S });
    if (data.history.length > 200) data.history = data.history.slice(-200);
    save(); try { localStorage.setItem('petit.nback.best', data.best); } catch (e) {}
    stop('Block complete · 本轮完成');
    var verdict = next > n ? 'Great, N goes up to ' + next + '. 进步！升到 N=' + next : next < n ? 'N goes down to ' + next + '. 降到 N=' + next : 'Stay at N=' + n + '. 保持 N=' + n;
    resultEl.innerHTML = '<p><b>' + score + '%</b> overall · 总正确率 — ' + verdict + '</p>' +
      '<table><tr><th></th><th>Hits</th><th>Misses</th><th>False alarms</th><th>Accuracy</th></tr>' +
      '<tr><td>Position 位置</td><td>' + P.hit + '</td><td>' + P.miss + '</td><td>' + P.fa + '</td><td>' + pct(P) + '%</td></tr>' +
      '<tr><td>Sound 声音</td><td>' + S.hit + '</td><td>' + S.miss + '</td><td>' + S.fa + '</td><td>' + pct(S) + '%</td></tr></table>';
    resultEl.hidden = false; renderMeta();
  }
  function setNButtons(dis) { $('nDown').disabled = dis; $('nUp').disabled = dis; }

  $('nDown').onclick = function () { data.n = Math.max(1, data.n - 1); save(); renderMeta(); };
  $('nUp').onclick = function () { data.n = Math.min(9, data.n + 1); save(); renderMeta(); };
  startBtn.onclick = function () { if (running) stop('Stopped · 已停止'); else start(); };
  posBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); press('pos'); });
  sndBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); press('snd'); });
  document.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var k = e.key.toLowerCase();
    if (k === 'a') press('pos');
    else if (k === 'l') press('snd');
    else if (k === ' ' || k === 'enter') { if (e.target.tagName !== 'BUTTON') { e.preventDefault(); startBtn.click(); } }
  });
  window.__nback = { get seq() { return seq; }, get t() { return t; }, press: press };
  renderMeta();
})();
