(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var STORAGE_KEY = 'petit.today.done';
  var W = 900, H = 900;

  // ---------- date helpers (local calendar) ----------
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
    return d;
  }
  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    return x;
  }
  function todayLocal() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function hashDate(s) {
    // FNV-1a over YYYY-MM-DD → uint32
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // ---------- rng / noise (same family as gallery) ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u || 1e-12)) * Math.cos(TAU * v);
  }
  function makeNoise(r) {
    var p = new Uint8Array(512), i, perm = [];
    for (i = 0; i < 256; i++) perm[i] = i;
    for (i = 255; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (i = 0; i < 512; i++) p[i] = perm[i & 255];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function grad(h, x, y) {
      switch (h & 7) {
        case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
        case 4: return x; case 5: return -x; case 6: return y; default: return -y;
      }
    }
    function noise(x, y) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      var u = fade(x), v = fade(y);
      var a = p[X] + Y, b = p[X + 1] + Y;
      var n00 = grad(p[a], x, y), n10 = grad(p[b], x - 1, y);
      var n01 = grad(p[a + 1], x, y - 1), n11 = grad(p[b + 1], x - 1, y - 1);
      var nx0 = n00 + u * (n10 - n00), nx1 = n01 + u * (n11 - n01);
      return nx0 + v * (nx1 - nx0);
    }
    noise.fbm = function (x, y, oct) {
      var s = 0, amp = 0.5, f = 1;
      for (var o = 0; o < (oct || 4); o++) { s += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; }
      return s;
    };
    return noise;
  }

  // ---------- palettes ----------
  var PALETTES = [
    { name: 'Ink & Vermilion', bg: '#f6f3ec', ink: '#1e1e22', accents: ['#963426', '#2a2723', '#c9a06a'] },
    { name: 'Primary Quiet', bg: '#f4f1ea', ink: '#151515', accents: ['#c8312a', '#1f3f8f', '#e9c13b'] },
    { name: 'Coast', bg: '#f5f2eb', ink: '#22313f', accents: ['#b4553c', '#d8b26e', '#7d8f7a'] },
    { name: 'Watercolour', bg: '#f7f4ec', ink: '#2b2824', accents: ['#b04634', '#264670', '#d6a652', '#5e7868'] },
    { name: 'Morning', bg: '#f6f1e7', ink: '#464442', accents: ['#e8c4be', '#c6d6e2', '#d4c3a3'] },
    { name: 'Night Paper', bg: '#1a1a1e', ink: '#e8e4dc', accents: ['#c45a3a', '#6a8cae', '#d4b56a'] },
    { name: 'Moss', bg: '#f3f0e8', ink: '#2c3228', accents: ['#5f7358', '#a67c52', '#8b3a2a'] },
    { name: 'Porcelain', bg: '#f8f6f1', ink: '#2f3640', accents: ['#8a9bb0', '#c47a6a', '#d9c9a8'] }
  ];

  // ---------- title words ----------
  var ADJ_EN = ['Quiet', 'Slow', 'Soft', 'Early', 'Late', 'Hidden', 'Distant', 'Pale', 'Warm', 'Still',
    'Brief', 'Tender', 'Borrowed', 'Unnamed', 'Private', 'Drifted', 'Folded', 'Morning', 'Evening', 'Paper'];
  var NOUN_EN = ['Tide', 'Garden', 'Window', 'Corridor', 'Atlas', 'Harbor', 'Orchard', 'Letter',
    'Threshold', 'Interval', 'Compass', 'Shore', 'Lantern', 'Margin', 'Current', 'Silence',
    'Room', 'Weather', 'Horizon', 'Ledger'];
  var ADJ_ZH = ['安静的', '缓慢的', '柔软的', '清晨的', '傍晚的', '隐秘的', '远处的', '淡色的', '温暖的', '静止的',
    '短暂的', '温柔的', '借来的', '未名的', '私有的', '漂来的', '折叠的', '纸上的', '薄雾的', '旧日的'];
  var NOUN_ZH = ['潮汐', '庭院', '窗', '走廊', '地图', '港口', '果园', '信',
    '门槛', '间歇', '罗盘', '岸', '灯笼', '页边', '水流', '寂静',
    '房间', '天气', '地平线', '账本'];

  function makeTitle(r) {
    var ai = Math.floor(r() * ADJ_EN.length);
    var ni = Math.floor(r() * NOUN_EN.length);
    // slight remix chance
    if (r() < 0.18) {
      return {
        en: NOUN_EN[ni] + ' of ' + ADJ_EN[ai] + ' Things',
        zh: ADJ_ZH[ai] + NOUN_ZH[ni]
      };
    }
    return {
      en: ADJ_EN[ai] + ' ' + NOUN_EN[ni],
      zh: ADJ_ZH[ai] + NOUN_ZH[ni]
    };
  }

  // ---------- algorithms ----------
  function drawFlow(c, W, H, r, pal) {
    var n = makeNoise(r);
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    var sc = 0.002 + r() * 0.0014, twist = 1.8 + r() * 2;
    var darkAccent = pal.accents[0];
    c.lineCap = 'round';
    var count = 1800 + Math.floor(r() * 800);
    for (var i = 0; i < count; i++) {
      var x = r() * W * 1.15 - W * 0.075, y = r() * H * 1.15 - H * 0.075;
      var len = 35 + r() * 170;
      var useAccent = r() < 0.07;
      if (useAccent) {
        c.strokeStyle = hexA(darkAccent, 0.5 + r() * 0.35);
        c.lineWidth = 1 + r() * 0.6;
      } else {
        c.strokeStyle = hexA(pal.ink, 0.1 + r() * 0.28);
        c.lineWidth = 0.4 + r() * 0.9;
      }
      c.beginPath(); c.moveTo(x, y);
      for (var s = 0; s < len; s++) {
        var a = n.fbm(x * sc, y * sc, 3) * TAU * twist;
        x += Math.cos(a) * 1.55; y += Math.sin(a) * 1.55;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  function drawCircles(c, W, H, r, pal) {
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    var circles = [], pad = 2.5 + r() * 2, M = 40 + r() * 30;
    var cx = W / 2, cy = H / 2, R = W / 2 - M;
    var maxN = 700 + Math.floor(r() * 400);
    for (var t = 0; t < 16000 && circles.length < maxN; t++) {
      var x = M + r() * (W - 2 * M), y = M + r() * (H - 2 * M);
      var rad = R - Math.hypot(x - cx, y - cy);
      if (rad < 2) continue;
      rad = Math.min(rad, 100 * Math.pow(r(), 1.5 + r() * 0.4) + 3);
      for (var i = 0; i < circles.length && rad >= 2; i++) {
        var q = circles[i];
        rad = Math.min(rad, Math.hypot(x - q[0], y - q[1]) - q[2] - pad);
      }
      if (rad >= 2) circles.push([x, y, rad]);
    }
    var cols = [pal.ink].concat(pal.accents);
    circles.forEach(function (q) {
      c.beginPath(); c.arc(q[0], q[1], q[2], 0, TAU);
      if (q[2] > 12 && r() < 0.48) {
        c.fillStyle = cols[Math.floor(r() * cols.length)];
        c.globalAlpha = 0.82; c.fill(); c.globalAlpha = 1;
      } else {
        c.strokeStyle = pal.ink; c.lineWidth = q[2] > 8 ? 1.15 : 0.75; c.stroke();
      }
    });
  }

  function drawContours(c, W, H, r, pal) {
    var n = makeNoise(r);
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    var step = 5, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
    var f = new Float32Array(cols * rows), sc = 0.0025 + r() * 0.0012;
    var ox = r() * 100, oy = r() * 100;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++)
      f[j * cols + i] = n.fbm(ox + i * step * sc, oy + j * step * sc, 4);
    var levels = 22 + Math.floor(r() * 10);
    var accentEvery = 4 + Math.floor(r() * 3);
    for (var L = 0; L < levels; L++) {
      var th = -0.65 + 1.3 * L / levels;
      var major = L % accentEvery === 0;
      c.strokeStyle = major ? hexA(pal.accents[L % pal.accents.length], 0.85)
                            : hexA(pal.ink, 0.4);
      c.lineWidth = major ? 1.35 : 0.65;
      c.beginPath();
      for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
        var a = f[j * cols + i], b = f[j * cols + i + 1];
        var d = f[(j + 1) * cols + i], e = f[(j + 1) * cols + i + 1];
        var x = i * step, y = j * step, pts = [];
        if ((a < th) !== (b < th)) pts.push([x + step * (th - a) / (b - a), y]);
        if ((b < th) !== (e < th)) pts.push([x + step, y + step * (th - b) / (e - b)]);
        if ((d < th) !== (e < th)) pts.push([x + step * (th - d) / (e - d), y + step]);
        if ((a < th) !== (d < th)) pts.push([x, y + step * (th - a) / (d - a)]);
        if (pts.length >= 2) { c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); }
        if (pts.length === 4) { c.moveTo(pts[2][0], pts[2][1]); c.lineTo(pts[3][0], pts[3][1]); }
      }
      c.stroke();
    }
  }

  function drawPartition(c, W, H, r, pal) {
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    var rects = [];
    (function split(x, y, w, h, d) {
      if (d > 0 && (w * h < 8000 + r() * 4000 || r() < 0.07 * d || d > 6)) {
        rects.push([x, y, w, h]); return;
      }
      var vert = w > h ? r() < 0.78 : r() < 0.22;
      var t = 0.28 + r() * 0.44;
      if (vert) {
        var a = Math.round(w * t);
        split(x, y, a, h, d + 1); split(x + a, y, w - a, h, d + 1);
      } else {
        var b = Math.round(h * t);
        split(x, y, w, b, d + 1); split(x, y + b, w, h - b, d + 1);
      }
    })(0, 0, W, H, 0);
    var colored = 0, maxC = 5 + Math.floor(r() * 4);
    rects.forEach(function (q) {
      var fill = pal.bg;
      if (r() < 0.24 && colored < maxC) {
        fill = pal.accents[Math.floor(r() * pal.accents.length)];
        colored++;
      }
      c.fillStyle = fill; c.fillRect(q[0], q[1], q[2], q[3]);
    });
    c.strokeStyle = pal.ink; c.lineWidth = 7 + r() * 4;
    rects.forEach(function (q) { c.strokeRect(q[0], q[1], q[2], q[3]); });
    c.strokeRect(0, 0, W, H);
  }

  function drawWaves(c, W, H, r, pal) {
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    var N = 48 + Math.floor(r() * 18), h = H / N;
    var k = 0.0055 + r() * 0.005, ph = r() * TAU;
    var invert = r() < 0.35;
    c.fillStyle = invert ? pal.bg : pal.ink;
    if (invert) { c.fillStyle = pal.ink; c.fillRect(0, 0, W, H); c.fillStyle = pal.bg; }
    for (var i = -2; i < N + 2; i++) {
      var amp = h * (1.8 + r() * 0.8) * Math.sin(i / N * Math.PI + ph * 0.2);
      c.beginPath();
      var x, top = [], bot = [];
      for (x = 0; x <= W; x += 4) {
        var y = i * h + amp * Math.sin(x * k + i * 0.18 + ph);
        var thick = h * (0.45 + 0.4 * Math.sin(x * k * 1.7 - i * 0.12 + ph));
        top.push([x, y]); bot.push([x, y + thick]);
      }
      c.moveTo(top[0][0], top[0][1]);
      top.forEach(function (p) { c.lineTo(p[0], p[1]); });
      for (var j = bot.length - 1; j >= 0; j--) c.lineTo(bot[j][0], bot[j][1]);
      c.closePath(); c.fill();
    }
    // sparse accent bands
    if (r() < 0.55) {
      c.fillStyle = hexA(pal.accents[0], 0.55);
      var band = Math.floor(r() * N);
      var y0 = band * h;
      c.fillRect(0, y0, W, h * 0.35);
    }
  }

  function drawWash(c, W, H, r, pal) {
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    function deform(pts, depth, v) {
      for (var d = 0; d < depth; d++) {
        var out = [];
        for (var i = 0; i < pts.length; i++) {
          var a = pts[i], b = pts[(i + 1) % pts.length];
          var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          var vv = (a[2] + b[2]) / 2 * v;
          out.push(a, [mx + gauss(r) * len * 0.3 * vv, my + gauss(r) * len * 0.3 * vv, a[2] * (0.85 + r() * 0.3)]);
        }
        pts = out;
      }
      return pts;
    }
    function poly(x, y, R, k) {
      var p = [];
      for (var i = 0; i < k; i++) {
        var a = TAU * i / k;
        p.push([x + Math.cos(a) * R, y + Math.sin(a) * R, 0.5 + r()]);
      }
      return p;
    }
    var rgb = pal.accents.map(hexToRgb);
    var blobs = 3 + Math.floor(r() * 3);
    c.globalCompositeOperation = 'multiply';
    for (var b = 0; b < blobs; b++) {
      var col = rgb[b % rgb.length];
      var base = deform(poly(W * (0.18 + r() * 0.64), H * (0.15 + r() * 0.7), 110 + r() * 160, 9 + Math.floor(r() * 4)), 3, 1);
      for (var l = 0; l < 55; l++) {
        var p = deform(base, 3, 0.55);
        c.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.024)';
        c.beginPath(); c.moveTo(p[0][0], p[0][1]);
        for (var i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
        c.closePath(); c.fill();
      }
    }
    c.globalCompositeOperation = 'source-over';
  }

  function drawGrid(c, W, H, r, pal) {
    c.fillStyle = pal.bg; c.fillRect(0, 0, W, H);
    var soft = pal.accents.map(function (h) { return hexA(h, 0.32); });
    soft.push('rgba(0,0,0,0)');
    var bh = H / (7 + Math.floor(r() * 5));
    for (var y = 0, bi = 0; y < H; y += bh, bi++) {
      c.fillStyle = soft[bi % soft.length]; c.fillRect(0, y, W, bh);
    }
    var M = 50 + r() * 30, cells = 20 + Math.floor(r() * 14), s = (W - 2 * M) / cells;
    function pencil(x1, y1, x2, y2) {
      var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6), drift = 0;
      c.beginPath(); c.moveTo(x1, y1);
      for (var k = 1; k <= steps; k++) {
        drift += gauss(r) * 0.12; drift *= 0.9;
        var t = k / steps, px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
        if (x1 === x2) px += drift; else py += drift;
        c.lineTo(px, py);
      }
      c.strokeStyle = hexA(pal.ink, 0.25 + r() * 0.22);
      c.lineWidth = 0.45 + r() * 0.4; c.stroke();
    }
    for (var g = 0; g <= cells; g++) {
      pencil(M + g * s, M, M + g * s, H - M);
      pencil(M, M + g * s, W - M, M + g * s);
    }
  }

  var ALGOS = [
    { id: 'flow', name: 'Flow Field', nameZh: '流场', draw: drawFlow },
    { id: 'circles', name: 'Circle Packing', nameZh: '圆堆积', draw: drawCircles },
    { id: 'contours', name: 'Noise Contours', nameZh: '噪声等值线', draw: drawContours },
    { id: 'partition', name: 'Subdivision', nameZh: '分割', draw: drawPartition },
    { id: 'waves', name: 'Wave Bands', nameZh: '波带', draw: drawWaves },
    { id: 'wash', name: 'Wash', nameZh: '水色', draw: drawWash },
    { id: 'grid', name: 'Pencil Grid', nameZh: '铅笔格', draw: drawGrid }
  ];

  // ---------- colour helpers ----------
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  function hexA(hex, a) {
    var rgb = hexToRgb(hex);
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  // ---------- challenges ----------
  function pickChallenge(r) {
    var pool = [
      { game: '2048', href: '../games/2048/' },
      { game: 'snake', href: '../games/snake/' },
      { game: 'dual-n-back', href: '../games/dual-n-back/' },
      { game: 'typing', href: '../games/typing/' },
      { game: 'minesweeper', href: '../games/minesweeper/' },
      { game: 'memory', href: '../games/memory/' }
    ];
    return materialize(pool[Math.floor(r() * pool.length)], r);
  }

  function materialize(ch, r) {
    // Re-implement targets with a single shared roll so en/zh match
    var roll = r();
    var en, zh, tip;
    switch (ch.game) {
      case '2048': {
        var t = [256, 512, 512, 1024][Math.floor(roll * 4)];
        en = 'Reach ' + t + ' in 2048'; zh = '在 2048 中达到 ' + t;
        tip = 'Open 2048 and merge your way there. Mark done when you hit it.';
        break;
      }
      case 'snake': {
        t = [15, 18, 20, 25][Math.floor(roll * 4)];
        en = 'Grow Snake to length ' + t; zh = '贪吃蛇长度达到 ' + t;
        tip = 'Eat, grow, don\'t bite yourself. Mark done when you reach the length.';
        break;
      }
      case 'dual-n-back': {
        t = [2, 3, 3, 4][Math.floor(roll * 4)];
        en = 'Reach Dual N-Back level ' + t; zh = '双背 N 达到 ' + t;
        tip = 'A short brain-training session. Mark done when you hit the level.';
        break;
      }
      case 'typing': {
        t = [35, 40, 45, 50][Math.floor(roll * 4)];
        en = 'Type at ' + t + ' WPM'; zh = '打字达到 ' + t + ' WPM';
        tip = 'Thirty seconds on the typing test. Mark done when you clear the bar.';
        break;
      }
      case 'minesweeper': {
        en = 'Win a game of Minesweeper'; zh = '扫雷胜利一局';
        tip = 'Clear the 9×9 field. Mark done when you win.';
        break;
      }
      default: {
        t = [20, 22, 24, 28][Math.floor(roll * 4)];
        en = 'Finish Memory in under ' + t + ' moves'; zh = '记忆翻牌 ' + t + ' 步内完成';
        tip = 'Find all eight pairs. Mark done when you finish under the limit.';
      }
    }
    return { game: ch.game, href: ch.href, en: en, zh: zh, tip: tip };
  }

  // ---------- localStorage streak ----------
  function loadDone() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  function saveDone(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (e) {}
  }
  function streakEndingAt(map, dayStr) {
    var d = parseDate(dayStr);
    if (!d) return 0;
    var n = 0;
    while (map[formatDate(d)]) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  }

  // ---------- boot ----------
  var params = new URLSearchParams(location.search);
  var today = todayLocal();
  var todayStr = formatDate(today);
  var requested = params.get('date');
  var view = requested ? parseDate(requested) : today;
  if (!view || view > today) view = today;
  // don't allow absurdly old dates (keep nav sane)
  var earliest = addDays(today, -365);
  if (view < earliest) view = earliest;
  var dateStr = formatDate(view);
  var isToday = dateStr === todayStr;
  var seed = hashDate(dateStr);

  var r0 = rng(seed);
  var algo = ALGOS[Math.floor(r0() * ALGOS.length)];
  var pal = PALETTES[Math.floor(r0() * PALETTES.length)];
  // Wash uses multiply blending; keep a light ground.
  if (algo.id === 'wash' && pal.bg.charAt(1) < '8') {
    pal = PALETTES[Math.floor(r0() * (PALETTES.length - 1))]; // skip night-ish by re-roll among earlier
    if (pal.bg.charAt(1) < '8') pal = PALETTES[0];
  }
  var title = makeTitle(r0);
  var challenge = pickChallenge(r0);

  // DOM
  document.getElementById('date-label').textContent = dateStr;
  document.getElementById('title-en').textContent = title.en;
  document.getElementById('title-zh').textContent = title.zh;
  document.getElementById('algo-label').textContent = algo.name + ' · ' + algo.nameZh + ' · ' + pal.name;
  document.title = 'Petit — ' + title.en + ' · ' + dateStr;

  var prev = addDays(view, -1);
  var next = addDays(view, 1);
  var prevA = document.getElementById('prev-day');
  var nextA = document.getElementById('next-day');
  prevA.href = '?date=' + formatDate(prev);
  if (next <= today) {
    nextA.href = '?date=' + formatDate(next);
    nextA.removeAttribute('aria-disabled');
  } else {
    nextA.href = '#';
    nextA.setAttribute('aria-disabled', 'true');
  }
  document.getElementById('today-pill').hidden = !isToday;
  document.getElementById('jump-today').hidden = isToday;
  document.getElementById('jump-today').href = './';

  document.getElementById('ch-en').textContent = challenge.en;
  document.getElementById('ch-zh').textContent = challenge.zh;
  document.getElementById('ch-tip').textContent = challenge.tip;
  document.getElementById('ch-play').href = challenge.href;

  var doneMap = loadDone();
  var check = document.getElementById('ch-check');
  check.checked = !!doneMap[dateStr];
  function refreshStreak() {
    var s = streakEndingAt(doneMap, isToday ? todayStr : dateStr);
    // If viewing a past day that is done, show streak as of that day;
    // if viewing today, show current streak (including today if checked).
    if (isToday) s = streakEndingAt(doneMap, todayStr);
    document.getElementById('streak-n').textContent = String(s);
    document.getElementById('streak-hint').textContent =
      s === 0 ? 'Complete today\'s challenge to start a streak.'
      : s === 1 ? 'One day. Come back tomorrow.'
      : s + ' days in a row. Keep going.';
  }
  refreshStreak();
  check.addEventListener('change', function () {
    if (check.checked) doneMap[dateStr] = 1;
    else delete doneMap[dateStr];
    saveDone(doneMap);
    refreshStreak();
  });

  // canvas
  var canvas = document.getElementById('art');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // fresh rng for drawing (don't reuse r0 which was partially consumed)
  var rDraw = rng(seed ^ 0xA5A5A5A5);
  // re-pick algo/palette consistently: use the same first rolls as above
  // Actually algo/pal already chosen from r0; for drawing we need a dedicated stream.
  // Use seed+1 for drawing so the piece is stable regardless of title/challenge rolls.
  rDraw = rng((seed + 1) >>> 0);
  algo.draw(ctx, W, H, rDraw, pal);

  document.getElementById('download').addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = 'petit-' + dateStr + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
})();
