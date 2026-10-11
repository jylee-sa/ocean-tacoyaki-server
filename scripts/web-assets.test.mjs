import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { buildWebRelease } from './build-web-release.mjs'
import { collectFiles, validateWebAssets } from './check-web-assets.mjs'

const webRoot = resolve('webdist')
const main = await readFile(join(webRoot, 'assets/index-DnAfYmnE.js'), 'utf8')
const room = await readFile(join(webRoot, 'assets/Room-c7de2ebc.js'), 'utf8')

function preload(source = main, existing = []) {
  const links = [...existing]
  const requested = []
  const events = []
  const start = source.indexOf('const uk="modulepreload"')
  const end = source.indexOf('const dk={}', start)
  assert.ok(start >= 0 && end > start)
  const context = vm.createContext({
    Event: class { constructor() { this.defaultPrevented = false } },
    window: { dispatchEvent: (event) => events.push(event) },
    document: {
      querySelector: (selector) => links.find((link) => selector.includes(`href="${link.href}"`)),
      createElement: () => {
        const handlers = new Map()
        return {
          sheet: null,
          addEventListener: (name, handler) => handlers.set(name, handler),
          removeEventListener: (name) => handlers.delete(name),
          emit(name) { if (name === 'load') this.sheet = {}; handlers.get(name)?.() },
          remove() { links.splice(links.indexOf(this), 1) }
        }
      },
      head: { appendChild: (link) => { links.push(link); requested.push(link) } }
    }
  })
  vm.runInContext(source.slice(start, end) + 'globalThis.preload=Ne', context)
  return { load: context.preload, links, requested, events }
}

test('existing current CSS allows the first renderer import to complete', async () => {
  const page = preload(main, [{ href: '/assets/index-b57adaf1.css', sheet: {} }])
  assert.equal(await page.load(async () => 'renderer', ['assets/index-b57adaf1.css']), 'renderer')
  assert.equal(page.requested.length, 0)
})

test('missing old CSS fails on every attempt instead of being silently skipped on reentry', async () => {
  const page = preload()
  let imports = 0
  for (let attempt = 0; attempt < 2; attempt++) {
    const loading = page.load(async () => { imports++ }, ['assets/index-qstU7SIg.css'])
    page.requested.at(-1).emit('error')
    await assert.rejects(loading, { code: 'WEB_ASSET_PRELOAD', assetUrl: '/assets/index-qstU7SIg.css' })
    assert.equal(page.links.length, 0)
  }
  assert.equal(page.requested.length, 2)
  assert.equal(imports, 0)
})

test('CSS can load successfully after a failed request is repaired', async () => {
  const page = preload()
  const failed = page.load(async () => 'renderer', ['assets/style.css'])
  page.requested[0].emit('error')
  await assert.rejects(failed)
  const retry = page.load(async () => 'renderer', ['assets/style.css'])
  page.requested[1].emit('load')
  assert.equal(await retry, 'renderer')
})

test('concurrent consumers both wait for the same CSS request', async () => {
  const page = preload()
  let imports = 0
  const load = () => page.load(async () => { imports++ }, ['assets/style.css'])
  const first = load()
  const second = load()
  await Promise.resolve()
  assert.equal(imports, 0)
  assert.equal(page.requested.length, 1)
  page.requested[0].emit('load')
  await Promise.all([first, second])
  assert.equal(imports, 2)
})

test('a stylesheet already loading is awaited before importing the renderer', async () => {
  const page = preload()
  const link = vm.runInNewContext('({})')
  let loaded
  Object.assign(link, { href: '/assets/style.css', sheet: null,
    addEventListener: (name, handler) => { if (name === 'load') loaded = handler },
    removeEventListener: () => {} })
  page.links.push(link)
  let imported = false
  const loading = page.load(async () => { imported = true }, ['assets/style.css'])
  await Promise.resolve()
  assert.equal(imported, false)
  loaded()
  await loading
  assert.equal(imported, true)
  assert.equal(page.requested.length, 0)
})

test('absolute release paths keep one leading slash', async () => {
  const page = preload()
  const loading = page.load(async () => 'renderer', ['/releases/r-test/assets/style.css'])
  assert.equal(page.requested[0].href, '/releases/r-test/assets/style.css')
  page.requested[0].emit('load')
  assert.equal(await loading, 'renderer')
})

test('map errors distinguish missing web assets from WebGL initialization failures', () => {
  const start = room.indexOf('_.textContent=b?.code===')
  const end = room.indexOf(',y.appendChild(_)', start)
  assert.ok(start >= 0 && end > start)
  const message = (error) => {
    const context = { b: error, _: {} }
    vm.runInNewContext(room.slice(start, end), context)
    return context._.textContent
  }
  assert.match(message(new Error('Unable to preload CSS for /assets/old.css')), /파일을 불러오지 못했습니다/)
  assert.match(message(new Error('WebGL context creation failed')), /WebGL/)
})

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'web-assets-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'index.html'), '<script type="module" src="/assets/main.js"></script><link href="/assets/style.css?v=1" rel="stylesheet">')
  await writeFile(join(root, 'assets/main.js'), 'import "./renderer.js";const deps=["assets/style.css"];const sound=new URL("sound.mp3",import.meta.url)')
  await writeFile(join(root, 'assets/renderer.js'), 'export const renderer=true')
  await writeFile(join(root, 'assets/style.css'), 'body{color:white}')
  await writeFile(join(root, 'assets/sound.mp3'), Buffer.from([1, 2, 3]))
  return root
}

test('release URLs change with content and remain stable when rebuilding identical files', async (t) => {
  const root = await fixture(t)
  const first = await buildWebRelease({ webRoot: root })
  assert.equal(await buildWebRelease({ webRoot: root }), first)
  await writeFile(join(root, 'assets/renderer.js'), 'export const renderer="updated"')
  const second = await buildWebRelease({ webRoot: root })
  assert.notEqual(second, first)
  assert.match(await readFile(join(root, 'index.html'), 'utf8'), new RegExp(`/releases/${second}/assets/main.js`))
  const generated = await readFile(join(root, 'releases', second, 'assets/main.js'), 'utf8')
  assert.match(generated, new RegExp(`/releases/${second}/assets/style.css`))
  await validateWebAssets(root, await collectFiles(join(root, 'releases', second, 'assets')))
})

test('missing CSS blocks release publication before changing the entry HTML', async (t) => {
  const root = await fixture(t)
  const before = await readFile(join(root, 'index.html'), 'utf8')
  await writeFile(join(root, 'assets/main.js'), 'const deps=["assets/index-qstU7SIg.css"]')
  await assert.rejects(buildWebRelease({ webRoot: root }), /index-qstU7SIg\.css/)
  assert.equal(await readFile(join(root, 'index.html'), 'utf8'), before)
})

test('missing imports and media are detected before deployment', async (t) => {
  const root = await fixture(t)
  await writeFile(join(root, 'assets/main.js'), 'import "./missing.js";new URL("missing.mp3",import.meta.url)')
  await assert.rejects(validateWebAssets(root), (error) => /missing\.js/.test(error.message) && /missing\.mp3/.test(error.message))
})

test('the actual web bundle builds with matching release dependencies and loads current CSS immediately', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'web-release-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await cp(join(webRoot, 'assets'), join(root, 'assets'), { recursive: true })
  await cp(join(webRoot, 'index.html'), join(root, 'index.html'))
  const id = await buildWebRelease({ webRoot: root })
  const releaseRoot = join(root, 'releases', id, 'assets')
  const generatedMain = await readFile(join(releaseRoot, 'index-DnAfYmnE.js'), 'utf8')
  const generatedPixi = await readFile(join(releaseRoot, 'index-IVxJCeZj.js'), 'utf8')
  const dependencies = JSON.parse('[' + generatedPixi.match(/m\.f=\[(.*?)\]/s)[1] + ']')
  const css = `/releases/${id}/assets/index-b57adaf1.css`
  const page = preload(generatedMain, [{ href: css, sheet: {} }])
  assert.equal(await page.load(async () => 'renderer', dependencies), 'renderer')
  assert.ok(!page.requested.some((link) => link.href.startsWith('//') || link.href.endsWith('.css')))
})

test('304 responses retain the current cache revalidation policy', async () => {
  const relay = await readFile(resolve('src/relay.ts'), 'utf8')
  const start = relay.indexOf("    if ((req.method === 'GET' || req.method === 'HEAD') && req.url) {")
  const end = relay.indexOf('        const stream = createReadStream(f.path)', start)
  assert.ok(start >= 0 && end > start)
  const source = '(function(){' + relay.slice(start, end) + '\n}}})()'
  let response
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    req: { method: 'GET', url: '/assets/main.js', headers: { 'if-none-match': 'current' } },
    resolveWebFile: () => ({ etag: 'current', type: 'text/javascript' }),
    res: { writeHead: (status, headers) => { response = { status, headers } }, end: () => {} }
  })
  assert.equal(response.status, 304)
  assert.equal(response.headers['cache-control'], 'no-cache')
})
