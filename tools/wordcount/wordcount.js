(function () {
  'use strict';
  var ta = document.getElementById('txt'), stats = document.getElementById('stats'), KEY = 'petit.wordcount.text';
  try { ta.value = localStorage.getItem(KEY) || ''; } catch (e) {}
  var HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{2ebef}]/gu;
  var FIELDS = [['han', 'Chinese characters 汉字'], ['words', 'English words 英文单词'], ['total', 'Total words 总字数'], ['chars', 'Characters 字符'], ['nospace', 'No spaces 不含空格'], ['lines', 'Lines 行'], ['paras', 'Paragraphs 段落'], ['sent', 'Sentences 句子'], ['read', 'Reading time 阅读时间']];
  FIELDS.forEach(function (f) { var d = document.createElement('div'); d.innerHTML = '<small>' + f[1] + '</small><b id="s-' + f[0] + '">0</b>'; stats.appendChild(d); });
  var cur = {};
  function count() {
    var t = ta.value, han = (t.match(HAN) || []).length;
    var words = (t.replace(HAN, ' ').match(/[A-Za-z0-9\u00C0-\u024F]+(?:['’\-][A-Za-z0-9\u00C0-\u024F]+)*/g) || []).length;
    var chars = Array.from(t).length, nospace = Array.from(t.replace(/\s/g, '')).length;
    var lines = t ? t.split(/\n/).length : 0, paras = t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
    var sent = (t.match(/[^.!?。！？…]+[.!?。！？…]+/g) || []).length + (/[^.!?。！？…\s]\s*$/.test(t) ? 1 : 0);
    var mins = han / 300 + words / 230, read = mins < 1 ? Math.round(mins * 60) + ' s 秒' : Math.round(mins) + ' min 分钟';
    cur = { han: han, words: words, total: han + words, chars: chars, nospace: nospace, lines: lines, paras: paras, sent: sent, read: t.trim() ? read : '0' };
    Object.keys(cur).forEach(function (k) { document.getElementById('s-' + k).textContent = cur[k]; });
    try { localStorage.setItem(KEY, t); } catch (e) {}
  }
  ta.addEventListener('input', count);
  document.getElementById('clear').onclick = function () { ta.value = ''; count(); ta.focus(); };
  document.getElementById('copy').onclick = function () {
    var s = FIELDS.map(function (f) { return f[1] + ': ' + cur[f[0]]; }).join('\n'), b = this;
    if (navigator.clipboard) navigator.clipboard.writeText(s).then(function () { b.textContent = 'Copied 已复制'; setTimeout(function () { b.textContent = 'Copy stats 复制统计'; }, 1500); });
  };
  count();
})();
