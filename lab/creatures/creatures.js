(function () {
  'use strict';
  var SIZE = 12;
  var HALF = 6;
  var COUNT = 8;

  var ADJ = ['Tiny', 'Brave', 'Soft', 'Rusty', 'Mossy', 'Sunny', 'Quiet', 'Speckled',
    'Velvet', 'Pepper', 'Cloudy', 'Lucky', 'Dapper', 'Fuzzy', 'Amber', 'Silver'];
  var ADJ_ZH = ['小小的', '勇敢的', '柔软的', '锈色的', '长苔的', '晴朗的', '安静的', '斑点的',
    '丝绒的', '胡椒的', '多云的', '幸运的', '体面的', '毛茸的', '琥珀的', '银色的'];
  var NOUN = ['Bean', 'Moth', 'Pebble', 'Dumpling', 'Sprout', 'Noodle', 'Pip', 'Crumb',
    'Blip', 'Acorn', 'Wisp', 'Button', 'Muffin', 'Pixel', 'Nudge', 'Mite'];
  var NOUN_ZH = ['豆子', '飞蛾', '卵石', '饺子', '芽', '面条', '籽', '碎屑',
    '光点', '橡果', '游丝', '纽扣', '松饼', '像素', '轻推', '螨'];

  var PALETTES = [
    ['#f7f5f0', '#2b2824', '#b4553c', '#d8b26e', '#7d8f7a'],
    ['#f4f1ea', '#151515', '#c8312a', '#1f3f8f', '#e9c13b'],
    ['#eef6f2', '#264670', '#b04634', '#5e7868', '#d6a652'],
    ['#f6f1e7', '#2c3228', '#5f7358', '#a67c52', '#8b3a2a'],
    ['#f8f6f1', '#2f3640', '#8a9bb0', '#c47a6a', '#d9c9a8'],
    ['#1a1a1e', '#e8e4dc', '#c45a3a', '#6a8cae', '#d4b56a']
  ];

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function randSeed() {
    var n = (Math.random() * 0xffffffff) >>> 0;
    var s = n.toString(16);
    while (s.length < 8) s = '0' + s;
    return s;
  }

  function makeCreature(seedStr) {
    var r = rng(hashStr('petit-critter:' + seedStr));
    var pal = PALETTES[(r() * PALETTES.length) | 0];
    var bg = pal[0], ink = pal[1];
    var bodyCols = pal.slice(2);
    var main = bodyCols[0];
    var accent = bodyCols[1 % bodyCols.length];
    var cheek = bodyCols[2 % bodyCols.length];

    // density / shape params
    var chubby = 0.55 + r() * 0.35;
    var headBoost = 0.15 + r() * 0.25;
    var hasEars = r() < 0.7;
    var hasFeet = r() < 0.85;
    var hasAntenna = r() < 0.35;
    var outline = r() < 0.55;

    var cells = [];
    for (var y = 0; y < SIZE; y++) {
      cells[y] = [];
      for (var x = 0; x < HALF; x++) {
        var nx = (x + 0.5) / HALF;       // 0..1 left→center
        var ny = (y + 0.5) / SIZE;       // 0..1 top→bottom
        // body ellipse (fatter in middle)
        var bx = (1 - nx) ; // distance from center axis, 0 at center
        var by = (ny - 0.52) / 0.42;
        var body = (bx * bx) / (chubby * chubby) + by * by < 1;
        // head
        var hx = (1 - nx);
        var hy = (ny - 0.28) / 0.28;
        var head = (hx * hx) / ((chubby * 0.85) * (chubby * 0.85)) + hy * hy < 1 + headBoost;
        var on = body || head;

        // ears on top corners of head
        if (hasEars && y <= 2 && x >= HALF - 3 && x <= HALF - 2 && r() < 0.85) on = true;
        // antenna
        if (hasAntenna && y === 0 && x === HALF - 2) on = true;
        if (hasAntenna && y === 1 && x === HALF - 2 && r() < 0.7) on = true;
        // feet
        if (hasFeet && y >= SIZE - 2 && nx > 0.25 && nx < 0.85 && r() < 0.9) on = true;
        // small random flecks near body edge
        if (!on && body === false && head === false && r() < 0.04) on = true;

        if (!on) { cells[y][x] = 0; continue; }

        // colour choice
        var col = main;
        if (y <= 3 && r() < 0.25) col = accent;
        if (ny > 0.55 && ny < 0.75 && nx > 0.4 && r() < 0.2) col = accent;
        // cheeks
        if (y >= 4 && y <= 5 && x === HALF - 3) col = cheek;
        cells[y][x] = col;
      }
    }

    // eyes (always)
    var eyeY = 3 + ((r() * 2) | 0);
    var eyeX = HALF - 3;
    cells[eyeY][eyeX] = 'eye';
    // optional smile pixels
    if (r() < 0.65) {
      var sy = eyeY + 2;
      if (sy < SIZE - 2) {
        cells[sy][HALF - 2] = ink;
        if (r() < 0.5) cells[sy][HALF - 3] = ink;
      }
    }

    // mirror
    for (y = 0; y < SIZE; y++) {
      for (x = 0; x < HALF; x++) cells[y][SIZE - 1 - x] = cells[y][x];
    }

    // outline pass (draw empty neighbours of filled as ink) — on full grid
    if (outline) {
      var out = [];
      for (y = 0; y < SIZE; y++) {
        out[y] = cells[y].slice();
        for (x = 0; x < SIZE; x++) {
          if (cells[y][x]) continue;
          var neigh = false;
          for (var dy = -1; dy <= 1 && !neigh; dy++) for (var dx = -1; dx <= 1; dx++) {
            var yy = y + dy, xx = x + dx;
            if (yy < 0 || xx < 0 || yy >= SIZE || xx >= SIZE) continue;
            if (cells[yy][xx] && cells[yy][xx] !== 'eye') neigh = true;
          }
          // only outer rim sparsely
          if (neigh && r() < 0.55) out[y][x] = ink;
        }
      }
      cells = out;
      // re-mirror to keep symmetry after outline randomness on right — actually outline used full grid with mirrored source; right side outline may break symmetry.
      // Re-mirror left→right to restore.
      for (y = 0; y < SIZE; y++) {
        for (x = 0; x < HALF; x++) cells[y][SIZE - 1 - x] = cells[y][x];
      }
    }

    var ai = (r() * ADJ.length) | 0;
    var ni = (r() * NOUN.length) | 0;
    return {
      seed: seedStr,
      cells: cells,
      bg: bg,
      ink: ink,
      nameEn: ADJ[ai] + ' ' + NOUN[ni],
      nameZh: ADJ_ZH[ai] + NOUN_ZH[ni]
    };
  }

  function drawCreature(c, creature, scale) {
    var px = scale || 8;
    c.width = SIZE * px;
    c.height = SIZE * px;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = creature.bg;
    ctx.fillRect(0, 0, c.width, c.height);
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var v = creature.cells[y][x];
        if (!v) continue;
        if (v === 'eye') {
          ctx.fillStyle = creature.ink;
          ctx.fillRect(x * px, y * px, px, px);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x * px + px * 0.2, y * px + px * 0.15, px * 0.4, px * 0.4);
        } else {
          ctx.fillStyle = v;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }
    }
  }

  var params = new URLSearchParams(location.search);
  var focusSeed = params.get('seed');
  var creatures = [];
  var selected = 0;
  var grid = document.getElementById('grid');
  var big = document.getElementById('big');

  function fill() {
    creatures = [];
    if (focusSeed) creatures.push(makeCreature(focusSeed));
    while (creatures.length < COUNT) creatures.push(makeCreature(randSeed()));
    selected = 0;
    renderGrid();
    select(0);
  }

  function renderGrid() {
    grid.innerHTML = '';
    creatures.forEach(function (cr, i) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'critter' + (i === selected ? ' selected' : '');
      el.setAttribute('role', 'listitem');
      el.setAttribute('aria-label', cr.nameEn);
      var cv = document.createElement('canvas');
      drawCreature(cv, cr, 8);
      var nm = document.createElement('div');
      nm.className = 'name';
      nm.textContent = cr.nameEn;
      el.appendChild(cv);
      el.appendChild(nm);
      el.addEventListener('click', function () { select(i); });
      grid.appendChild(el);
    });
  }

  function select(i) {
    selected = i;
    var cr = creatures[i];
    drawCreature(big, cr, 16);
    document.getElementById('big-name').textContent = cr.nameEn + ' · ' + cr.nameZh;
    document.getElementById('big-seed').textContent = 'seed ' + cr.seed;
    try {
      var u = new URL(location.href);
      u.searchParams.set('seed', cr.seed);
      history.replaceState(null, '', u.pathname + '?' + u.searchParams.toString());
    } catch (e) {}
    var nodes = grid.querySelectorAll('.critter');
    for (var n = 0; n < nodes.length; n++) {
      if (n === i) nodes[n].classList.add('selected');
      else nodes[n].classList.remove('selected');
    }
  }

  document.getElementById('regen').onclick = function () {
    focusSeed = null;
    fill();
  };
  document.getElementById('download').onclick = function () {
    var cr = creatures[selected];
    var off = document.createElement('canvas');
    drawCreature(off, cr, 32);
    var a = document.createElement('a');
    a.download = 'petit-creature-' + cr.seed + '.png';
    a.href = off.toDataURL('image/png');
    a.click();
  };
  document.getElementById('copy').onclick = function () {
    var cr = creatures[selected];
    var url = location.href.split('?')[0] + '?seed=' + encodeURIComponent(cr.seed);
    function ok() {
      var b = document.getElementById('copy');
      var t = b.textContent;
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = t; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok).catch(function () { window.prompt('Copy link:', url); });
    } else window.prompt('Copy link:', url);
  };

  fill();
})();
