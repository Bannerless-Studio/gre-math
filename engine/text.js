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
  var FO = '\uE010', FC = '\uE011';   // fenced-block placeholders
  var FENCE_RE = /```[A-Za-z0-9_+-]*[ \t]*\n([\s\S]*?)\n?```/g;
  var FPH_RE = new RegExp(FO + '(\\d+)' + FC, 'g');
  var TOKEN_RE = /`[^`\n]+`|\\\$|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Italic: *word* only when the opening star starts the text or follows a space or bracket, hugs its text, and the
  // closing star is not followed by a letter or digit. So 2*x and a * b * c stay as typed. Code spans are skipped.
  // The text may not open with closing punctuation or close on an opening bracket: "COUNT(*) ... COUNT(*)" stays as typed.
  var EM_RE = /`[^`\n]+`|(^|[\s(])\*([^\s*)\]},;:.](?:[^*\n]*?[^\s*(\[{])?)\*(?![A-Za-z0-9*])/g;
  function fmt(s) {
    return esc(s).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(EM_RE, function (m, pre, body) { return m.charAt(0) === '`' ? m : pre + '<em>' + body + '</em>'; })
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }

  // ---- GFM pipe tables. A row starts with |; the second line is a |---| separator (:--- --: :-: set alignment).
  function isRow(l) { return /^\s*\|/.test(l); }
  function isSep(l) { return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && /^\s*\|/.test(l); }
  // Splits a row on | outside code spans; \| is a literal pipe. Leading and trailing | are framing.
  function cells(l) {
    var t = l.trim(), out = [], cur = '', inCode = false, k, c;
    if (t.charAt(0) === '|') t = t.slice(1);
    for (k = 0; k < t.length; k++) {
      c = t.charAt(k);
      if (c === '\\' && t.charAt(k + 1) === '|') { cur += '|'; k++; }
      else if (c === '`') { inCode = !inCode; cur += c; }
      else if (c === '|' && !inCode) { out.push(cur); cur = ''; }
      else cur += c;
    }
    if (cur.trim() !== '' || !out.length) out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }
  function table(rows) {
    var head = cells(rows[0]), al = cells(rows[1]).map(function (c) {
      var l = c.charAt(0) === ':', r = c.charAt(c.length - 1) === ':';
      return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
    });
    function row(cs, tag) {
      var h = '<tr>';
      for (var k = 0; k < head.length; k++) {
        h += '<' + tag + (al[k] ? ' style="text-align:' + al[k] + '"' : '') + '>' + fmt(cs[k] == null ? '' : cs[k]) + '</' + tag + '>';
      }
      return h + '</tr>';
    }
    var body = rows.slice(2).map(function (l) { return row(cells(l), 'td'); }).join('');
    return '<div class="tblwrap"><table><thead>' + row(head, 'th') + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function md(s, inline, mathFn) {
    var src = String(s == null ? '' : s), maths = [], fences = [];
    // Fenced code blocks (three backticks, optional language, own lines) come out first: their text is literal,
    // so $ and ` inside stay as typed. They render as <pre><code>, escaped, and never reach the math pass.
    // All four placeholder characters go before the fence pass: a fence body is spliced back after the math pass, so
    // a math placeholder left inside one would be expanded there.
    src = src.split(FO).join('').split(FC).join('').split(OPEN).join('').split(CLOSE).join('');
    src = src.replace(FENCE_RE, function (m, body) {
      fences.push(body);
      return '\n\n' + FO + (fences.length - 1) + FC + '\n\n';
    });
    if (mathFn) {
      src = src.split(OPEN).join('').split(CLOSE).join('');   // author text cannot forge a placeholder
      src = src.replace(TOKEN_RE, function (m, dsp, ins) {
        if (m === '\\$') return '$';
        if (m.charAt(0) === '`') return m;   // code span: $ stays literal
        maths.push({ tex: dsp !== undefined ? dsp : ins, display: dsp !== undefined });
        return OPEN + (maths.length - 1) + CLOSE;
      });
    }
    // one run of text lines: formatted, display math kept free of <br>, wrapped in <p> unless inline
    function textBlock(t) {
      // a display block is a block: no <br> beside it (it left a double gap below the block)
      var h = fmt(t).replace(new RegExp('\\n?' + OPEN + '(\\d+)' + CLOSE + '\\n?', 'g'), function (m, i) {
        return maths[Number(i)] && maths[Number(i)].display ? OPEN + i + CLOSE : m;
      }).replace(/\n/g, '<br>');
      return inline ? h : '<p>' + h + '</p>';
    }
    var html = src.split(/\n\s*\n/).map(function (p) {
      if (new RegExp('^\\s*' + FO + '\\d+' + FC + '\\s*$').test(p)) return p.trim();
      if (inline || p.indexOf('|') < 0) return textBlock(p);
      // GFM pipe tables inside the paragraph: header line, separator line, body lines, all starting with |
      var lines = p.split('\n'), parts = [], run = [], i = 0;
      function flush() { if (run.length) { parts.push(textBlock(run.join('\n'))); run = []; } }
      while (i < lines.length) {
        if (isRow(lines[i]) && i + 1 < lines.length && isSep(lines[i + 1]) && cells(lines[i]).length === cells(lines[i + 1]).length) {
          var j = i + 2;
          while (j < lines.length && isRow(lines[j])) j++;
          flush();
          parts.push(table(lines.slice(i, j)));
          i = j;
        } else { run.push(lines[i]); i++; }
      }
      flush();
      return parts.join('');
    });
    var out = inline ? html.join(' ') : html.join('');
    if (fences.length) out = out.replace(FPH_RE, function (m, i) { return '<pre><code>' + esc(fences[Number(i)]) + '</code></pre>'; });
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
