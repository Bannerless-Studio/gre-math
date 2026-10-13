#!/usr/bin/env node
/* Grades raw harness results with the page's own comparison (engine/answer.js checkCode), so the author tool and the
 * browser can never disagree on equality. stdin: JSON [{id, spec, result}]. stdout: JSON [{id, ok, attempt, parsed, line, error?, detail?}]. */
'use strict';
const A = require('../engine/answer.js');
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { buf += d; });
process.stdin.on('end', () => {
  const rows = JSON.parse(buf);
  const out = rows.map((r) => {
    const rep = A.checkCode(r.spec, r.result);
    return { id: r.id, ok: rep.ok, attempt: rep.attempt, parsed: rep.parsed, line: A.codeFailLine(r.spec, rep), error: rep.error, detail: rep.detail };
  });
  process.stdout.write(JSON.stringify(out));
});
