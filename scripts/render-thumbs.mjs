// Render gallery thumbs. Needs a running `npm run preview` and `puppeteer-core`.
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'public/models/thumbs')
const PAGE = 'http://127.0.0.1:4173/models'

const tiles = [
  { name: 'sample-triangle.gltf', file: 'sample-triangle.png' },
  { name: 'Meshy_AI_Bonefiend_1789096514_generate.3mf', file: 'bonefiend.png' },
  { name: 'Meshy_AI_Skeletal Dragon_1788888307_generate.3mf', file: 'skeletal-dragon.png' },
  { name: 'Meshy_AI_The Hollow Warden_1789250193_generate.3mf', file: 'hollow-warden.png' },
  { name: 'Meshy_AI_The_Hollow_Warden_0912215849_generate.3mf', file: 'hollow-warden-2.png' },
]

await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 2 })
await page.goto(PAGE, { waitUntil: 'networkidle0', timeout: 60_000 })
await page.waitForSelector('.mosaic-tile', { timeout: 30_000 })
await page.addStyleTag({
  content: `
    .viewer-wrap {
      width: 512px !important;
      height: 512px !important;
      position: relative;
    }
  `,
})

for (const tile of tiles) {
  await page.evaluate((name) => {
    const buttons = [...document.querySelectorAll('.mosaic-tile')]
    const match = buttons.find((btn) => btn.textContent.includes(name))
    if (!match) throw new Error(`No tile for ${name}`)
    match.click()
  }, tile.name)

  await page.waitForFunction(
    (name) => document.querySelector('.viewer-bar p')?.textContent?.includes(name),
    { timeout: 15_000 },
    tile.name,
  )
  if (/\.3mf$/i.test(tile.name)) {
    await page.waitForFunction(
      () => document.querySelector('.three-host')?.dataset.ready === '1',
      { timeout: 120_000 },
    )
  } else {
    await page.waitForFunction(
      () => document.querySelector('model-viewer')?.loaded,
      { timeout: 60_000 },
    )
  }
  await new Promise((resolve) => setTimeout(resolve, 500))
  const wrap = await page.$('.three-host, model-viewer')
  if (!wrap) throw new Error('Missing viewer')
  const dest = path.join(OUT, tile.file)
  await wrap.screenshot({ path: dest, type: 'png' })
  console.log('wrote', dest)
}

await browser.close()
