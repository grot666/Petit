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
  var sq = [], NAMES = ['左上', '上中', '右上', '左中', '中', '右中', '左下', '下中', '右下'];
  var fbEl = $('fb'), hintEl = $('hint'), letterEl = $('letter'), practiceEl = $('practice'), fbTimer = null;
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
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      speechSynthesis.resume();
      var u = new SpeechSynthesisUtterance(letter.toLowerCase() === 'l' ? 'el' : letter);
      if (voice) u.voice = voice; u.lang = voice ? voice.lang : 'en-US'; u.rate = 1.0; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  var running = false, timer = null, seq, t, resp, stats;

  function renderMeta() {
    $('n').textContent = data.n; $('best').textContent = data.best; $('sessions').textContent = data.history.length;
    var h = $('history'); h.innerHTML = '';
    data.history.slice(-15).reverse().forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = new Date(r.date).toLocaleString() + ' · N=' + r.n + ' · ' + r.score + '%' + (r.practice ? ' · 提示' : '') + (r.next !== r.n ? ' → N=' + r.next : '');
      if (r.log) {
        var d = document.createElement('details'), sm = document.createElement('summary');
        sm.textContent = '查看逐轮记录 · View log'; d.appendChild(sm);
        d.addEventListener('toggle', function () { if (d.open && !d._done) { d._done = true; var b = document.createElement('div'); b.className = 'logbox'; b.innerHTML = logTable(r.log, r.n); d.appendChild(b); } });
        li.appendChild(d);
      }
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

  function flash(btn, cls) {
    btn.classList.remove('good', 'bad', 'miss'); void btn.offsetWidth; btn.classList.add(cls);
    clearTimeout(btn._t); btn._t = setTimeout(function () { btn.classList.remove(cls); }, 600);
  }
  var fbParts = [];
  function say2(html, keep) {
    if (!keep) fbParts = [];
    fbParts.push(html); fbEl.innerHTML = fbParts.join(' &nbsp; ');
    clearTimeout(fbTimer); fbTimer = setTimeout(function () { fbEl.innerHTML = ''; fbParts = []; }, 1400);
  }
  function live() {
    $('liveHit').textContent = stats.pos.hit + stats.snd.hit;
    $('liveErr').textContent = stats.pos.fa + stats.snd.fa;
    $('liveMiss').textContent = stats.pos.miss + stats.snd.miss;
  }
  var LABEL = { pos: '位置', snd: '声音' };

  function press(kind) {
    if (!running || t < 0 || resp[kind]) return;
    resp[kind] = true;
    var btn = kind === 'pos' ? posBtn : sndBtn;
    if (isMatch(kind, t)) { stats[kind].hit++; flash(btn, 'good'); say2('<span class="g">✓ ' + LABEL[kind] + '正确</span>', true); }
    else { stats[kind].fa++; flash(btn, 'bad'); say2('<span class="r">✗ ' + LABEL[kind] + (t < seq.n ? '：前 ' + seq.n + ' 轮不用按' : '不匹配') + '</span>', true); }
    live();
  }

  var RES = { hit: ['命中', 'r-hit'], miss: ['漏掉', 'r-miss'], fa: ['误按', 'r-fa'], cr: ['正确不按', 'r-cr'] };
  function outcome(m, pressed) { return m ? (pressed ? 'hit' : 'miss') : (pressed ? 'fa' : 'cr'); }
  function esc(x) { return String(x); }
  function logTable(log, n) {
    var rows = log.map(function (r) {
      var back = r.i >= n ? NAMES[r.bp] + ' · ' + r.bl : '—';
      var cell = function (k) { var o = RES[k]; return '<td class="' + o[1] + '">' + o[0] + '</td>'; };
      return '<tr><td>' + (r.i + 1) + '</td><td>' + NAMES[r.p] + ' · ' + esc(r.l) + '</td><td>' + back + '</td>' +
        '<td>' + (r.pm ? '位置✓' : '') + (r.sm ? ' 声音✓' : '') + (!r.pm && !r.sm ? '—' : '') + '</td>' +
        '<td>' + (r.bpPress ? '位置' : '') + (r.bsPress ? ' 声音' : '') + (!r.bpPress && !r.bsPress ? '—' : '') + '</td>' +
        cell(r.rp) + cell(r.rs) + '</tr>';
    }).join('');
    return '<table class="log"><tr><th>#</th><th>本轮</th><th>' + n + '轮前</th><th>匹配</th><th>你按了</th><th>位置结果</th><th>声音结果</th></tr>' + rows + '</table>';
  }
  function logText(log, n) {
    return ['#\t本轮\t' + n + '轮前\t位置匹配\t声音匹配\t按位置\t按声音\t位置结果\t声音结果'].concat(log.map(function (r) {
      return [r.i + 1, NAMES[r.p] + ' ' + r.l, r.i >= n ? NAMES[r.bp] + ' ' + r.bl : '-', r.pm ? 'Y' : 'N', r.sm ? 'Y' : 'N', r.bpPress ? 'Y' : 'N', r.bsPress ? 'Y' : 'N', RES[r.rp][0], RES[r.rs][0]].join('\t');
    })).join('\n');
  }
  function showLog() {
    $('logwrap').hidden = false;
    var box = $('logbox'); box.innerHTML = logTable(seq.log, seq.n); box.scrollTop = box.scrollHeight;
  }
  function endTrial() {
    var pm = isMatch('pos', t), sm = isMatch('snd', t);
    seq.log.push({ i: t, p: seq.pos[t], l: seq.snd[t], bp: t >= seq.n ? seq.pos[t - seq.n] : null, bl: t >= seq.n ? seq.snd[t - seq.n] : null,
      pm: pm, sm: sm, bpPress: resp.pos, bsPress: resp.snd, rp: outcome(pm, resp.pos), rs: outcome(sm, resp.snd) });
    showLog();
    var missed = [];
    ['pos', 'snd'].forEach(function (k) {
      if (isMatch(k, t) && !resp[k]) { stats[k].miss++; missed.push(LABEL[k]); flash(k === 'pos' ? posBtn : sndBtn, 'miss'); }
    });
    if (missed.length) say2('<span class="m">漏掉了：' + missed.join('/') + '</span>');
    live();
  }

  function step() {
    if (t >= 0) endTrial();
    t++;
    if (t >= seq.total) return finish();
    if (!/漏掉/.test(fbEl.textContent) || t === 0) { fbParts = []; fbEl.innerHTML = ''; } else fbParts = [];
    resp = { pos: false, snd: false };
    $('trialInfo').textContent = '第 ' + (t + 1) + ' / ' + seq.total + ' 轮 · N = ' + seq.n;
    progress.textContent = '';
    if (t < seq.n) hintEl.textContent = '先记住，暂时不用按';
    else if (seq.practice) hintEl.textContent = seq.n + '轮前：' + NAMES[seq.pos[t - seq.n]] + ' · ' + seq.snd[t - seq.n];
    else hintEl.textContent = '';
    letterEl.textContent = seq.practice ? seq.snd[t] : '';
    var cell = sq[seq.pos[t]];
    cell.classList.add('on');
    say(seq.snd[t]);
    setTimeout(function () { cell.classList.remove('on'); if (!speech) sq[4].textContent = ''; }, SHOW_MS);
    timer = setTimeout(step, TRIAL_MS);
  }

  function start() {
    if (speech) { try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (e) {} } // unlock audio on iOS
    seq = makeSequence(data.n); seq.practice = practiceEl.checked; seq.log = []; t = -1; showLog(); running = true;
    data.practice = practiceEl.checked; save();
    stats = { pos: { hit: 0, miss: 0, fa: 0 }, snd: { hit: 0, miss: 0, fa: 0 } }; live();
    fbEl.innerHTML = ''; practiceEl.disabled = true;
    resultEl.hidden = true; startBtn.textContent = '停止 Stop'; setNButtons(true);
    timer = setTimeout(step, 600);
  }
  function stop(msg) {
    running = false; clearTimeout(timer); startBtn.textContent = '开始 Start'; practiceEl.disabled = false;
    hintEl.textContent = ''; letterEl.textContent = ''; $('trialInfo').textContent = ''; setNButtons(false);
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
    if (!seq.practice) { if (score >= 80) next = Math.min(9, n + 1); else if (score < 50) next = Math.max(1, n - 1); }
    data.n = next; data.best = Math.max(data.best, n, next);
    data.history.push({ date: Date.now(), n: n, score: score, next: next, pos: P, snd: S, practice: seq.practice, log: seq.log });
    var withLog = 0;
    for (var hi = data.history.length - 1; hi >= 0; hi--) { if (data.history[hi].log && ++withLog > 30) delete data.history[hi].log; }
    if (data.history.length > 200) data.history = data.history.slice(-200);
    save(); try { localStorage.setItem('petit.nback.best', data.best); } catch (e) {}
    stop('Block complete · 本轮完成');
    var verdict = seq.practice ? '提示模式不升降级，关闭提示模式后正式计分。Practice mode: N unchanged.' : next > n ? 'Great, N goes up to ' + next + '. 进步！升到 N=' + next : next < n ? 'N goes down to ' + next + '. 降到 N=' + next : 'Stay at N=' + n + '. 保持 N=' + n;
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
  practiceEl.checked = data.practice === undefined ? data.n <= 2 : !!data.practice;
  practiceEl.onchange = function () { data.practice = practiceEl.checked; save(); };
  $('copyLog').onclick = function () {
    if (!seq || !seq.log) return;
    var txt = logText(seq.log, seq.n), btn = this;
    var done = function () { btn.textContent = '已复制 Copied'; setTimeout(function () { btn.textContent = '复制记录 Copy'; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { window.prompt('Copy:', txt); });
    else window.prompt('Copy:', txt);
  };
  window.__nback = { get seq() { return seq; }, get t() { return t; }, press: press };
  renderMeta();
})();
