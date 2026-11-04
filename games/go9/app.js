(function () {
  'use strict';
  var Go = window.Go, N = Go.N;
  var $ = function (id) { return document.getElementById(id); };
  var PREFIX = 'petit-go9-', STORE = 'petit.go9.host.', NAME = { 1: '黑', 2: '白' };
  var mode = null, state = null, myColor = 0, hostColor = 1, code = null;
  var peer = null, conn = null, guestCid = null, lastSeen = 0, connected = false;
  var roomFull = false, retryTimer = null, pingTimer = null, pendingReq = null, incomingReq = null, hover = -1, msgTimer = null;
  var cid = localStorage.getItem('petit.go9.cid') || Math.random().toString(36).slice(2);
  try { localStorage.setItem('petit.go9.cid', cid); } catch (e) {}

  // ---------- helpers ----------
  function newCode() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function showMsg(t, ok) { var m = $('msg'); m.style.color = ok ? '#3d7a4a' : '#c43c2c'; m.textContent = t || ''; clearTimeout(msgTimer); if (t) msgTimer = setTimeout(function () { m.textContent = ''; }, 3500); }
  function setStatus(kind, text) { $('status').className = kind; $('statusText').textContent = text; }
  function link() { return location.origin + location.pathname + '?room=' + code; }
  function saveHost() { if (mode === 'host') try { localStorage.setItem(STORE + code, JSON.stringify({ hostColor: hostColor, state: state, ts: Date.now() })); } catch (e) {} }
  function send(o) { if (conn && conn.open) try { conn.send(o); } catch (e) {} }
  function sendState() { if (mode === 'host') send({ t: 'state', s: state, hostColor: hostColor }); }
  function setState(s) { state = s; saveHost(); sendState(); render(); }
  function enterGame() { $('lobby').classList.add('hidden'); $('game').classList.remove('hidden'); }

  // ---------- canvas ----------
  var cv = $('board'), c = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), S = 540, M = 42, G = (S - 2 * M) / (N - 1);
  cv.width = S * dpr; cv.height = S * dpr; c.scale(dpr, dpr);
  function xy(i) { var x = i % N; return [M + x * G, M + (i - x) / N * G]; }
  function stone(x, y, color, alpha) {
    c.globalAlpha = alpha == null ? 1 : alpha;
    var g = c.createRadialGradient(x - G * .15, y - G * .15, G * .05, x, y, G * .48);
    if (color === 1) { g.addColorStop(0, '#555'); g.addColorStop(1, '#111'); } else { g.addColorStop(0, '#fff'); g.addColorStop(1, '#d8d4cc'); }
    c.fillStyle = g; c.beginPath(); c.arc(x, y, G * .47, 0, Math.PI * 2); c.fill();
    if (color === 2) { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = .8; c.stroke(); }
    c.globalAlpha = 1;
  }
  function draw() {
    c.fillStyle = '#e6c88f'; c.fillRect(0, 0, S, S);
    c.strokeStyle = '#4a3b26'; c.lineWidth = 1;
    for (var k = 0; k < N; k++) {
      c.beginPath(); c.moveTo(M, M + k * G); c.lineTo(S - M, M + k * G); c.stroke();
      c.beginPath(); c.moveTo(M + k * G, M); c.lineTo(M + k * G, S - M); c.stroke();
    }
    c.fillStyle = '#4a3b26';
    [20, 24, 40, 56, 60].forEach(function (i) { var p = xy(i); c.beginPath(); c.arc(p[0], p[1], 3.2, 0, Math.PI * 2); c.fill(); });
    c.font = '13px -apple-system,Helvetica,Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#6b5638';
    for (k = 0; k < N; k++) {
      c.fillText(Go.COLS[k], M + k * G, M / 2 - 2); c.fillText(Go.COLS[k], M + k * G, S - M / 2 + 2);
      c.fillText(N - k, M / 2 - 4, M + k * G); c.fillText(N - k, S - M / 2 + 4, M + k * G);
    }
    if (!state) return;
    var scoring = state.phase === 'scoring', sc = scoring ? Go.score(state) : null, dead = state.dead || [];
    state.board.forEach(function (v, i) {
      if (!v) return; var p = xy(i), isDead = dead.indexOf(i) >= 0;
      stone(p[0], p[1], v, isDead ? .4 : 1);
      if (isDead) { c.strokeStyle = '#c43c2c'; c.lineWidth = 2; var d = G * .2; c.beginPath(); c.moveTo(p[0] - d, p[1] - d); c.lineTo(p[0] + d, p[1] + d); c.moveTo(p[0] + d, p[1] - d); c.lineTo(p[0] - d, p[1] + d); c.stroke(); }
    });
    if (sc) sc.owner.forEach(function (o, i) {
      if (!o || (state.board[i] && dead.indexOf(i) < 0)) return;
      var p = xy(i), d = G * .14; c.fillStyle = o === 1 ? '#111' : '#fff'; c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = .8;
      c.fillRect(p[0] - d, p[1] - d, 2 * d, 2 * d); c.strokeRect(p[0] - d, p[1] - d, 2 * d, 2 * d);
    });
    if (state.last >= 0 && state.phase !== 'scoring') {
      var lp = xy(state.last); c.strokeStyle = '#d0402a'; c.lineWidth = 2.2;
      c.beginPath(); c.arc(lp[0], lp[1], G * .2, 0, Math.PI * 2); c.stroke();
    }
    if (hover >= 0 && canMove() && !state.board[hover]) { var hp = xy(hover); stone(hp[0], hp[1], state.turn, .35); }
  }
  function idxFromEvent(e) {
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * S / r.width, y = (e.clientY - r.top) * S / r.height;
    var gx = Math.round((x - M) / G), gy = Math.round((y - M) / G);
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) return -1;
    var p = xy(gy * N + gx); if (Math.hypot(p[0] - x, p[1] - y) > G * .5) return -1;
    return gy * N + gx;
  }

  // ---------- rendering of UI ----------
  function canMove() {
    if (!state || state.phase !== 'play') return false;
    if (mode === 'local') return true;
    return connected && state.turn === myColor;
  }
  function render() {
    draw();
    if (!state) return;
    $('youAre').textContent = mode === 'local' ? '双方' : NAME[myColor];
    $('capB').textContent = state.captures[1]; $('capW').textContent = state.captures[2];
    $('komi').textContent = state.komi; $('moveNo').textContent = state.moveNo;
    var ph = state.phase, turn = $('turn');
    if (ph === 'play') {
      var lastTxt = state.last === -2 ? '（对方停了一手）' : state.last >= 0 ? '（上一手 ' + Go.coord(state.last) + '）' : '';
      turn.textContent = '轮到：' + NAME[state.turn] + (mode === 'local' ? '' : state.turn === myColor ? '（你）' : '（对手）') + ' ' + lastTxt;
    } else if (ph === 'scoring') turn.textContent = '数子阶段：点击棋块标记死子';
    else turn.textContent = '对局结束';
    var sb = $('scoreBox');
    if (ph === 'scoring') {
      var s = Go.score(state);
      sb.classList.remove('hidden');
      sb.innerHTML = '黑 ' + s.black + ' 子 · 白 ' + s.white + ' + ' + state.komi + ' = ' + s.whiteTotal + ' → <b>' + (s.winner ? NAME[s.winner] + '胜 ' + s.margin + ' 子' : '和棋') + '</b><br>' +
        '确认：黑 ' + (state.confirm[1] ? '✓' : '…') + ' · 白 ' + (state.confirm[2] ? '✓' : '…');
    } else sb.classList.add('hidden');
    var res = $('result'), r = state.result;
    if (ph === 'ended' && r) {
      res.textContent = r.by === 'resign' ? NAME[r.winner] + '中盘胜（' + NAME[3 - r.winner] + '认输）'
        : '黑 ' + r.black + ' 子 · 白 ' + r.white + ' 子（含贴目）→ ' + (r.winner ? NAME[r.winner] + '胜 ' + r.margin + ' 子' : '和棋');
    } else res.textContent = '';
    var online = mode !== 'local';
    $('passBtn').hidden = ph !== 'play';
    $('resignBtn').hidden = ph === 'ended';
    $('undoBtn').hidden = ph === 'ended';
    $('confirmBtn').hidden = ph !== 'scoring';
    $('confirmBtn').disabled = online && state.confirm[myColor];
    $('confirmBtn').textContent = online && state.confirm[myColor] ? '已确认，等待对方' : '确认结果';
    $('resumeBtn').hidden = ph !== 'scoring';
    $('rematchBtn').hidden = ph !== 'ended';
    var act = mode === 'local' || connected;
    ['passBtn', 'undoBtn', 'resignBtn', 'resumeBtn', 'rematchBtn'].forEach(function (id) { $(id).disabled = !act; });
    if (online && act) { $('passBtn').disabled = state.turn !== myColor; $('confirmBtn').disabled = state.confirm[myColor]; }
    if (online && !act) $('confirmBtn').disabled = true;
    if (pendingReq) $('undoBtn').disabled = $('rematchBtn').disabled = true;
  }

  // ---------- actions ----------
  function act(a) {
    if (mode === 'local') {
      var col = state.turn, r;
      if (a.type === 'confirm') { r = Go.confirm(state, 1); if (r.ok) r = Go.confirm(r.state, 2); }
      else r = Go.apply(state, a, col);
      if (!r.ok) return showMsg(r.error);
      return setState(r.state);
    }
    if (!connected) return showMsg('对手未连接');
    var res = Go.apply(state, a, myColor);
    if (!res.ok) return showMsg(res.error);
    if (mode === 'host') setState(res.state);
    else { state = res.state; render(); send({ t: 'act', a: a }); }
  }
  function request(kind) {
    if (mode === 'local') {
      if (kind === 'undo') { var r = Go.undo(state, 3 - state.turn); if (!r.ok) return showMsg(r.error); return setState(r.state); }
      if (kind === 'rematch') return setState(Go.create(7));
    }
    if (!connected) return showMsg('对手未连接');
    if (kind === 'undo' && !Go.undoPlies(state, myColor)) return showMsg('没有可以悔的棋');
    pendingReq = kind; send({ t: 'req', kind: kind });
    showMsg(kind === 'undo' ? '已发送悔棋请求，等待对方同意…' : '已邀请再来一局，等待对方同意…', true);
    render();
  }
  function performAccepted(kind, requester) {
    if (mode !== 'host') return;
    if (kind === 'undo') { var r = Go.undo(state, requester); if (r.ok) setState(r.state); else showMsg(r.error); }
    else if (kind === 'rematch') { hostColor = 3 - hostColor; myColor = hostColor; setState(Go.create(7)); showMsg('新的一局开始，双方交换颜色', true); }
  }
  function showPrompt(kind) {
    incomingReq = kind;
    $('promptText').textContent = kind === 'undo' ? '对手请求悔棋，同意吗？' : '对手想再来一局（交换颜色），同意吗？';
    $('prompt').hidden = false;
  }
  function answer(ok) {
    var kind = incomingReq; incomingReq = null; $('prompt').hidden = true;
    if (!kind) return;
    send({ t: 'reply', kind: kind, ok: ok });
    if (ok && mode === 'host') performAccepted(kind, 3 - myColor);
  }

  // ---------- networking ----------
  function onData(d) {
    lastSeen = Date.now();
    if (!d || typeof d !== 'object') return;
    if (d.t === 'ping') return;
    if (mode === 'host') {
      if (d.t === 'hello') { sendState(); return; }
      if (d.t === 'act') {
        var r = Go.apply(state, d.a, 3 - myColor);
        if (r.ok) setState(r.state); else sendState(); // reject: resync guest
        return;
      }
      if (d.t === 'sync') { sendState(); return; }
    } else {
      if (d.t === 'state') {
        hostColor = d.hostColor; myColor = 3 - hostColor;
        if (pendingReq === 'rematch' && d.s.moveNo === 0 && d.s.phase === 'play') pendingReq = null;
        state = d.s; if (!connected) setConnected(true); else render(); return;
      }
      if (d.t === 'full') { roomFull = true; stopRetry(); var fc = conn; conn = null; connected = false; try { fc.close(); } catch (e) {} setStatus('off', '房间已满：已有两位玩家在对局'); render(); return; }
    }
    if (d.t === 'req') { showPrompt(d.kind); return; }
    if (d.t === 'reply') {
      var mine = pendingReq === d.kind; pendingReq = null;
      showMsg(d.ok ? (d.kind === 'undo' ? '对方同意悔棋' : '对方同意再来一局') : '对方拒绝了请求', d.ok);
      if (d.ok && mine && mode === 'host') performAccepted(d.kind, myColor);
      render();
    }
  }
  function setConnected(on) {
    connected = on;
    if (mode === 'host') setStatus(on ? 'on' : 'wait', on ? '已连接 · 对手在线' : (guestCid ? '对手断开，等待重连…' : '等待对手加入…（把房间号或链接发给朋友）'));
    else setStatus(on ? 'on' : 'off', on ? '已连接 · 对局中' : '与房主断开，正在重连…');
    if (roomFull) setStatus('off', '房间已满：已有两位玩家在对局');
    if (!on) { pendingReq = null; incomingReq = null; $('prompt').hidden = true; }
    render();
  }
  function wire(cn) {
    cn.on('data', onData);
    cn.on('close', function () { if (conn === cn) { conn = null; setConnected(false); if (mode === 'guest') scheduleRetry(); } });
    cn.on('error', function () {});
  }
  function startPing() {
    clearInterval(pingTimer);
    pingTimer = setInterval(function () {
      if (conn && conn.open) {
        send({ t: 'ping' });
        if (connected && Date.now() - lastSeen > 12000) { var cn = conn; conn = null; try { cn.close(); } catch (e) {} setConnected(false); if (mode === 'guest') scheduleRetry(); }
      }
    }, 3000);
  }
  function peerOpts() { return { debug: +(new URLSearchParams(location.search).get('debug') || 0) }; }

  function startHost(c0, color, resumed) {
    mode = 'host'; code = c0; hostColor = color; myColor = color;
    if (!resumed) state = Go.create(7);
    history.replaceState(null, '', '?room=' + code);
    enterGame(); $('roomBar').classList.remove('hidden'); $('roomCode').textContent = code;
    setStatus('wait', '正在创建房间…'); saveHost(); render();
    openHostPeer(resumed);
    startPing();
  }
  function openHostPeer(resumed) {
    if (peer) try { peer.destroy(); } catch (e) {}
    peer = new Peer(PREFIX + code, peerOpts());
    peer.on('open', function () { setConnected(!!(conn && conn.open)); });
    peer.on('connection', function (cn) {
      cn.on('open', function () {
        cn.once('data', function (d) {
          if (!d || d.t !== 'hello') { cn.close(); return; }
          var alive = conn && conn.open && Date.now() - lastSeen < 12000;
          if (alive && guestCid && d.cid !== guestCid) { cn.send({ t: 'full' }); setTimeout(function () { cn.close(); }, 300); return; }
          if (conn && conn !== cn) { var old = conn; conn = null; try { old.close(); } catch (e) {} }
          conn = cn; guestCid = d.cid; lastSeen = Date.now(); wire(cn); setConnected(true); sendState();
          if (pendingReq) { pendingReq = null; render(); }
        });
      });
    });
    peer.on('disconnected', function () { setTimeout(function () { if (peer && !peer.destroyed) try { peer.reconnect(); } catch (e) {} }, 2000); });
    peer.on('error', function (err) {
      if (err.type === 'unavailable-id') {
        if (!resumed && state.moveNo === 0 && !guestCid) { try { localStorage.removeItem(STORE + code); } catch (e) {} code = newCode(); $('roomCode').textContent = code; history.replaceState(null, '', '?room=' + code); saveHost(); return setTimeout(function () { openHostPeer(false); }, 300); }
        setStatus('wait', '房间号仍被旧连接占用，几秒后重试…');
        return setTimeout(function () { openHostPeer(true); }, 4000);
      }
      if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
        setStatus('off', '连接信令服务器失败，正在重试…');
        setTimeout(function () { openHostPeer(true); }, 5000);
      }
    });
  }

  function startGuest(c0) {
    mode = 'guest'; code = c0; state = Go.create(7); myColor = 2;
    history.replaceState(null, '', '?room=' + code);
    enterGame(); $('roomBar').classList.remove('hidden'); $('roomCode').textContent = code;
    setStatus('wait', '正在连接房间 ' + code + '…'); render();
    peer = new Peer(peerOpts());
    peer.on('open', connectToHost);
    peer.on('disconnected', function () { setTimeout(function () { if (peer && !peer.destroyed) try { peer.reconnect(); } catch (e) {} }, 2000); });
    peer.on('error', function (err) {
      if (err.type === 'peer-unavailable') setStatus('off', '找不到房间 ' + code + '（房主可能已离开），正在重试…');
      else setStatus('off', '连接出错（' + err.type + '），正在重试…');
      scheduleRetry();
    });
    startPing();
  }
  function connectToHost() {
    stopRetry();
    if (!peer || peer.destroyed) return;
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) {} return scheduleRetry(); }
    var cn = peer.connect(PREFIX + code, { reliable: true });
    var t = setTimeout(function () { if (!cn.open) { try { cn.close(); } catch (e) {} scheduleRetry(); } }, 10000);
    cn.on('open', function () {
      clearTimeout(t); conn = cn; lastSeen = Date.now(); wire(cn);
      cn.send({ t: 'hello', cid: cid }); setStatus('wait', '已连上房主，正在同步棋局…');
    });
  }
  function scheduleRetry() { if (mode !== 'guest' || retryTimer || roomFull) return; retryTimer = setTimeout(function () { retryTimer = null; if (!conn) connectToHost(); }, 3000); }
  function stopRetry() { clearTimeout(retryTimer); retryTimer = null; }

  function startLocal() {
    mode = 'local'; state = Go.create(7); myColor = 0; connected = true;
    enterGame(); $('roomBar').classList.add('hidden'); setStatus('on', '本地对战 · 双方轮流在同一设备落子'); render();
  }
  function leave() {
    if (mode !== 'local' && state && state.phase !== 'ended' && !window.confirm('确定离开房间吗？')) return;
    if (mode === 'host') try { localStorage.removeItem(STORE + code); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    location.href = location.pathname;
  }

  // ---------- events ----------
  cv.addEventListener('click', function (e) {
    var i = idxFromEvent(e); if (i < 0 || !state) return;
    if (state.phase === 'play') { if (!canMove()) return showMsg(mode !== 'local' && !connected ? '对手未连接' : '还没轮到你'); act({ type: 'move', i: i }); }
    else if (state.phase === 'scoring') { if (state.board[i]) act({ type: 'dead', i: i }); }
  });
  cv.addEventListener('mousemove', function (e) { var i = idxFromEvent(e); if (i !== hover) { hover = i; draw(); } });
  cv.addEventListener('mouseleave', function () { hover = -1; draw(); });
  $('passBtn').onclick = function () { act({ type: 'pass' }); };
  $('resignBtn').onclick = function () { if (window.confirm(mode === 'local' ? NAME[state.turn] + '方认输？' : '确定认输吗？')) act({ type: 'resign' }); };
  $('confirmBtn').onclick = function () { act({ type: 'confirm' }); };
  $('resumeBtn').onclick = function () { act({ type: 'resume' }); };
  $('undoBtn').onclick = function () { request('undo'); };
  $('rematchBtn').onclick = function () { request('rematch'); };
  $('acceptBtn').onclick = function () { answer(true); };
  $('rejectBtn').onclick = function () { answer(false); };
  $('leaveBtn').onclick = leave;
  $('copyBtn').onclick = function () {
    var l = link(), b = this;
    var done = function () { b.textContent = '已复制'; setTimeout(function () { b.textContent = '复制邀请链接'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(done, function () { window.prompt('复制这个链接发给朋友：', l); });
    else window.prompt('复制这个链接发给朋友：', l);
  };
  $('createBtn').onclick = function () {
    if (typeof Peer === 'undefined') return alert('联机组件加载失败，请刷新重试');
    var v = +document.querySelector('input[name=color]:checked').value;
    startHost(newCode(), v || (Math.random() < .5 ? 1 : 2), false);
  };
  function joinCode() {
    var v = $('codeInput').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length !== 6) return alert('请输入 6 位房间号');
    startGuest(v);
  }
  $('joinBtn').onclick = joinCode;
  $('codeInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') joinCode(); });
  $('localBtn').onclick = startLocal;

  // ---------- boot ----------
  var q = new URLSearchParams(location.search).get('room');
  if (q) {
    q = q.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    var rec = null; try { rec = JSON.parse(localStorage.getItem(STORE + q)); } catch (e) {}
    if (rec && rec.state && Date.now() - rec.ts < 7 * 864e5) { state = rec.state; startHost(q, rec.hostColor, true); }
    else startGuest(q);
  }
  window.__go9 = { get peer() { return peer; }, get state() { return state; }, get mode() { return mode; }, get connected() { return connected; }, get myColor() { return myColor; }, get code() { return code; }, act: act, request: request, answer: answer };
  draw();
})();
