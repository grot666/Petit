// Run: node tests/go9.test.js
const assert = require('assert');
const Go = require('../games/go9/go.js');
const B = 1, W = 2;
const at = (x, y) => y * 9 + x;
function pos(rows, turn) { // rows: 9 strings of . X O
  const s = Go.create(7);
  rows.forEach((r, y) => [...r].forEach((c, x) => { s.board[at(x, y)] = c === 'X' ? B : c === 'O' ? W : 0; }));
  s.turn = turn || B; return s;
}
const E = '.........';
let n = 0; const t = (name, f) => { f(); n++; console.log('ok -', name); };

t('single stone capture', () => {
  let s = pos(['.X.......', 'XO.......', '.X.......', E, E, E, E, E, E], B);
  const r = Go.play(s, at(2, 1), B);
  assert(r.ok); assert.strictEqual(r.state.board[at(1, 1)], 0); assert.strictEqual(r.state.captures[B], 1);
});
t('group capture in corner', () => {

  const s = pos(['OO.......', 'XX.......', E, E, E, E, E, E, E], B);
  const r = Go.play(s, at(2, 0), B);
  assert(r.ok); assert.strictEqual(r.state.board[at(0, 0)], 0); assert.strictEqual(r.state.board[at(1, 0)], 0); assert.strictEqual(r.state.captures[B], 2);
});
t('suicide forbidden', () => {
  const s = pos(['.O.......', 'O........', E, E, E, E, E, E, E], B);
  const r = Go.play(s, at(0, 0), B);
  assert(!r.ok); assert(/自杀/.test(r.error));
});
t('capture that looks like suicide is allowed', () => {
  // black at (0,0) empty, white stone (1,0) surrounded except (0,0)
  const s = pos(['.OX......', 'OX.......', 'X........', E, E, E, E, E, E], B);
  // white (0,1): nbrs (0,0) empty,(1,1)X,(0,2)X -> 1 lib. Playing (0,0) captures (0,1) and (1,0)? (1,0) nbrs (0,0),(2,0)X,(1,1)X
  const r = Go.play(s, at(0, 0), B);
  assert(r.ok); assert.strictEqual(r.state.captures[B], 2);
});
t('simple ko forbids immediate recapture, allowed after a move elsewhere', () => {
  const s = pos(['.XO......', 'XO.O.....', '.XO......', E, E, E, E, E, E], B);
  // black plays (2,1) capturing white (1,1)
  let r = Go.play(s, at(2, 1), B); assert(r.ok, r.error); assert.strictEqual(r.state.board[at(1, 1)], 0);
  assert.strictEqual(r.state.ko, at(1, 1));
  const r2 = Go.play(r.state, at(1, 1), W); assert(!r2.ok); assert(/劫/.test(r2.error));
  let st = Go.play(r.state, at(8, 8), W).state; st = Go.play(st, at(7, 8), B).state;
  const r3 = Go.play(st, at(1, 1), W); assert(r3.ok, r3.error); assert.strictEqual(r3.state.board[at(2, 1)], 0);
});
t('turn order and occupied point', () => {
  const s = Go.create();
  assert(!Go.play(s, 0, W).ok);
  const s2 = Go.play(s, 0, B).state; assert(!Go.play(s2, 0, W).ok);
});
t('two passes enter scoring; resume returns to play', () => {
  let s = Go.pass(Go.create(), B).state; assert.strictEqual(s.phase, 'play');
  s = Go.pass(s, W).state; assert.strictEqual(s.phase, 'scoring');
  s = Go.resume(s).state; assert.strictEqual(s.phase, 'play'); assert.strictEqual(s.passes, 0);
});
t('area scoring with komi 7', () => {
  // black owns columns 0-4 (wall at x=4), white owns x=5-8 (wall at x=5)
  const rows = Array(9).fill('....XO...');
  let s = pos(rows); const sc = Go.score(s);
  assert.strictEqual(sc.black, 45); assert.strictEqual(sc.white, 36); assert.strictEqual(sc.whiteTotal, 43);
  assert.strictEqual(sc.winner, B); assert.strictEqual(sc.margin, 2);
});
t('dead stones count for the opponent', () => {
  const rows = Array(9).fill('....XO...'); rows[4] = '.O..XO...';
  let s = pos(rows); s.phase = 'scoring';
  s = Go.toggleDead(s, at(1, 4)).state; assert.deepStrictEqual(s.dead, [at(1, 4)]);
  const sc = Go.score(s); assert.strictEqual(sc.black, 45); assert.strictEqual(sc.white, 36);
  s = Go.toggleDead(s, at(1, 4)).state; assert.deepStrictEqual(s.dead, []);
});
t('both confirm ends game with result', () => {
  let s = pos(Array(9).fill('....XO...')); s.phase = 'scoring';
  s = Go.confirm(s, B).state; assert.strictEqual(s.phase, 'scoring');
  s = Go.confirm(s, W).state; assert.strictEqual(s.phase, 'ended'); assert.strictEqual(s.result.winner, B);
  assert.strictEqual(s.result.margin, 2);
});
t('undo takes back own move (1 or 2 plies)', () => {
  let s = Go.create(); s = Go.play(s, 0, B).state; s = Go.play(s, 1, W).state;
  let u = Go.undo(s, W).state; assert.strictEqual(u.board[1], 0); assert.strictEqual(u.board[0], B); assert.strictEqual(u.turn, W);
  u = Go.undo(s, B).state; assert.strictEqual(u.board[0], 0); assert.strictEqual(u.turn, B); assert.strictEqual(u.moveNo, 0);
});
t('resign', () => { const s = Go.resign(Go.create(), B).state; assert.strictEqual(s.phase, 'ended'); assert.strictEqual(s.result.winner, W); });
t('coords', () => { assert.strictEqual(Go.coord(0), 'A9'); assert.strictEqual(Go.coord(80), 'J1'); });
console.log(n + ' tests passed');
