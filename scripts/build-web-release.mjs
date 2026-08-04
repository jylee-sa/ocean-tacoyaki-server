import { cp, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const webRoot = resolve('webdist')
const assetsRoot = resolve(webRoot, 'assets')
const releasesRoot = resolve(webRoot, 'releases')
const templatePath = resolve(webRoot, 'index.template.html')
const releaseId = (process.env.WEB_RELEASE_ID || `r-${Date.now().toString(36)}`).trim()

if (!/^[a-z0-9-]+$/i.test(releaseId)) throw new Error('WEB_RELEASE_ID에는 영문, 숫자, 하이픈만 사용할 수 있습니다.')

const releaseRoot = resolve(releasesRoot, releaseId)
const template = await readFile(templatePath, 'utf8')

await rm(releasesRoot, { recursive: true, force: true })
await mkdir(releaseRoot, { recursive: true })
await cp(assetsRoot, resolve(releaseRoot, 'assets'), { recursive: true })

const releaseAssetsRoot = resolve(releaseRoot, 'assets')
const releaseAssetsUrl = `/releases/${releaseId}/assets/`
for (const file of await readdir(releaseAssetsRoot)) {
  if (!/\.(?:css|js|html)$/i.test(file)) continue
  const path = resolve(releaseAssetsRoot, file)
  const source = await readFile(path, 'utf8')
  const rewritten = source
    .replaceAll('/assets/', releaseAssetsUrl)
    .replaceAll('"assets/', `"${releaseAssetsUrl}`)
    .replaceAll("'assets/", `'${releaseAssetsUrl}`)
  if (rewritten !== source) await writeFile(path, rewritten)
}

if (process.env.WEB_RELEASE_LINK_ASSETS === '1') {
  await rm(assetsRoot, { recursive: true, force: true })
  await symlink(`releases/${releaseId}/assets`, assetsRoot, 'dir')
}

const html = template.replaceAll('/assets/', releaseAssetsUrl)
await writeFile(resolve(webRoot, 'index.html'), html)

console.log(`웹 릴리스 생성 완료: ${releaseId}`)
