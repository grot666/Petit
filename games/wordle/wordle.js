(function () {
  'use strict';
  var WORDS = ('apple bread chair dance eagle flame grape house image juice knife lemon mango night ocean piano queen river stone table uncle voice water youth zebra about above actor adult after again agree alarm album alert alive allow alone along amber angle angry ankle apron arena argue arise armor arrow aside audio award aware bacon badge baker basic beach beard beast begin being bench berry birth black blade blame blank blast blend bless blind block bloom board boast brain brave brick bride brief bring broad brown brush build bunch burst cabin cable camel candy cargo carry catch cause chalk charm chart chase cheap check cheek chess chest chief child chill choir civic claim clean clear clerk click cliff climb clock close cloth cloud coach coast cocoa coral couch count cover crane crash cream crisp crowd crown crumb curve cycle daily dairy dream dress drift drink drive eager early earth eight elbow empty enjoy entry equal event exact extra fable faith false feast fence ferry fever field fifty final first flock floor flour fluid focus forest forge forty frame fresh front frost fruit giant ghost glass globe glory glove grace grain grand grass green greet guard guess guide habit happy harbor heart heavy hello honey horse hotel humor ideal index inner input irony ivory jelly jewel joint judge kayak knock label laugh layer learn light limit linen lodge logic loyal lucky lunar lunch magic maple march match mayor medal melon merry metal minor mirth model money month moral motor mount mouse mouth movie music noble noise north novel nurse olive onion orbit order other otter paint panel paper party peace peach pearl pedal phone photo pilot pitch pizza place plain plane plant plate plaza poem point polar pound power press price pride prime print prize proof proud pupil quiet quilt quote radio raise ranch rapid raven reach ready relax reply ridge right rival roast robin robot rocky round route royal ruler salad sauce scale scarf scene scent score scout sense seven shade shape share sharp sheep shelf shell shine shirt shore short shout sight silly skate skill skirt sleep slice smile smoke snack snake solar solid sound south space spare spark spice spoon sport spray squad stage stamp stand start steam steel stick still storm story stove straw sugar sunny sweet swing sword taste teach tiger toast token topic torch total tower track trade trail train treat trend trial trick truck trust truth tulip tutor twist ultra unity upper urban usual valid value vapor vivid vocal wagon waste watch whale wheat wheel white whole woman world worry write yacht yield young').split(' ').filter(function (w) { return w.length === 5; });
  var gridEl = document.getElementById('grid'), kbEl = document.getElementById('kb'), toast = document.getElementById('toast');
  var modeEl = document.getElementById('mode'), streakEl = document.getElementById('streak');
  var KEY = 'petit.wordle.streak';
  var answer, row, col, guesses, done, tiles = [], keys = {}, mode;

  function load() { try { return +(localStorage.getItem(KEY) || 0); } catch (e) { return 0; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  streakEl.textContent = load();

  for (var r = 0; r < 6; r++) {
    var re = document.createElement('div'); re.className = 'row'; tiles.push([]);
    for (var c = 0; c < 5; c++) { var t = document.createElement('div'); t.className = 't'; re.appendChild(t); tiles[r].push(t); }
    gridEl.appendChild(re);
  }
  ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'].forEach(function (line) {
    var kr = document.createElement('div'); kr.className = 'kr';
    line.split('').forEach(function (ch) {
      var b = document.createElement('button'); b.className = 'k'; b.type = 'button';
      if (ch === '+') { b.textContent = 'Enter'; b.className += ' wide'; b.dataset.k = 'Enter'; }
      else if (ch === '-') { b.textContent = '⌫'; b.className += ' wide'; b.dataset.k = 'Backspace'; }
      else { b.textContent = ch; b.dataset.k = ch; keys[ch] = b; }
      b.addEventListener('click', function () { press(b.dataset.k); b.blur(); });
      kr.appendChild(b);
    });
    kbEl.appendChild(kr);
  });

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function start(m) {
    mode = m;
    answer = m === 'daily' ? WORDS[hash('petit' + today()) % WORDS.length] : WORDS[Math.floor(Math.random() * WORDS.length)];
    row = 0; col = 0; guesses = [[], [], [], [], [], []]; done = false; toast.textContent = '';
    modeEl.textContent = m === 'daily' ? 'Daily' : 'Free';
    tiles.forEach(function (r) { r.forEach(function (t) { t.className = 't'; t.textContent = ''; }); });
    Object.keys(keys).forEach(function (k) { keys[k].className = 'k'; });
  }
  function say(s) { toast.textContent = s; }
  function press(k) {
    if (done) return;
    if (k === 'Enter') return submit();
    if (k === 'Backspace') { if (col > 0) { col--; guesses[row].pop(); paint(); } return; }
    if (/^[a-z]$/.test(k) && col < 5) { guesses[row].push(k); col++; paint(); }
  }
  function paint() {
    for (var c = 0; c < 5; c++) { var t = tiles[row][c], ch = guesses[row][c] || ''; t.textContent = ch; t.classList.toggle('filled', !!ch); }
  }
  function rank(cls) { return { x: 1, y: 2, g: 3 }[cls] || 0; }
  function submit() {
    if (col < 5) { say('Need 5 letters · 需要五个字母'); var re = gridEl.children[row]; re.classList.remove('shake'); void re.offsetWidth; re.classList.add('shake'); return; }
    var g = guesses[row], res = ['x', 'x', 'x', 'x', 'x'], pool = answer.split('');
    for (var i = 0; i < 5; i++) if (g[i] === answer[i]) { res[i] = 'g'; pool[i] = null; }
    for (i = 0; i < 5; i++) if (res[i] !== 'g') { var j = pool.indexOf(g[i]); if (j >= 0) { res[i] = 'y'; pool[j] = null; } }
    for (i = 0; i < 5; i++) {
      tiles[row][i].classList.add(res[i]);
      var kb = keys[g[i]], cur = (kb.className.match(/ (g|y|x)$/) || [])[1];
      if (rank(res[i]) > rank(cur)) kb.className = 'k ' + res[i];
    }
    say('');
    if (g.join('') === answer) { done = true; say(['Genius! 天才！', 'Brilliant! 太棒了！', 'Great! 很好！', 'Nice! 不错！', 'Phew! 好险！', 'Just made it! 最后一次！'][row]); var s = load() + 1; save(s); streakEl.textContent = s; return; }
    row++; col = 0;
    if (row === 6) { done = true; say('The word was 答案是 ' + answer.toUpperCase()); save(0); streakEl.textContent = 0; }
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Enter' || k === 'Backspace' || /^[a-z]$/.test(k)) { e.preventDefault(); press(k); }
  });
  document.getElementById('daily').onclick = function () { start('daily'); this.blur(); };
  document.getElementById('random').onclick = function () { start('free'); this.blur(); };
  start('daily');
})();
