#!/usr/bin/env node
/**
 * Reproducible build for client/client.js — the artifact dsh loads through
 * `window.__ModuleLoader__`.
 *
 * The upstream repo builds this file with tsdown + a private tsdown.config.ts
 * that is NOT shipped in the npm tarball, so this checkout could not be rebuilt
 * at all (a hand-patched bundle was the only option). This script reproduces
 * the same contract with esbuild:
 *
 *   - one `window.__ModuleLoader__.load({ id, factory })` wrapper, single-line
 *     loader banner (hosts sniff the id from the file head);
 *   - react / react-dom / react/jsx-runtime stay EXTERNAL (the shell provides
 *     them to the factory as `require`);
 *   - every imported .css becomes an inlined <style data-plugin-css> module,
 *     exactly like the harness's `\0dsh-css:` virtual modules, so a plugin CSS
 *     file cannot leak a global class name into the app;
 *   - class names are scoped with a stable prefix, so the emitted CSS and the
 *     exported name map always agree.
 *
 * Usage: node scripts/build-client.mjs [--check]
 *   --check  build to a temp file and only report size/regions (no overwrite)
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = 'src/client/index.ts'
const OUT = 'client/client.js'
const PLUGIN_ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name
const SCOPE = 'tm_' // CSS class / keyframes prefix (stable across builds)

const BANNER = `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {
\tvar module = { exports: {} };
\tvar exports = module.exports;
\t"use strict";
\t// A single plugin must never be able to kill the whole boot: the shell treats
\t// "an entry did not activate" as fatal and exits. If this bundle fails to
\t// evaluate (e.g. a reload re-imports it while the previous graph is alive),
\t// degrade to an inert module and leave a trace instead of throwing.
\ttry {`
const FOOTER = `\t} catch (error) {
\t\tconsole.error('[dsh-talk-map] client bundle failed to evaluate (inert this boot):', error);
\t\treturn { name: ${JSON.stringify(PLUGIN_ID)}, apply() {} };
\t}
\treturn module.exports;
}
});
`

/**
 * CSS-modules scoping, done here instead of lightningcss so the build has no
 * native dependency: `:global(...)` is unwrapped verbatim, @keyframes names and
 * their animation references are prefixed, and every `.class` selector gets the
 * scope prefix.
 */
function scopeCss(source) {
  const names = new Set()
  let css = source.replace(/\/\*[\s\S]*?\*\//g, '')

  // :global(...) — keep its inner selector scoped exactly as written.
  const globals = []
  css = css.replace(/:global\(([^()]*)\)/g, (_match, inner) => {
    globals.push(inner.trim())
    return `\u0000G${globals.length - 1}\u0000`
  })

  // @keyframes names, then their animation/animation-name references.
  const frames = new Set()
  css = css.replace(/@keyframes\s+([A-Za-z_][\w-]*)/g, (_match, name) => {
    frames.add(name)
    return `@keyframes ${SCOPE}${name}`
  })
  if (frames.size > 0) {
    css = css.replace(/animation(?:-name)?\s*:[^;}]*/g, (decl) => {
      let out = decl
      for (const name of frames) {
        out = out.replace(new RegExp(`(^|[\\s,:])${name}(?=$|[\\s,;!])`, 'g'), `$1${SCOPE}${name}`)
      }
      return out
    })
  }

  // Class selectors. This stylesheet contains no url(), no content: strings and
  // no decimals in selectors, so `.name` outside :global() is always a class —
  // assert that instead of writing a full CSS parser.
  css = css.replace(/\.([A-Za-z_][\w-]*)/g, (match, name) => {
    if (match.startsWith('.0') || /^\d/.test(name)) return match
    names.add(name)
    return `.${SCOPE}${name}`
  })

  css = css.replace(/\u0000G(\d+)\u0000/g, (_match, index) => globals[Number(index)])

  const map = {}
  for (const name of [...names].sort()) map[name] = `${SCOPE}${name}`
  return { css: css.replace(/\s+/g, ' ').trim(), map }
}

function styleModule(source, tagId, isModule) {
  const { css, map } = isModule
    ? scopeCss(source)
    : { css: source.replace(/\s+/g, ' ').trim(), map: {} }
  return [
    `const __tagId = ${JSON.stringify(tagId)};`,
    `const __css = ${JSON.stringify(css)};`,
    `if (typeof document !== "undefined") {`,
    `\tconst __selector = "style[data-plugin-css=" + JSON.stringify(__tagId) + "]";`,
    `\tif (document.querySelector(__selector) === null) {`,
    `\t\tconst __tag = document.createElement("style");`,
    `\t\t__tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
    `\t\t__tag.dataset.pluginCss = __tagId;`,
    `\t\t__tag.textContent = __css;`,
    `\t\tdocument.head.appendChild(__tag);`,
    `\t}`,
    `}`,
    `export default ${JSON.stringify(map)};`,
  ].join('\n')
}

const cssPlugin = {
  name: 'dsh-css',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => {
      // Resolve by hand: build.resolve() would re-enter this same onResolve and
      // recurse until the heap dies.
      let file
      if (args.path.startsWith('.') || path.isAbsolute(args.path)) {
        file = path.resolve(args.resolveDir, args.path)
        if (!fs.existsSync(file)) return undefined
      } else {
        try {
          const require = createRequire(path.join(args.resolveDir, 'noop.js'))
          file = require.resolve(args.path)
        } catch {
          return { errors: [{ text: `cannot resolve stylesheet ${args.path}` }] }
        }
      }
      // Virtual, repo-relative path: esbuild prints it as the region comment,
      // and an absolute build path must never land in the artifact.
      const rel = path.relative(ROOT, file).replace(/\\/g, '/')
      return { path: `\0dsh-css:${rel.startsWith('..') ? path.basename(file) : rel}`, namespace: 'dsh-css', pluginData: { file } }
    })
    build.onLoad({ filter: /.*/, namespace: 'dsh-css' }, (args) => {
      const file = args.pluginData.file
      const source = fs.readFileSync(file, 'utf8')
      const isModule = file.endsWith('.module.css')
      const tagId = `${PLUGIN_ID}/${path.basename(file)}`
      return {
        contents: styleModule(source, tagId, isModule),
        loader: 'js',
        resolveDir: path.dirname(file),
        watchFiles: [file],
      }
    })
  },
}

const check = process.argv.includes('--check')
const outfile = check ? path.join(ROOT, 'client', '.client.check.js') : path.join(ROOT, OUT)

const result = await esbuild.build({
  absWorkingDir: ROOT,
  entryPoints: [ENTRY],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  jsxDev: false,
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  plugins: [cssPlugin],
  banner: { js: BANNER },
  footer: { js: FOOTER },
  metafile: true,
})

const bytes = fs.statSync(outfile).size
const text = fs.readFileSync(outfile, 'utf8')
const problems = []
if (!text.startsWith(`${BANNER}\n`)) problems.push('loader banner is not the first line')
if (!text.trimEnd().endsWith('});')) problems.push('file does not end with the loader call')
if (!text.includes('return module.exports;')) problems.push('factory does not return module.exports')
for (const bad of ["require(\"react/react", 'process.env', 'D:\\', 'file://']) {
  if (bad !== 'process.env' && text.includes(bad)) problems.push(`unexpected ${bad}`)
}
if (!text.includes(PLUGIN_ID)) problems.push('plugin id missing from bundle')

if (problems.length > 0) {
  console.error('build-client: ' + problems.join('; '))
  process.exit(1)
}

console.log(`build-client: ${path.relative(ROOT, outfile)} ${(bytes / 1024).toFixed(1)} kB`)
if (check) fs.rmSync(outfile, { force: true })
