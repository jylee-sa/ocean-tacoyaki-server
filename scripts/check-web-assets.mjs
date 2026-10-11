import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const TEXT_EXTENSIONS = new Set(['.js', '.css', '.html'])

export async function collectFiles(root) {
  const files = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(path))
    else if (entry.isFile()) files.push(path)
  }
  return files.sort()
}

export function localReferences(source, extension) {
  const references = new Set()
  const patterns = extension === '.html'
    ? [/\b(?:src|href)\s*=\s*["']([^"']+)["']/g]
    : extension === '.css'
      ? [/url\(\s*["']?([^\s"')]+)["']?\s*\)/g, /@import\s*["']([^"']+)["']/g]
      : [
          /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g,
          /\bnew\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g,
          /["']((?:\/?assets\/|\/releases\/)[^"']+)["']/g
        ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const reference = match[1].split(/[?#]/)[0]
      if (!reference || reference.endsWith('/') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) continue
      if (extension === '.js' && pattern === patterns[0] && !reference.startsWith('.') && !reference.startsWith('/')) continue
      references.add(reference)
    }
  }
  return [...references]
}

export async function validateSource(webRoot, file, source) {
  const missing = []
  for (const reference of localReferences(source, extname(file))) {
    const path = reference.startsWith('/')
      ? resolve(webRoot, '.' + reference)
      : reference.startsWith('assets/')
        ? resolve(webRoot, reference)
        : resolve(dirname(file), reference)
    const local = relative(webRoot, path)
    if (local.startsWith('..') || !(await stat(path).catch(() => null))?.isFile()) {
      missing.push(`${relative(webRoot, file)} → ${reference}`)
    }
  }
  if (missing.length) throw new Error(`웹 파일 참조가 누락되었습니다:\n${missing.join('\n')}`)
}

export async function validateWebAssets(webRoot = resolve('webdist'), files) {
  const candidates = files ?? [resolve(webRoot, 'index.html'), ...await collectFiles(resolve(webRoot, 'assets'))]
  for (const file of candidates) {
    if (TEXT_EXTENSIONS.has(extname(file))) await validateSource(webRoot, file, await readFile(file, 'utf8'))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await validateWebAssets()
  console.log('✅ 웹 파일 참조 검사 완료')
}
