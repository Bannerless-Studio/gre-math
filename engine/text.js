/* problem-engine text: escaping and Markdown-lite, shared by the page (app.js) and the build (tools/render.js).
 * md(s, inline) without a math hook is the M1 behaviour: $...$ stays as typed.
 * md(s, inline, mathFn) tokenises $...$ and $$...$$ (and \$ for a literal dollar), then calls mathFn(tex, display)
 * for each math span and splices its returned HTML in. Only the build passes mathFn. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PEText = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var OPEN = '', CLOSE = '';   // private-use markers; esc and Markdown-lite leave them alone
  var PH_RE = /(\d+)/g;
  var TOKEN_RE = /`[^`\n]+`|\\\$|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmt(s) {
    return esc(s).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  }

  function md(s, inline, mathFn) {
    var src = String(s == null ? '' : s), maths = [];
    if (mathFn) {
      src = src.split(OPEN).join('').split(CLOSE).join('');   // author text cannot forge a placeholder
      src = src.replace(TOKEN_RE, function (m, dsp, ins) {
        if (m === '\\$') return '$';
        if (m.charAt(0) === '`') return m;   // code span: $ stays literal
        maths.push({ tex: dsp !== undefined ? dsp : ins, display: dsp !== undefined });
        return OPEN + (maths.length - 1) + CLOSE;
      });
    }
    var html = src.split(/\n\s*\n/).map(function (p) {
      var h = fmt(p).replace(/\n/g, '<br>');
      return inline ? h : '<p>' + h + '</p>';
    });
    var out = inline ? html.join(' ') : html.join('');
    if (mathFn) out = out.replace(PH_RE, function (m, i) { return mathFn(maths[Number(i)].tex, maths[Number(i)].display); });
    return out;
  }

  // Build-time tag dictionary: rendered HTML repeats a few hundred tags thousands of times. The build swaps each
  // frequent tag for one private-use char (TAG0 + index); the page expands them once at load.
  var TAG0 = 0xE100, TAGN = 0xF8FF - 0xE100 + 1;
  var TAG_RE = /[\uE100-\uF8FF]/g;
  function unpack(s, tags) {
    return typeof s === 'string' ? s.replace(TAG_RE, function (c) { var t = tags[c.charCodeAt(0) - TAG0]; return t === undefined ? c : t; }) : s;
  }
  // Expands the html of every item and technique in place. No-op when the pack carries no dictionary.
  function unpackData(data) {
    var tags = data.tags;
    if (!tags || !tags.length) return data;
    var fix = function (rec) {
      var h = rec.html;
      if (!h) return;
      Object.keys(h).forEach(function (k) { h[k] = Array.isArray(h[k]) ? h[k].map(function (x) { return unpack(x, tags); }) : unpack(h[k], tags); });
    };
    (data.items || []).forEach(fix); (data.techniques || []).forEach(fix);
    data.tags = [];
    return data;
  }

  return { esc: esc, md: md, OPEN: OPEN, CLOSE: CLOSE, TAG0: TAG0, TAGN: TAGN, unpack: unpack, unpackData: unpackData };
});
