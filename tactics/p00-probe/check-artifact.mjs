import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const html = read('probe.html');
const harness = read('../../integration-test/tactics-p00-harness.html');
const bundle = [...html.matchAll(/<script>([^]*?)<\/script>/g)];
const mock = [...harness.matchAll(/<script>([^]*?)<\/script>/g)];
assert.equal(bundle.length, 1);
assert.equal(mock.length, 1);
new Script(bundle[0][1], { filename: 'probe.html#script' });
new Script(mock[0][1], { filename: 'tactics-p00-harness.html#script' });
assert.ok(!/<script\b[^>]*\bsrc\s*=|<link\b[^>]*rel="stylesheet"|@import|<iframe\b/i.test(html.split('<script>')[0]));
assert.match(html, /default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:/);
for (const notice of ['Richard Davey', 'Ondrej Zara', 'Arnout Kazemier', 'Liam Brummitt', 'Stefan Hedman', 'Mapbox', 'Vladimir Agafonkin']) {
  assert.ok(html.split('<script>')[0].includes(notice), notice);
}
const fence = '```';
assert.equal(html.split(fence).length, 1);
const wrap = (text) => `${fence}html\n${text}\n${fence}`;
// The triple-backtick branch of the same-floor quote formatter.
const quote = (message) => message.replace(/```[^]*?```|("[^"\n]*")/g, (text, quoted) => quoted ? `<q>${text}</q>` : text);
const sibling = '<body><script>const name = "next component";</script></body>';
const message = `${wrap(html)}\n${wrap(sibling)}\n"outside code"`;
assert.equal(quote(message), `${wrap(html)}\n${wrap(sibling)}\n<q>"outside code"</q>`);
assert.match(quote(`${wrap(`${html}${fence}`)}\n${wrap(sibling)}`), /<q>"next component"<\/q>/);
console.log('T00-03 artifact: inline scripts parse, notices retained, same-floor fence positive and negative controls pass');
