import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const outdir = new URL('./dist/', import.meta.url);
await mkdir(outdir, { recursive: true });

for (const renderer of ['sigma', 'cytoscape']) {
  await build({
    entryPoints: [new URL(`./src/${renderer}.js`, import.meta.url).pathname],
    bundle: true,
    format: 'esm',
    minify: true,
    outfile: new URL(`./dist/${renderer}.js`, import.meta.url).pathname,
    sourcemap: false,
    target: ['safari17', 'chrome120']
  });
  const template = await readFile(new URL('./spike.html', import.meta.url), 'utf8');
  await writeFile(new URL(`./dist/${renderer}.html`, import.meta.url), template
    .replaceAll('Graph-Renderer', renderer === 'sigma' ? 'Sigma.js' : 'Cytoscape.js')
    .replace('ENTRY', renderer));
}

await writeFile(new URL('./dist/styles.css', import.meta.url), await readFile(new URL('./styles.css', import.meta.url)));
