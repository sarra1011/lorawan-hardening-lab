// Logic tests: no dependencies. Extracts the pure logic block from index.html and checks it.
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\*LOGIC-START\*\/([\s\S]*?)\/\*LOGIC-END\*\//);
assert(m, 'LOGIC-START/LOGIC-END markers not found in index.html');
const L = new Function(m[1] + ';return {CONTROLS,ATTACKS,presetState,score,verdict,evalAll,genConfig,reportText};')();

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

t('22 controls, 12 attacks, unique ids', () => {
  assert.strictEqual(L.CONTROLS.length, 22);
  assert.strictEqual(L.ATTACKS.length, 12);
  assert.strictEqual(new Set(L.CONTROLS.map(c => c.id)).size, 22);
});
t('default install scores 0 and every attack succeeds', () => {
  const s = L.presetState('default');
  assert.strictEqual(L.score(s), 0);
  assert(L.evalAll(s).every(x => x.r.status === 'success'));
});
t('fully hardened scores 100 and every attack is blocked', () => {
  const s = L.presetState('hard');
  assert.strictEqual(L.score(s), 100);
  assert.strictEqual(L.verdict(100)[0], 'Hardened');
  assert(L.evalAll(s).every(x => x.r.status === 'blocked'));
});
t('hardened config has no INSECURE line, default has many', () => {
  const lines = (s) => Object.values(L.genConfig(s)).join('\n').split('\n').filter(l => /INSECURE/.test(l)).length;
  assert.strictEqual(lines(L.presetState('hard')), 0);
  assert(lines(L.presetState('default')) >= 10);
});
t('TLS-only preset still loses to credential, key and gateway attacks', () => {
  const r = Object.fromEntries(L.evalAll(L.presetState('tls')).map(x => [x.a.id, x.r.status]));
  assert.strictEqual(r.A1, 'blocked'); assert.strictEqual(r.A4, 'blocked'); assert.strictEqual(r.A7, 'blocked');
  ['A2', 'A3', 'A5', 'A6', 'A8', 'A9', 'A10', 'A11', 'A12'].forEach(id => assert.strictEqual(r[id], 'success', id));
});
t('applying the listed fix blocks each attack', () => {
  L.ATTACKS.forEach(a => {
    const s = L.presetState('default'); a.fix.forEach(i => (s[i] = true));
    assert.strictEqual(a.run(s).status, 'blocked', a.id);
  });
});
t('every control matters: switching one off from hardened never improves the score', () => {
  const hard = L.presetState('hard');
  L.CONTROLS.forEach(c => { const s = { ...hard, [c.id]: false }; assert(L.score(s) < 100, c.id); });
});
t('partial outcomes exist where expected', () => {
  const s = L.presetState('hard'); s['MQ-04'] = false; s['MQ-02'] = false;           // anonymous allowed, ACL still denies
  assert.strictEqual(L.ATTACKS.find(a => a.id === 'A2').run(s).status, 'partial');
  const s2 = L.presetState('hard'); s2['AS-05'] = false;
  assert.strictEqual(L.ATTACKS.find(a => a.id === 'A10').run(s2).status, 'partial');
});
t('report text lists all controls and attacks', () => {
  const r = L.reportText(L.presetState('hard'));
  assert(r.includes('Score: 100/100'));
  L.CONTROLS.forEach(c => assert(r.includes(c.id)));
});
console.log(`\n${n} logic tests passed`);
