import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { collectFiles, validateSource, validateWebAssets } from './check-web-assets.mjs'

const RELEASE_HASH_LENGTH = 12
const TEXT_FILE_PATTERN = /\.(?:css|js|html)$/i
const RELEASE_ASSETS_PATTERN = /\/releases\/[^/]+\/assets\//g

export function rewriteAssetPaths(source, releaseId) {
  const releaseAssetsUrl = `/releases/${releaseId}/assets/`
  return source
    .replaceAll('/assets/', releaseAssetsUrl)
    .replaceAll('"assets/', `"${releaseAssetsUrl}`)
    .replaceAll("'assets/", `'${releaseAssetsUrl}`)
}

export async function buildWebRelease({ webRoot = resolve('webdist'), releaseId } = {}) {
  const assetsRoot = resolve(webRoot, 'assets')
  const indexPath = resolve(webRoot, 'index.html')
  const index = (await readFile(indexPath, 'utf8')).replace(RELEASE_ASSETS_PATTERN, '/assets/')
  const files = await collectFiles(assetsRoot)
  await validateWebAssets(webRoot, files)
  await validateSource(webRoot, indexPath, index)

  const hash = createHash('sha256').update(index)
  for (const file of files) hash.update(relative(assetsRoot, file)).update('\0').update(await readFile(file)).update('\0')
  const id = releaseId ?? `r-${hash.digest('hex').slice(0, RELEASE_HASH_LENGTH)}`
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error('WEB_RELEASE_ID에는 영문, 숫자, 하이픈만 사용할 수 있습니다.')

  const releaseRoot = resolve(webRoot, 'releases', id)
  await mkdir(releaseRoot, { recursive: true })
  await cp(assetsRoot, resolve(releaseRoot, 'assets'), { recursive: true })
  const releaseFiles = await collectFiles(resolve(releaseRoot, 'assets'))
  for (const file of releaseFiles) {
    if (!TEXT_FILE_PATTERN.test(file)) continue
    const source = await readFile(file, 'utf8')
    const rewritten = rewriteAssetPaths(source, id)
    if (rewritten !== source) await writeFile(file, rewritten)
  }

  const html = rewriteAssetPaths(index, id)
  await validateWebAssets(webRoot, releaseFiles)
  await validateSource(webRoot, indexPath, html)
  await writeFile(indexPath, html)
  return id
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const releaseId = process.env.WEB_RELEASE_ID?.trim() || undefined
  const id = await buildWebRelease({ releaseId })
  console.log(`✅ 웹 릴리스 생성 완료: ${id}`)
}
