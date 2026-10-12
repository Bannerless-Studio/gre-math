'use strict';
// Build-time math rendering (M2): KaTeX output, escaping, font-subset detection, inlined CSS.
const fs = require('fs');
const path = require('path');
const { suite } = require('./lib/check.js');
const { load } = require('./lib/fixture.js');
const R = require('../tools/render.js');
const T = require('../engine/text.js');
const S = suite('render_checks');

const r = (src, inline) => R.renderText(src, !!inline, 'T');

// fraction, display integral, matrix, inline vs display
S.check('fraction renders a fraction line', r('$\\frac{a}{b}$').html.includes('frac-line') && r('$\\frac{a}{b}$').errors.length === 0);
{
  const d = r('$$\\int_0^1 x e^x\\,dx$$');
  S.check('display integral renders in display mode with a large operator', d.html.includes('katex-display') && d.html.includes('op-symbol large-op') && d.errors.length === 0, d.errors);
}
{
  const m = r('$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$');
  S.check('2x2 pmatrix renders an array with two rows, no MathML twin',
    m.errors.length === 0 && m.html.includes('arraycolsep') && !m.html.includes('<math') && (m.html.match(/<span class="vlist-r">/g) || []).length >= 2, m.errors);
}
S.check('inline math is not display mode', !r('$x$').html.includes('katex-display') && r('$x$').html.includes('class="katex"'));
S.check('display math is display mode', r('$$x$$').html.includes('katex-display'));

// output size and accessibility: html only, TeX in aria-label, trust off
{
  const x = r('$x^2$', true).html;
  S.check('no MathML twin is emitted', !/<math|katex-mathml|annotation/.test(x), x);
  S.check('math carries role=math and the raw TeX as aria-label', x.startsWith('<span role="math" aria-label="x^2">'), x);
  S.check('aria-label escapes quotes and angle brackets', r('$a<b\\text{"q"}$', true).html.includes('aria-label="a&lt;b\\text{&quot;q&quot;}"'), r('$a<b\\text{"q"}$', true).html);
  ['\\href{http://x.y}{z}', '\\url{http://x.y}', '\\htmlClass{c}{z}', '\\htmlStyle{color:red}{z}', '\\includegraphics{a.png}'].forEach((tex) => {
    const e = r('$' + tex + '$', true);
    S.check('trust off rejects ' + tex, e.errors.length > 0 && !/<a |href=|<img/.test(e.html), e.html);
  });
  S.check('code span keeps $ literal', r('`a $x$ b`', true).html === '<code>a $x$ b</code>', r('`a $x$ b`', true).html);
  S.check('forged placeholder markers in source are stripped', !/undefined/.test(r('a \u{E000}0\u{E001} b $x$', true).html) && r('a \u{E000}0\u{E001} b $x$', true).errors.length === 0);
}

// escaping of non-math text
{
  const e = r('a < b and <script>x</script> & "q"');
  S.check('angle brackets in text are escaped', e.html.includes('a &lt; b') && !/<script/.test(e.html) && e.html.includes('&lt;script&gt;'), e.html);
  S.check('ampersand and quotes in text are escaped', e.html.includes('&amp;') && e.html.includes('&quot;q&quot;'), e.html);
}
S.check('escaped dollar is a literal dollar', r('costs \\$5 and $x$').html.includes('costs $5 and <span role="math"') && r('\\$x\\$').html === '<p>$x$</p>', r('costs \\$5').html);
S.check('markdown-lite still applies around math', r('**bold $x$** and `code`').html.includes('<strong>bold <span role="math"') && r('`c`').html.includes('<code>c</code>'));

// bad LaTeX fails
{
  const bad = r('$\\frac{a$');
  S.check('unclosed \\frac{ is a LaTeX error', bad.errors.some((e) => /LaTeX error in \$\\frac\{a\$/.test(e)), bad.errors);
}
S.check('unknown macro is a LaTeX error', r('$\\nosuchmacro{x}$').errors.some((e) => /LaTeX/.test(e)));

// font subset
{
  const bad = ['\\mathfrak{g}', '\\mathscr{L}', '\\mathtt{x}', '\\mathsf{x}', '\\boldsymbol{x}'];
  bad.forEach((tex) => {
    const g = R.glyphIssues(r('$' + tex + '$').html);
    S.check('glyph outside core subset is flagged: ' + tex, g.length === 1, g);
  });
  const ok = ['\\mathbf{x}', '\\mathbb{R}', '\\mathcal{L}', '\\mathit{x}', '\\sum_{i=1}^n i', '\\left(\\frac{a}{b}\\right)'];
  ok.forEach((tex) => {
    const e = r('$' + tex + '$');
    S.check('core subset glyph passes: ' + tex, e.errors.length === 0, e.errors);
  });
  const frak = r('$\\mathfrak{g}$').errors.find((e) => /outside the core subset/.test(e)) || '';
  S.check('font error names the face', frak.includes('KaTeX_Fraktur'), frak);
}

// inlined CSS: core faces only, base64 woff2
{
  const css = R.inlineCss();
  const faces = css.match(/@font-face\{[^}]*\}/g) || [];
  S.eq('ten core @font-face rules inlined', faces.length, 10);
  S.check('every inlined face is base64 woff2', faces.every((f) => /src:url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\) format\("woff2"\)$/.test(f.replace(/\}$/, '').trim())));
  S.check('no non-core face in @font-face', !faces.some((f) => /KaTeX_(Fraktur|Script|SansSerif|Typewriter)|Math-BoldItalic|font-weight:700;src:url\(data:font\/woff2;base64,[^)]*\) format\("woff2"\)[^}]*KaTeX_Math/.test(f)));
  S.check('no woff or ttf fallbacks inlined', !/format\("woff"\)|format\("truetype"\)/.test(css));
  S.eq('core subset list has ten faces', R.CORE_FONTS.length, 10);
  S.check('every core font file is vendored', R.CORE_FONTS.every((f) => fs.existsSync(path.join(__dirname, '..', 'vendor', 'katex', 'fonts', f + '.woff2'))));
}

// vendor pin
S.eq('vendored katex is 0.16.11', R.katex.version, '0.16.11');
S.check('vendor VERSION records the pin', fs.readFileSync(path.join(__dirname, '..', 'vendor', 'katex', 'VERSION'), 'utf8').startsWith('katex 0.16.11'));

// shared text module keeps the M1 behaviour without a math hook
S.eq('no math hook keeps $...$ as typed', T.md('$x$ **b**', true), '$x$ <strong>b</strong>');
S.eq('paragraphs split on blank lines', T.md('a\n\nb'), '<p>a</p><p>b</p>');

// items and techniques
{
  const d = load();
  const it = Object.assign({}, d.items.find((i) => i.answer.kind === 'mcq'), {});
  const fixtureErrs = d.items.reduce((acc, i) => acc.concat(R.renderItem(i, i.id).errors), []).concat(
    d.techniques.reduce((acc, t) => acc.concat(R.renderTechnique(t, t.id).errors), []));
  S.eq('fixture pack renders with no errors', fixtureErrs, []);
  const tech = R.renderTechnique(d.techniques[0], 'x');
  S.check('technique teach card validates', tech.errors.length === 0, tech.errors);
  const ri = R.renderItem(it, 'fixture item');
  S.check('renderItem returns errors only, no html field', ri.errors.length === 0 && !('html' in ri), ri);
}

// runtime (page) rendering: same span and markup as the build validates; bad TeX never throws in the page
{
  const samples = [['$\\frac{a}{b}$', true], ['$$\\int_0^1 x e^x\\,dx$$', false], ['$\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$', true],
    ['costs \\$5 and `$x$` code, <b>tag</b> & "q"', true], ['**bold $x^2$** and $$\\sum_{i=1}^n i$$', false]];
  samples.forEach(([src, inline]) => {
    const built = R.renderText(src, inline, 'parity').html;
    const runtime = T.md(src, inline, (tex, dsp) => T.mathSpan(R.katex, tex, dsp));
    S.check('runtime and build markup match: ' + src, built === runtime, { built, runtime });
  });
  const bad = T.mathSpan(R.katex, '\\frac{a', false);
  S.check('runtime bad TeX draws as red text, no throw', bad.includes('katex-error') && !bad.includes('<math'), bad);
  ['\\href{http://x.y}{z}', '\\url{http://x.y}', '\\htmlClass{c}{z}'].forEach((tex) => {
    const h = T.mathSpan(R.katex, tex, false);
    S.check('runtime trust off: ' + tex + ' is red error text, not a link', h.includes('color:#cc0000') && !/<a |href=/.test(h), h);
  });
  const xss = T.md('<img src=x onerror=alert(1)> and $x$ and `$y$`', true, (tex, dsp) => T.mathSpan(R.katex, tex, dsp));
  S.check('runtime escapes non-math text before splicing math', !/<img/.test(xss) && xss.includes('&lt;img') && xss.includes('<code>$y$</code>'), xss);
  S.check('no tag dictionary left in the text module', !('unpackData' in T) && !('unpack' in T) && !('packHtml' in R));
}

// ---- figures (tools/figure.js, wired through render.renderItem and renderTechnique)
{
  const F = require('../tools/figure.js');
  const figErrs = (svg) => F.checkFigure(svg, 'F');
  const OK = '<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="70" x2="110" y2="70" stroke="currentColor"/>' +
    '<path d="M10 70 Q60 0 110 70" fill="none"/><text x="60" y="12" text-anchor="middle" font-size="10">a &amp; b &lt; c</text></svg>';
  S.eq('allowed figure has no errors', figErrs(OK), []);
  S.eq('marker with url(#fig-...) is allowed', figErrs('<svg viewBox="0 0 10 10"><marker id="fig-arr" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 z"/></marker><line x1="0" y1="5" x2="10" y2="5" marker-end="url(#fig-arr)"/></svg>'), []);
  S.eq('tspan, title, defs, g, rect, circle, ellipse, polygon, polyline are allowed',
    figErrs('<svg viewBox="0 0 9 9"><defs><title>t</title></defs><g><rect width="1" height="1"/><circle r="1"/><ellipse rx="1" ry="1"/><polygon points="0,0 1,0 1,1"/><polyline points="0,0 1,1"/><text>a<tspan>b</tspan></text></g></svg>'), []);
  const bad = {
    'script element': '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
    'onload attribute': '<svg viewBox="0 0 1 1" onload="alert(1)"><rect/></svg>',
    'onclick on a shape': '<svg viewBox="0 0 1 1"><rect onclick="x()"/></svg>',
    'href on a shape': '<svg viewBox="0 0 1 1"><path href="javascript:alert(1)" d="M0 0"/></svg>',
    'anchor element': '<svg viewBox="0 0 1 1"><a href="http://x"><rect/></a></svg>',
    'xlink attribute': '<svg viewBox="0 0 1 1"><use xlink:href="#a"/></svg>',
    'style attribute': '<svg viewBox="0 0 1 1"><rect style="fill:red"/></svg>',
    'class attribute': '<svg viewBox="0 0 1 1"><rect class="x"/></svg>',
    'foreignObject': '<svg viewBox="0 0 1 1"><foreignObject><div>x</div></foreignObject></svg>',
    'image element': '<svg viewBox="0 0 1 1"><image href="http://x/y.png"/></svg>',
    'comment opener': '<svg viewBox="0 0 1 1"><!-- x --><rect/></svg>',
    'CDATA': '<svg viewBox="0 0 1 1"><![CDATA[<script>]]></svg>',
    'closing script tag': '<svg viewBox="0 0 1 1"><rect/></svg></script>',
    'external url in fill': '<svg viewBox="0 0 1 1"><rect fill="url(http://evil.example/x.svg#a)"/></svg>',
    'colon in a value': '<svg viewBox="0 0 1 1"><text x="javascript:1">x</text></svg>',
    'uppercase SCRIPT': '<svg viewBox="0 0 1 1"><SCRIPT>x</SCRIPT></svg>',
    'id that shadows the answer input': '<svg viewBox="0 0 1 1"><rect id="ans"/></svg>',
    'bare ampersand in text': '<svg viewBox="0 0 1 1"><text>a & b</text></svg>',
    'boolean attribute without value': '<svg viewBox="0 0 1 1"><rect hidden/></svg>',
    'missing viewBox': '<svg><rect/></svg>',
    'viewBox with a word': '<svg viewBox="0 0 wide 1"><rect/></svg>',
    'no svg root': '<g><rect/></g>',
    'two roots': '<svg viewBox="0 0 1 1"></svg><svg viewBox="0 0 1 1"></svg>',
    'unclosed element': '<svg viewBox="0 0 1 1"><g><rect/></svg>',
    'text outside the root': 'hello<svg viewBox="0 0 1 1"><rect/></svg>',
    'xmlns to another namespace': '<svg viewBox="0 0 1 1" xmlns="http://example.org/x"><rect/></svg>',
  };
  // Unicode whitespace is not an HTML attribute separator: the scanner and the browser must agree on tag structure.
  const NB = String.fromCharCode(0xa0), VT = String.fromCharCode(11);
  Object.assign(bad, {
    'nbsp attribute injection': '<svg viewBox="0 0 1 1"><rect' + NB + 'x="1 onmouseover=alert(1) y=" fill="red"/></svg>',
    'vt attribute injection': '<svg viewBox="0 0 1 1"><rect' + VT + 'x="1 onmouseover=alert(1) y=" fill="red"/></svg>',
    'nbsp in root tag': '<svg' + NB + 'viewBox="0 0 1 1"></svg>',
    'duplicate attribute': '<svg viewBox="0 0 1 1"><rect x="1" x="2"/></svg>',
    'NUL in text': '<svg viewBox="0 0 1 1"><text>' + String.fromCharCode(0) + '</text></svg>',
    'URL( upper case': '<svg viewBox="0 0 1 1"><rect fill="URL(//e.example/a#b)"/></svg>'
  });
  Object.keys(bad).forEach((k) => S.check('figure rejects ' + k, figErrs(bad[k]).length > 0, bad[k]));
  S.check('figure over 8 KB is rejected', figErrs('<svg viewBox="0 0 1 1">' + '<rect/>'.repeat(1200) + '</svg>').some((e) => /limit 8192/.test(e)));
  const pad = (n) => { const head = '<svg viewBox="0 0 1 1">', tail = '</svg>'; return head + ' '.repeat(n - head.length - tail.length) + tail; };
  S.eq('figure of exactly 8192 bytes is allowed', figErrs(pad(8192)), []);
  S.check('figure of 8193 bytes is rejected', figErrs(pad(8193)).length > 0);
  // wiring: the build gate reaches items and teach cards, and only strings pass
  const badSvg = '<svg viewBox="0 0 1 1"><script>x</script></svg>';
  const item = { id: 'x1', prompt: 'p', solution: 's', answer: { kind: 'mcq', options: ['a', 'b'], correct: 0 }, figure: badSvg };
  S.check('renderItem rejects a script figure on an item', R.renderItem(item, 'I').errors.some((e) => /figure/.test(e)));
  S.eq('renderItem accepts a good figure on an item', R.renderItem(Object.assign({}, item, { figure: OK }), 'I').errors, []);
  S.check('renderTechnique rejects a script figure on a teach card', R.renderTechnique({ teach: 'x', figure: badSvg }, 'T').errors.some((e) => /figure/.test(e)));
  S.eq('renderTechnique accepts a good figure on a teach card', R.renderTechnique({ teach: 'x', figure: OK }, 'T').errors, []);
  S.check('a non-string figure is rejected', R.renderItem(Object.assign({}, item, { figure: 5 }), 'I').errors.length > 0);
}

const res = S.done();
process.exitCode = res.failed ? 1 : 0;
