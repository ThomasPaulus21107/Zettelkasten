import { build } from 'esbuild';

await build({
  entryPoints: [new URL('../src/graph-app.js', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: new URL('../public/graph-app.js', import.meta.url).pathname,
  sourcemap: true,
  target: ['safari17', 'chrome120']
});
