import fs from 'node:fs'

const files = ['frontend/public/data/components.json', 'data/components.json']

// Use Wikimedia Commons "Special:FilePath" so the image URL stays stable even if
// the underlying file storage path changes. width keeps payload small for thumbnails.
const commonsThumb = (fileName, width = 256) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`

const categoryImageMap = {
  cpus: commonsThumb('Cpu_package_1.jpg'),
  gpus: commonsThumb('Graphics Card (25600081191).jpg'),
  motherboards: commonsThumb('Computer motherboard 12.jpg'),
  memory: commonsThumb('RAM Module (SDRAM-DDR4).jpg'),
  storage: commonsThumb('SSD-Samsung-EVO-860-250Gb.jpg'),
  psu: commonsThumb('Full modular ATX power supply unit.jpg'),
  coolers: commonsThumb('CPU fan and heatsink.jpg'),
  cases: commonsThumb('Case miditower.jpg')
}

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  // Some Windows editors may add UTF-8 BOM; strip it for JSON.parse.
  const json = JSON.parse(raw.replace(/^\uFEFF/, ''))

  for (const [category, imageUrl] of Object.entries(categoryImageMap)) {
    const items = json[category]
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      // Only overwrite our previous placeholder URLs; keep user-provided URLs.
      if (typeof item.imageUrl === 'string' && item.imageUrl.includes('placehold.co')) {
        item.imageUrl = imageUrl
        continue
      }
      if (!item.imageUrl) {
        item.imageUrl = imageUrl
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8')
  console.log(`updated ${file}`)
}
