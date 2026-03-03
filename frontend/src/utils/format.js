export const formatCurrency = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  return `￥${num.toLocaleString()}`
}

export const formatPriceRange = (priceRange) => {
  if (!priceRange) return '--'
  return `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`
}

export const formatMemoryKit = (totalSize, sticks) => {
  const total = Number(totalSize)
  const count = Number(sticks)
  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) return ''
  const per = total / count
  const perLabel = Number.isInteger(per) ? String(per) : per.toFixed(1)
  return `${perLabel}GB x${count}`
}

