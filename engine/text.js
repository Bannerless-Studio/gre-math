/* problem-engine text: escaping, Markdown-lite and math spans, shared by the page (app.js) and the build (tools/render.js).
 * md(s, inline) without a math hook is the M1 behaviour: $...$ stays as typed.
 * md(s, inline, mathFn) tokenises $...$ and $$...$$ (and \$ for a literal dollar), then calls mathFn(tex, display)
 * for each math span and splices its returned HTML in. Non-math text is escaped before any math is spliced, so the
 * only unescaped markup is what mathFn returns.
 * mathSpan(katex, tex, display, report) renders one span with the KaTeX library passed in. The page passes its global
 * and no report: bad TeX draws as red text (throwOnError false). The build passes a report that collects errors. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PEText = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var OPEN = '', CLOSE = '';   // placeholder markers; author text cannot contain them (stripped first)
  var PH_RE = new RegExp(OPEN + '(\\d+)' + CLOSE, 'g');
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

  // One math span. The same options on both sides: the build validates with throwOnError, the page renders with it off.
  // trust stays false everywhere: \href, \url, \htmlClass and friends are errors, never links or attributes.
  function mathSpan(katex, tex, display, report) {
    var check = typeof report === 'function';
    var opt = { displayMode: !!display, output: 'html', trust: false, throwOnError: check, strict: 'ignore' };
    if (check) {
      opt.strict = function (code, msg) { report('LaTeX warning ' + code + ': ' + msg); return 'ignore'; };
      opt.trust = function (ctx) { report('LaTeX command ' + ctx.command + ' is not allowed in packs (trust is off)'); return false; };
    }
    var h;
    try {
      h = katex.renderToString(String(tex), opt);
    } catch (e) {
      if (check) report('LaTeX error in ' + (display ? '$$' : '$') + tex + (display ? '$$' : '$') + ': ' + String(e.message).split('\n')[0]);
      return esc(tex);
    }
    return '<span role="math" aria-label="' + esc(String(tex).replace(/\s+/g, ' ').trim()) + '">' + h + '</span>';
  }

  // Figure above a prompt or teach card. The string is inserted as HTML, which is safe only because the build allowlist
  // (tools/figure.js) refused anything else. Never pass learner text here.
  function figure(svg) { return svg ? '<div class="figure">' + svg + '</div>' : ''; }

  return { esc: esc, md: md, mathSpan: mathSpan, figure: figure, OPEN: OPEN, CLOSE: CLOSE };
});
