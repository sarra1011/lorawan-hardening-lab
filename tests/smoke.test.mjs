// Browser smoke test: opens index.html, clicks through the UI, fails on any JavaScript error.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(here, '..', 'index.html')).href;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(url);
const txt = (sel) => page.locator(sel).innerText();
let n = 0; const ok = (m) => { n++; console.log('  ok  ' + m); };

assert.strictEqual(await txt('#score'), '0'); assert.strictEqual(await txt('#st-ctl'), '0/22'); ok('opens on the default install: 0/100');
await page.click('#sw-MQ-01'); assert.notStrictEqual(await txt('#score'), '0'); ok('one switch changes the score');
await page.click('#p-hard');
assert.strictEqual(await txt('#score'), '100'); assert.strictEqual(await txt('#st-atk'), '12/12'); assert.strictEqual(await txt('#verdict'), 'Hardened'); ok('Fully hardened: 100/100, 12/12 attacks stopped');
await page.click('#p-default');
await page.click('#run-A3'); await page.waitForFunction(() => document.querySelector('#term').innerText.includes('BREACH')); ok('A3 on the default install ends in BREACH');
await page.click('#term .apply'); await page.waitForFunction(() => document.querySelector('#term').innerText.includes('BLOCKED')); ok('"Apply the fix and re-run" ends in BLOCKED');
await page.click('#p-hard'); await page.click('#clear'); await page.click('#run-all');
await page.waitForFunction(() => document.querySelector('#term').innerText.includes('12 of 12 attacks stopped')); ok('Run all on the hardened stack: 12 of 12 stopped');
for (const tab of ['region_eu868.toml', 'mosquitto.conf', 'gateway-bridge.toml', 'chirpstack.toml']) { await page.click(`.tab[data-n="${tab}"]`); assert((await txt('#cfg')).length > 50); }
ok('all four configuration tabs render');
await page.click('#p-default'); assert((await txt('#cfg')).includes('INSECURE')); ok('default config shows INSECURE lines');
assert((await page.inputValue('#report')).includes('OWASP ISVS 4.6.2')); ok('report text is generated');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); assert(!overflow); ok('no horizontal page scroll at 1280px');
await page.setViewportSize({ width: 390, height: 800 });
assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1))); ok('no horizontal page scroll at 390px (phone)');

await browser.close();
assert.deepStrictEqual(errors, [], 'JavaScript errors: ' + errors.join(' | '));
console.log(`\n${n} smoke checks passed, 0 JavaScript errors`);
