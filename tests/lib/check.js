'use strict';
// Minimal check harness: prints one RESULT line per suite; exit 1 on any failure.
function suite(name) {
  let passed = 0, failed = 0;
  const fails = [];
  function check(label, cond, detail) {
    if (cond) passed += 1;
    else { failed += 1; fails.push(label + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); }
  }
  function eq(label, got, want) { check(label, JSON.stringify(got) === JSON.stringify(want), { got, want }); }
  function done() {
    fails.forEach((f) => console.error('FAIL ' + f));
    console.log(`RESULT ${name} passed=${passed} failed=${failed}`);
    process.exitCode = failed ? 1 : 0;
    return { passed, failed };
  }
  return { check, eq, done };
}
module.exports = { suite };
