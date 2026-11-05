(function () {
  'use strict';
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var statusEl = document.getElementById('status');

  var audioCtx = null, analyser = null, data = null, stream = null;
  var mode = 'idle'; // idle | mic | melody
  var melodyTimer = null, melodyNodes = [];
  var running = true;
  var bars = reduce ? 48 : 96;
  var smooth = new Float32Array(bars);

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      data = new Uint8Array(analyser.frequencyBinCount);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function setStatus(t) { statusEl.textContent = t; }

  function stopAll() {
    mode = 'idle';
    if (melodyTimer) { clearInterval(melodyTimer); melodyTimer = null; }
    melodyNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
    melodyNodes = [];
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    // disconnect mic source if any — recreate analyser link next time
    setStatus('Stopped. Choose mic or melody.');
  }

  document.getElementById('stop').onclick = stopAll;

  document.getElementById('mic').onclick = function () {
    stopAll();
    ensureAudio();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Microphone API not available. Try the melody instead.');
      return;
    }
    setStatus('Asking for microphone…');
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (s) {
      stream = s;
      var src = audioCtx.createMediaStreamSource(s);
      src.connect(analyser);
      // do NOT connect to destination — silent listen
      mode = 'mic';
      setStatus('Listening. Speak or play something nearby. Nothing is recorded.');
    }).catch(function (err) {
      setStatus('Mic denied or unavailable (' + (err && err.name || 'error') + '). Try the melody.');
    });
  };

  // Pentatonic-ish generative melody
  var SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pent + extensions
  var ROOT = 196; // G3

  function playMelody() {
    stopAll();
    ensureAudio();
    mode = 'melody';
    setStatus('Playing a little generative melody…');

    // soft pad into analyser + speakers
    var master = audioCtx.createGain();
    master.gain.value = 0.18;
    master.connect(analyser);
    master.connect(audioCtx.destination);

    var step = 0;
    function note() {
      if (mode !== 'melody') return;
      var deg = SCALE[(Math.random() * SCALE.length) | 0];
      // occasional jump
      if (Math.random() < 0.15) deg += 12;
      var freq = ROOT * Math.pow(2, deg / 12);
      var osc = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      osc.type = Math.random() < 0.5 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      var now = audioCtx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.55, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55 + Math.random() * 0.35);
      osc.connect(g); g.connect(master);
      osc.start(now);
      osc.stop(now + 0.95);
      melodyNodes.push(osc);
      // prune
      if (melodyNodes.length > 24) melodyNodes.shift();
      step++;
    }
    note();
    melodyTimer = setInterval(note, reduce ? 520 : 380);
  }
  document.getElementById('melody').onclick = playMelody;

  // background
  function drawIdle(t) {
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a1820');
    g.addColorStop(1, '#0e0e12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = 'italic 28px Palatino, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(mode === 'idle' ? 'waiting for sound' : '', W / 2, H / 2);
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);

    if (!analyser || mode === 'idle') {
      drawIdle(now);
      // gentle idle rings
      ctx.strokeStyle = 'rgba(180,85,60,0.25)';
      ctx.lineWidth = 1.5;
      var r = 60 + Math.sin(now * 0.001) * 10;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke();
      return;
    }

    analyser.getByteFrequencyData(data);
    var binSize = (data.length / bars) | 0;
    for (var i = 0; i < bars; i++) {
      var sum = 0;
      var start = i * binSize;
      for (var j = 0; j < binSize; j++) sum += data[start + j];
      var v = sum / binSize / 255;
      smooth[i] = smooth[i] * 0.72 + v * 0.28;
    }

    // dark wash
    ctx.fillStyle = 'rgba(12,12,16,0.28)';
    ctx.fillRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    // radial bars
    for (i = 0; i < bars; i++) {
      var ang = (i / bars) * Math.PI * 2 - Math.PI / 2;
      var amp = smooth[i];
      var inner = 70;
      var outer = inner + 40 + amp * (reduce ? 160 : 260);
      var x0 = cx + Math.cos(ang) * inner;
      var y0 = cy + Math.sin(ang) * inner;
      var x1 = cx + Math.cos(ang) * outer;
      var y1 = cy + Math.sin(ang) * outer;
      var hue = (i / bars) * 300 + (mode === 'mic' ? 10 : 180);
      ctx.strokeStyle = 'hsla(' + hue + ',70%,' + (45 + amp * 30) + '%,0.9)';
      ctx.lineWidth = Math.max(2, (Math.PI * 2 * inner) / bars * 0.65);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // center disc
    var bass = 0;
    for (i = 0; i < 8; i++) bass += smooth[i];
    bass /= 8;
    ctx.beginPath();
    ctx.fillStyle = 'hsla(' + (mode === 'mic' ? 12 : 200) + ',65%,55%,' + (0.35 + bass * 0.5) + ')';
    ctx.arc(cx, cy, 28 + bass * 50, 0, Math.PI * 2);
    ctx.fill();

    // waveform ring
    analyser.getByteTimeDomainData(data);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    var N = Math.min(data.length, 512);
    for (i = 0; i < N; i++) {
      ang = (i / N) * Math.PI * 2;
      var rr = 55 + ((data[i] - 128) / 128) * 22;
      var x = cx + Math.cos(ang) * rr;
      var y = cy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // seed dark bg
  ctx.fillStyle = '#0e0e12';
  ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
    if (document.hidden && audioCtx && audioCtx.state === 'running') {
      // keep going but soft — optional pause melody
    }
  });
})();
