/* Figure gate (build time). An item or technique may carry `figure`: one inline SVG string shown above the prompt.
 * The page inserts it as HTML (engine/text.js figure), so this file is the only defence: the build refuses any figure
 * that is not made of the allowlisted pieces below. No DOM, no network; a plain tag scanner, strict by design.
 *
 * Rules (docs/PACK_SCHEMA.md "Figures"):
 *   - at most 8 KB of UTF-8;
 *   - exactly one root <svg> with a viewBox, nothing but whitespace outside it;
 *   - elements: svg g line polyline polygon rect circle ellipse path text tspan marker defs title (lowercase, exact);
 *   - attributes: the allowlist below, exact case, no others (no style, class, on*, href, xlink:*, src), no duplicates;
 *   - tag whitespace is ASCII only; control, NBSP-like and bidi characters are refused anywhere;
 *   - no markup other than those tags: no comments, CDATA, doctype or processing instructions;
 *   - attribute values: no < > & ` { } \ ; or : characters; url(...) only as url(#fig-<name>);
 *   - ids must start with fig- so a figure cannot shadow a page element id (the answer input is #ans).
 * Figures are not styled by the author; the page CSS sizes them (.figure svg) and sets currentColor defaults. */
'use strict';

const MAX_BYTES = 8 * 1024;
const ELEMENTS = new Set(['svg', 'g', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse', 'path',
  'text', 'tspan', 'marker', 'defs', 'title']);
const ATTRS = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'width', 'height',
  'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'font-size', 'font-family',
  'text-anchor', 'transform', 'opacity', 'marker-end', 'marker-start', 'id', 'refX', 'refY', 'markerWidth',
  'markerHeight', 'orient', 'xmlns']);
const XMLNS = 'http://www.w3.org/2000/svg';
// Whitespace inside a tag is ASCII only ([ \t\n\r\f]). JS \s also matches NBSP, VT, U+2028 and friends, which the HTML
// parser does NOT treat as separators: a tag the scanner reads as `rect x="1 onmouseover=..."` would be read by the
// browser as an element named `rect x="1` with a live onmouseover attribute. Never use \s inside tags.
const WS = '[ \\t\\n\\r\\f]';
const TAG_RE = new RegExp('<(/?)([A-Za-z][A-Za-z0-9]*)((?:' + WS + '+[A-Za-z][A-Za-z0-9-]*(?:' + WS + '*=' + WS +
  '*(?:"[^"<>&\\\\]*"|\'[^\'<>&\\\\]*\'))?)*)' + WS + '*(/?)>', 'y');
const ATTR_RE = new RegExp(WS + '+([A-Za-z][A-Za-z0-9-]*)(?:' + WS + '*=' + WS + '*(?:"([^"]*)"|\'([^\']*)\'))?', 'g');
const BAD_CHARS = /[\u0000-\u0008\u000b\u000e-\u001f\u007f-\u00a0\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u2064\u2066-\u206f\u3000\ufeff\ufff9-\ufffb]/;
const BAD_VALUE_CHARS = /[<>&`{}\;:]/;
const URL_OK = /url\(#fig-[A-Za-z0-9_-]+\)/g;   // lowercase only; any other spelling of url( is refused below

function checkFigure(svg, where) {
  const errs = [];
  const err = (msg) => errs.push(`${where}: ${msg}`);
  if (typeof svg !== 'string' || !svg.trim()) { err('figure must be a non-empty SVG string'); return errs; }
  const bytes = Buffer.byteLength(svg, 'utf8');
  if (bytes > MAX_BYTES) err(`figure is ${bytes} bytes, limit ${MAX_BYTES}`);

  if (BAD_CHARS.test(svg)) err('control, non-ASCII whitespace or bidi character not allowed');
  const stack = [];
  let roots = 0, rootOk = false, pos = 0;
  while (pos < svg.length) {
    const lt = svg.indexOf('<', pos);
    const textEnd = lt < 0 ? svg.length : lt;
    if (textEnd > pos) {
      const text = svg.slice(pos, textEnd);
      if (stack.length === 0 && text.trim() !== '') err('text outside the root svg element');
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(text)) err('bare & in text (use an entity)');
    }
    if (lt < 0) break;
    TAG_RE.lastIndex = lt;
    const m = TAG_RE.exec(svg);
    if (!m) {
      const near = svg.slice(lt, lt + 24).replace(/\s+/g, ' ');
      err(`markup not allowed at offset ${lt}: ${near}`);
      break;
    }
    pos = TAG_RE.lastIndex;
    const closing = m[1] === '/', name = m[2], attrText = m[3] || '', selfClose = m[4] === '/';
    if (!ELEMENTS.has(name)) { err(`element <${name}> is not allowed`); continue; }
    if (closing) {
      if (selfClose || attrText.trim()) { err(`malformed closing tag </${name}>`); continue; }
      const top = stack.pop();
      if (top !== name) err(`</${name}> does not close <${top || ''}>`);
      continue;
    }
    if (stack.length === 0) {
      if (name !== 'svg' || roots > 0) err('figure must have exactly one root <svg>');
      roots += 1;
    }
    const attrs = parseAttrs(attrText, err, name);
    if (stack.length === 0 && name === 'svg') {
      rootOk = !!attrs.viewBox && /^\s*-?[\d.]+(?:[\s,]+-?[\d.]+){3}\s*$/.test(attrs.viewBox);
      if (!rootOk) err('root svg needs a viewBox of four numbers');
    }
    if (!selfClose) stack.push(name);
    else if (stack.length === 0 && name === 'svg') err('root svg cannot be self-closing');
  }
  if (stack.length) err(`unclosed <${stack[stack.length - 1]}>`);
  if (!svg.trim().startsWith('<svg')) err('figure must start with <svg');
  if (roots !== 1) err('figure must have exactly one root <svg>');
  return errs;
}

function parseAttrs(attrText, err, el) {
  const out = {};
  if (!attrText) return out;
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(attrText))) {
    const name = m[1];
    const value = m[2] !== undefined ? m[2] : m[3];
    if (!ATTRS.has(name)) { err(`<${el}> attribute ${name} is not allowed`); continue; }
    if (value === undefined) { err(`<${el}> attribute ${name} needs a value`); continue; }
    if (Object.prototype.hasOwnProperty.call(out, name)) { err(`<${el}> attribute ${name} given twice`); continue; }
    out[name] = value;
    if (name === 'xmlns') {
      if (value !== XMLNS) err('xmlns must be the SVG namespace');
      continue;
    }
    if (name === 'id') {
      if (!/^fig-[A-Za-z0-9_-]+$/.test(value)) err(`id ${value} must start with fig- (letters, digits, - or _)`);
      continue;
    }
    const rest = value.replace(URL_OK, '');   // the only url() form left is url(#fig-...), removed here
    if (/url\s*\(/i.test(rest)) err(`<${el}> ${name}: url() only as url(#fig-...)`);
    if (BAD_VALUE_CHARS.test(rest)) err(`<${el}> ${name} has a character not allowed in figure values`);
    if (value.length > 200) err(`<${el}> ${name} is longer than 200 characters`);
  }
  return out;
}

module.exports = { checkFigure, MAX_BYTES, ELEMENTS, ATTRS };
