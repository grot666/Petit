/* Petit 九路围棋 — rules engine (Chinese area scoring). Works in browser and Node. */
(function (root) {
  'use strict';
  var N = 9, BLACK = 1, WHITE = 2;

  function create(komi) {
    return {
      size: N, komi: komi == null ? 7 : komi, board: emptyBoard(), turn: BLACK,
      captures: { 1: 0, 2: 0 }, ko: -1, passes: 0, moveNo: 0, last: -1,
      phase: 'play', dead: [], confirm: { 1: false, 2: false }, result: null, history: []
    };
  }
  function emptyBoard() { var b = []; for (var i = 0; i < N * N; i++) b.push(0); return b; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function neighbors(i) {
    var x = i % N, y = (i - x) / N, out = [];
    if (x > 0) out.push(i - 1); if (x < N - 1) out.push(i + 1);
    if (y > 0) out.push(i - N); if (y < N - 1) out.push(i + N);
    return out;
  }
  function group(board, i) {
    var color = board[i], stones = [i], seen = {}, libs = {}, nLibs = 0;
    seen[i] = true;
    for (var k = 0; k < stones.length; k++) {
      neighbors(stones[k]).forEach(function (j) {
        if (board[j] === 0) { if (!libs[j]) { libs[j] = true; nLibs++; } }
        else if (board[j] === color && !seen[j]) { seen[j] = true; stones.push(j); }
      });
    }
    return { stones: stones, libs: nLibs };
  }
  function snap(st) {
    return { board: st.board.slice(), turn: st.turn, captures: { 1: st.captures[1], 2: st.captures[2] },
      ko: st.ko, passes: st.passes, moveNo: st.moveNo, last: st.last };
  }
  function restore(st, h) {
    st.board = h.board; st.turn = h.turn; st.captures = h.captures; st.ko = h.ko;
    st.passes = h.passes; st.moveNo = h.moveNo; st.last = h.last;
  }
  function fail(msg) { return { ok: false, error: msg }; }

  function play(s, i, color) {
    if (s.phase !== 'play') return fail('对局不在进行中');
    if (color !== s.turn) return fail('还没轮到你');
    if (!(i >= 0 && i < N * N)) return fail('无效位置');
    if (s.board[i] !== 0) return fail('这里已经有子了');
    if (i === s.ko) return fail('劫：不能立即提回，请先在别处下一手');
    var st = clone(s), b = st.board, opp = 3 - color, captured = [];
    b[i] = color;
    neighbors(i).forEach(function (j) {
      if (b[j] === opp) {
        var g = group(b, j);
        if (g.libs === 0) g.stones.forEach(function (k) { if (b[k]) { b[k] = 0; captured.push(k); } });
      }
    });
    var own = group(b, i);
    if (own.libs === 0) return fail('禁止自杀（下这里没有气）');
    st.history.push(snap(s));
    st.captures[color] += captured.length;
    st.ko = (captured.length === 1 && own.stones.length === 1 && own.libs === 1) ? captured[0] : -1;
    st.turn = opp; st.passes = 0; st.moveNo++; st.last = i;
    return { ok: true, state: st, captured: captured };
  }
  function pass(s, color) {
    if (s.phase !== 'play') return fail('对局不在进行中');
    if (color !== s.turn) return fail('还没轮到你');
    var st = clone(s);
    st.history.push(snap(s));
    st.turn = 3 - color; st.passes++; st.moveNo++; st.ko = -1; st.last = -2; // -2 = pass
    if (st.passes >= 2) { st.phase = 'scoring'; st.dead = []; st.confirm = { 1: false, 2: false }; }
    return { ok: true, state: st };
  }
  function resign(s, color) {
    if (s.phase === 'ended') return fail('对局已结束');
    var st = clone(s);
    st.phase = 'ended'; st.result = { winner: 3 - color, by: 'resign' };
    return { ok: true, state: st };
  }
  // Undo on behalf of `color`: takes back that player's last move (and the opponent's reply if there is one).
  function undoPlies(s, color) {
    var h = s.history; if (!h.length) return 0;
    if (h[h.length - 1].turn === color) return 1;
    return h.length >= 2 ? 2 : 0;
  }
  function undo(s, color) {
    if (s.phase === 'ended') return fail('对局已结束');
    var n = undoPlies(s, color);
    if (!n) return fail('没有可以悔的棋');
    var st = clone(s);
    for (var k = 0; k < n; k++) restore(st, st.history.pop());
    st.phase = 'play'; st.dead = []; st.confirm = { 1: false, 2: false };
    return { ok: true, state: st };
  }
  function toggleDead(s, i) {
    if (s.phase !== 'scoring') return fail('只能在数子阶段标记死子');
    if (!s.board[i]) return fail('这里没有棋子');
    var st = clone(s), g = group(st.board, i), isDead = st.dead.indexOf(i) >= 0;
    st.dead = st.dead.filter(function (k) { return g.stones.indexOf(k) < 0; });
    if (!isDead) st.dead = st.dead.concat(g.stones);
    st.dead.sort(function (a, b) { return a - b; });
    st.confirm = { 1: false, 2: false };
    return { ok: true, state: st };
  }
  function score(s) {
    var b = s.board.slice(), dead = s.dead || [], owner = emptyBoard(), black = 0, white = 0, k;
    dead.forEach(function (i) { b[i] = 0; });
    var seen = {};
    for (k = 0; k < N * N; k++) {
      if (b[k]) { owner[k] = b[k]; continue; }
      if (seen[k]) continue;
      var region = [k], borders = {}; seen[k] = true;
      for (var r = 0; r < region.length; r++) neighbors(region[r]).forEach(function (j) {
        if (b[j]) borders[b[j]] = true;
        else if (!seen[j]) { seen[j] = true; region.push(j); }
      });
      var o = borders[1] && !borders[2] ? 1 : borders[2] && !borders[1] ? 2 : 0;
      region.forEach(function (j) { owner[j] = o; });
    }
    for (k = 0; k < N * N; k++) { if (owner[k] === 1) black++; else if (owner[k] === 2) white++; }
    var whiteTotal = white + s.komi, diff = black - whiteTotal;
    return { black: black, white: white, whiteTotal: whiteTotal, owner: owner,
      winner: diff > 0 ? 1 : diff < 0 ? 2 : 0, margin: Math.abs(diff) };
  }
  function confirm(s, color) {
    if (s.phase !== 'scoring') return fail('不在数子阶段');
    var st = clone(s);
    st.confirm[color] = true;
    if (st.confirm[1] && st.confirm[2]) {
      var sc = score(st);
      st.phase = 'ended';
      st.result = { winner: sc.winner, by: 'score', black: sc.black, white: sc.whiteTotal, margin: sc.margin };
    }
    return { ok: true, state: st };
  }
  function resume(s) {
    if (s.phase !== 'scoring') return fail('不在数子阶段');
    var st = clone(s);
    st.phase = 'play'; st.passes = 0; st.dead = []; st.confirm = { 1: false, 2: false };
    return { ok: true, state: st };
  }
  // Apply a network/UI action object {type, i?} for `color`.
  function apply(s, a, color) {
    switch (a && a.type) {
      case 'move': return play(s, a.i, color);
      case 'pass': return pass(s, color);
      case 'resign': return resign(s, color);
      case 'dead': return toggleDead(s, a.i);
      case 'confirm': return confirm(s, color);
      case 'resume': return resume(s);
      default: return fail('未知操作');
    }
  }
  var COLS = 'ABCDEFGHJ';
  function coord(i) { if (i === -2) return '停一手'; if (i < 0) return ''; var x = i % N, y = (i - x) / N; return COLS[x] + (N - y); }

  var Go = { N: N, BLACK: BLACK, WHITE: WHITE, create: create, play: play, pass: pass, resign: resign, undo: undo,
    undoPlies: undoPlies, toggleDead: toggleDead, score: score, confirm: confirm, resume: resume, apply: apply,
    group: group, neighbors: neighbors, coord: coord, COLS: COLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = Go; else root.Go = Go;
})(this);
