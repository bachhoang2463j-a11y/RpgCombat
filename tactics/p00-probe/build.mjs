import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const here = (path) => new URL(path, import.meta.url);
const read = (path) => readFileSync(here(path), 'utf8').replaceAll('\r\n', '\n');
const modules = (path) => read(`node_modules/${path}`);
const phaserDist = modules('phaser/dist/phaser.esm.js');
const notices = [
  ['Phaser', modules('phaser/LICENSE.md')],
  ['ROT.js', modules('rot-js/license.txt')],
  ['EventEmitter3 (bundled by Phaser)', modules('eventemitter3/LICENSE')],
  ['Matter.js (bundled by Phaser)', modules('phaser/src/physics/matter-js/lib/license.js').split('\n')
    .slice(1, -2).map(line => line.replace(/^\s*\* ?/, '')).join('\n')],
  ['poly-decomp 0.3.0 (bundled by Phaser)', read('poly-decomp.LICENSE')],
  ['Matter.js source attributions', [
    ...modules('phaser/src/physics/matter-js/lib/core/Common.js').split('\n').filter(line => /Minko Gechev|github.com\/mgechev/.test(line)),
    ...modules('phaser/src/physics/matter-js/lib/geometry/Svg.js').split('\n').filter(line => /Gavin Kistner|phrogz.net/.test(line)),
    ...modules('phaser/src/physics/matter-js/lib/geometry/Vertices.js').split('\n').filter(line => /Paul Bourke/.test(line)),
  ].map(line => line.trim()).join('\n')],
  ...['Copyright (c) 2016, Mapbox', 'Copyright (c) 2017, Vladimir Agafonkin'].map(mark => {
    const index = phaserDist.indexOf(mark);
    assert.ok(index > 0, `Phaser upstream notice: ${mark}`);
    return [mark, phaserDist.slice(phaserDist.lastIndexOf('/*', index) + 2, phaserDist.indexOf('*/', index))
      .split('\n').map(line => line.replace(/^\s*\* ?/, '')).join('\n')];
  }),
];
const result = await build({
  absWorkingDir: import.meta.dirname,
  entryPoints: ['main.mjs'],
  outfile: 'inline.js',
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  bundle: true,
  minify: true,
  legalComments: 'none',
  supported: { 'template-literal': false },
  metafile: true,
  write: false,
});
const bundle = result.outputFiles[0].text;
assert.ok(!/<\/script/i.test(bundle), 'Bundle cannot close its HTML script element');
const inputs = Object.keys(result.metafile.inputs);
const candidates = ['phaser/dist/phaser.esm.js', 'rot-js/lib/path/astar.js', 'rot-js/lib/fov/precise-shadowcasting.js'];
for (const candidate of candidates) assert.ok(inputs.some(input => input.endsWith(candidate)), candidate);
assert.ok(Object.values(result.metafile.outputs).every(output => output.imports.length === 0));
const license = notices.map(([name, text]) => `${name}\n${text.replace(/[ \t]+$/gm, '').trim()}`).join('\n\n');
const html = read('probe.template.html')
  .replace('<!-- P00_LICENSES -->', () => `<!-- Third-party notices\n${license}\n  -->`)
  .replace('<!-- P00_BUNDLE -->', () => `<script>${bundle}</script>`);
assert.ok(!html.includes('```'), 'Only the floor wrapper may contain fences');
writeFileSync(here('probe.html'), html);
console.log(JSON.stringify({ artifact: 'probe.html', bytes: Buffer.byteLength(html),
  sha256: createHash('sha256').update(html).digest('hex'), bundled: candidates }));
