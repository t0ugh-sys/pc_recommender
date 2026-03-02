import fs from 'node:fs'

const files = ['frontend/public/data/components.json', 'data/components.json']

const categoryLabelMap = {
  cpus: 'CPU',
  gpus: 'GPU',
  motherboards: 'MB',
  memory: 'RAM',
  storage: 'SSD',
  psu: 'PSU',
  coolers: 'COOL',
  cases: 'CASE'
}

const buildPlaceholderUrl = (label) =>
  `https://placehold.co/88x88/png?text=${encodeURIComponent(label)}&bg=DBEFFF&fc=2570D9`

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  // Some Windows editors may add UTF-8 BOM; strip it for JSON.parse.
  const json = JSON.parse(raw.replace(/^\uFEFF/, ''))

  for (const [category, label] of Object.entries(categoryLabelMap)) {
    const items = json[category]
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      if (item.imageUrl) continue
      item.imageUrl = buildPlaceholderUrl(label)
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8')
  console.log(`updated ${file}`)
}
