import fs from 'node:fs'

const dataFiles = ['frontend/public/data/components.json', 'data/components.json']
const mapPath = 'scripts/image-map.json'

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))

const imageMap = readJson(mapPath)

const categories = Object.keys(imageMap)

for (const file of dataFiles) {
  const json = readJson(file)

  for (const category of categories) {
    const items = json[category]
    if (!Array.isArray(items)) continue

    const idToUrl = imageMap[category] ?? {}
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const nextUrl = idToUrl[item.id]
      if (!nextUrl) continue
      item.imageUrl = nextUrl
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8')
  console.log(`updated ${file}`)
}

