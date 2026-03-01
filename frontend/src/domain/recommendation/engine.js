const toMid = (range) => (range.min + range.max) / 2

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const hasValidPriceRange = (item) =>
  item?.priceRange &&
  Number.isFinite(item.priceRange.min) &&
  Number.isFinite(item.priceRange.max) &&
  item.priceRange.min <= item.priceRange.max

const calcPriceScore = (priceMid, target) => {
  if (!target) return 0
  const diffRatio = Math.abs(priceMid - target) / target
  return clamp(1 - diffRatio, 0, 1)
}

const getPowerValue = (item) => item.power ?? item.tdp ?? item.watt ?? 0

const sortByScore = (items, target, mode) => {
  const validItems = items.filter(hasValidPriceRange)
  if (!validItems.length) return []
  const priceWeight = mode.scoreBias?.price ?? 0.5
  const performanceWeight = mode.scoreBias?.performance ?? 0.5
  return validItems
    .map((item) => {
      const priceMid = toMid(item.priceRange)
      const priceScore = calcPriceScore(priceMid, target)
      const finalScore = (item.score ?? 0) * performanceWeight + priceScore * 100 * priceWeight
      return { item, finalScore, powerValue: getPowerValue(item) }
    })
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore
      if (mode.powerBias === 'low' && a.powerValue !== b.powerValue) {
        return a.powerValue - b.powerValue
      }
      return 0
    })
}

const pickWithinBudget = (items, target, tolerance) => {
  const validItems = items.filter(hasValidPriceRange)
  if (!validItems.length) return []
  const min = target * (1 - tolerance)
  const max = target * (1 + tolerance)
  const within = validItems.filter((item) => {
    const mid = toMid(item.priceRange)
    return mid >= min && mid <= max
  })
  return within.length ? within : validItems
}

const pickBest = (items, target, mode, tolerance) => {
  const filtered = pickWithinBudget(items, target, tolerance)
  const sorted = sortByScore(filtered, target, mode)
  return sorted.length ? sorted[0].item : null
}

const getTopWeights = (weights, categoryLabels, count = 2) =>
  Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => categoryLabels[key] ?? key)

export const computeRecommendation = ({ rules, components, form, categoryLabels }) => {
  if (!rules || !components) return null

  const budgets = rules.budgets ?? []
  const scenarios = rules.scenarios ?? []
  const modes = rules.modes ?? []

  const budget = budgets.find((item) => item.id === form.budgetId)
  const scenario = scenarios.find((item) => item.id === form.scenarioId)
  const mode = modes.find((item) => item.id === form.modeId)
  if (!budget || !scenario || !mode) return null

  const totalMid = (budget.min + budget.max) / 2
  const tolerance = rules.selection?.budgetTolerance ?? rules.pricing?.rangeTolerance ?? 0.1

  const budgetTargets = Object.fromEntries(
    Object.entries(scenario.weights).map(([key, weight]) => [key, totalMid * weight])
  )

  const warnings = []

  const gpuBrand = form.gpuBrand

  const allowNoGpu = gpuBrand === 'none'
  const rawGpuCandidates = components.gpus
  let gpuCandidates = allowNoGpu
    ? rawGpuCandidates.filter((gpu) => gpu.id === 'no-gpu' || gpu.brand === 'Integrated')
    : rawGpuCandidates
        .filter((gpu) => (gpuBrand === 'any' ? true : gpu.brand === gpuBrand))
        .filter((gpu) => {
          const minScore = scenario.minScores?.gpu ?? 0
          return (gpu.score ?? 0) >= minScore
        })
        .filter((gpu) => {
          const minVram = scenario.id === 'ai'
            ? (gpu.brand === 'NVIDIA'
                ? rules.selection?.minGpuVram?.ai?.nvidia ?? scenario.minVram
                : rules.selection?.minGpuVram?.ai?.amd ?? scenario.minVram)
            : scenario.minVram ?? 0
          return (gpu.vram ?? 0) >= minVram
        })

  const gpuBrandRelaxed = !allowNoGpu && (gpuBrand === 'AMD' || gpuBrand === 'NVIDIA') && !gpuCandidates.length
  if (gpuBrandRelaxed) {
    gpuCandidates = rawGpuCandidates
      .filter((gpu) => {
        const minScore = scenario.minScores?.gpu ?? 0
        return (gpu.score ?? 0) >= minScore
      })
      .filter((gpu) => {
        const minVram = scenario.id === 'ai'
          ? (gpu.brand === 'NVIDIA'
              ? rules.selection?.minGpuVram?.ai?.nvidia ?? scenario.minVram
              : rules.selection?.minGpuVram?.ai?.amd ?? scenario.minVram)
          : scenario.minVram ?? 0
        return (gpu.vram ?? 0) >= minVram
      })
  }

  const gpu = pickBest(gpuCandidates, budgetTargets.gpu, mode, tolerance)
  if (!gpu) warnings.push('显卡候选不足，已无法满足当前预算或偏好。')
  if (gpuBrandRelaxed) warnings.push('显卡品牌候选不足，已放宽品牌限制。')
  if (gpu?.id === 'no-gpu' && (scenario.minScores?.gpu ?? 0) > 10) {
    warnings.push('当前场景需要独显，已按“无独显”偏好生成，性能可能不足。')
  }
  if (gpu?.id === 'no-gpu' && (scenario.minVram ?? 0) > 0) {
    warnings.push('当前场景有显存要求，已按“无独显”偏好生成，请注意负载能力。')
  }

  const memoryTypePreference = form.memoryType
  let cpuCandidates = components.cpus
    .filter((cpu) => (cpu.score ?? 0) >= (scenario.minScores?.cpu ?? 0))
    .filter((cpu) => {
      if (memoryTypePreference === 'auto') return true
      const types = String(cpu.memoryType ?? '').split('/').map((item) => item.trim())
      return types.includes(memoryTypePreference)
    })
  if (memoryTypePreference !== 'auto' && !cpuCandidates.length) {
    warnings.push('CPU 候选不足，已放宽内存代际筛选。')
    cpuCandidates = components.cpus.filter((cpu) => (cpu.score ?? 0) >= (scenario.minScores?.cpu ?? 0))
  }

  const cpu = pickBest(cpuCandidates, budgetTargets.cpu, mode, tolerance)
  if (!cpu) warnings.push('CPU 候选不足，已无法满足当前预算或偏好。')

  const motherboardCandidates = cpu
    ? components.motherboards.filter((board) => board.platform === cpu.platform)
    : components.motherboards
  let motherboardPool = memoryTypePreference === 'auto'
    ? motherboardCandidates
    : motherboardCandidates.filter((board) => board.memoryType === memoryTypePreference)
  if (memoryTypePreference !== 'auto' && !motherboardPool.length) {
    warnings.push('主板内存代际候选不足，已放宽代际限制。')
    motherboardPool = motherboardCandidates
  }

  const motherboard = pickBest(motherboardPool, budgetTargets.motherboard, mode, tolerance)
  if (!motherboard) warnings.push('主板候选不足，已无法满足当前预算或偏好。')

  const memoryCandidates = motherboard
    ? components.memory.filter((mem) => mem.memoryType === motherboard.memoryType)
    : components.memory
  let memoryPoolByType = memoryTypePreference === 'auto'
    ? memoryCandidates
    : memoryCandidates.filter((mem) => mem.memoryType === memoryTypePreference)
  if (memoryTypePreference !== 'auto' && !memoryPoolByType.length) {
    warnings.push('内存代际候选不足，已放宽代际限制。')
    memoryPoolByType = memoryCandidates
  }

  const preferredMemorySize = ['dev', 'design', 'ai'].includes(scenario.id) ? 32 : 16
  const memoryPreferred = memoryPoolByType.filter((mem) => mem.size >= preferredMemorySize)
  const memoryPool = memoryPreferred.length ? memoryPreferred : memoryPoolByType
  const memory = pickBest(memoryPool, budgetTargets.memory, mode, tolerance)
  if (!memory) warnings.push('内存候选不足，已无法满足当前预算或偏好。')

  const memoryStickConfig = rules.selection?.memorySticks ?? {}
  const defaultSticks = memoryStickConfig.default ?? 2
  const ddr5Sticks = memoryStickConfig.ddr5 ?? defaultSticks
  const highCapacityThreshold = memoryStickConfig.highCapacityThreshold ?? 48
  const highCapacitySticks = memoryStickConfig.highCapacity ?? defaultSticks

  let memorySticks = defaultSticks
  if (form.memorySticks !== 'auto') {
    memorySticks = Number(form.memorySticks)
  } else if (memory?.memoryType === 'DDR5') {
    memorySticks = ddr5Sticks
  } else if ((memory?.size ?? 0) >= highCapacityThreshold) {
    memorySticks = highCapacitySticks
  }

  const storageCandidates = components.storage
  const storagePreferred = (scenario.id === 'design' || scenario.id === 'ai') && totalMid >= 9000
    ? storageCandidates.filter((item) => item.size >= 2)
    : storageCandidates
  const storagePool = storagePreferred.length ? storagePreferred : storageCandidates
  const storage = pickBest(storagePool, budgetTargets.storage, mode, tolerance)
  if (!storage) warnings.push('存储候选不足，已无法满足当前预算或偏好。')

  const estimatedPowerValue = (cpu?.tdp ?? 0) + (gpu?.power ?? 0) + 120
  const psuMin = estimatedPowerValue * (rules.constraints?.psuHeadroom ?? 1.4)
  const psuCandidates = components.psu.filter((item) => item.watt >= psuMin)
  const psuPool = psuCandidates.length ? psuCandidates : components.psu
  const psu = pickBest(psuPool, budgetTargets.psu, mode, tolerance)
  if (!psu) warnings.push('电源候选不足，已无法满足当前预算或功耗。')

  const coolerMin = (cpu?.tdp ?? 0) * (rules.constraints?.coolerTdpRatio ?? 1.2)
  const coolerCandidates = components.coolers.filter((item) => item.tdpSupport >= coolerMin)
  const coolerPool = coolerCandidates.length ? coolerCandidates : components.coolers
  const cooler = pickBest(coolerPool, budgetTargets.cooler, mode, tolerance)
  if (!cooler) warnings.push('散热候选不足，已无法满足当前预算或功耗。')

  let caseCandidates = motherboard
    ? components.cases.filter((item) => item.formFactor === motherboard.formFactor)
    : components.cases
  if (motherboard && !caseCandidates.length) {
    warnings.push('机箱板型候选不足，已放宽板型限制。')
    caseCandidates = components.cases
  }
  const casePool = caseCandidates.length ? caseCandidates : components.cases
  const pcCase = pickBest(casePool, budgetTargets.case, mode, tolerance)
  if (!pcCase) warnings.push('机箱候选不足，已无法满足当前预算或偏好。')

  const items = [
    { key: 'cpu', value: cpu },
    { key: 'gpu', value: gpu },
    { key: 'motherboard', value: motherboard },
    { key: 'memory', value: memory },
    { key: 'storage', value: storage },
    { key: 'psu', value: psu },
    { key: 'cooler', value: cooler },
    { key: 'case', value: pcCase }
  ].filter((item) => item.value)

  const totalMinValue = items.reduce((sum, item) => sum + (item.value.priceRange?.min ?? 0), 0)
  const totalMaxValue = items.reduce((sum, item) => sum + (item.value.priceRange?.max ?? 0), 0)

  const buildAlternatives = (pool, selectedId, target, limit = 3) => {
    if (!pool?.length) return []
    const filtered = pickWithinBudget(pool, target, tolerance)
    const sorted = sortByScore(filtered, target, mode)
    return sorted
      .map((entry) => entry.item)
      .filter((item) => item?.id && item.id !== selectedId)
      .slice(0, limit)
  }

  const alternatives = {
    cpu: buildAlternatives(cpuCandidates, cpu?.id, budgetTargets.cpu),
    gpu: buildAlternatives(gpuCandidates, gpu?.id, budgetTargets.gpu),
    motherboard: buildAlternatives(motherboardPool, motherboard?.id, budgetTargets.motherboard),
    memory: buildAlternatives(memoryPool, memory?.id, budgetTargets.memory),
    storage: buildAlternatives(storagePool, storage?.id, budgetTargets.storage),
    psu: buildAlternatives(psuPool, psu?.id, budgetTargets.psu),
    cooler: buildAlternatives(coolerPool, cooler?.id, budgetTargets.cooler),
    case: buildAlternatives(casePool, pcCase?.id, budgetTargets.case)
  }

  const reasons = []
  const topWeights = getTopWeights(scenario.weights, categoryLabels)
  if (topWeights.length) {
    reasons.push(`场景权重优先投入：${topWeights.join(' / ')}`)
  }

  const priceWeight = mode.scoreBias?.price ?? 0.5
  const performanceWeight = mode.scoreBias?.performance ?? 0.5
  if (priceWeight > performanceWeight) {
    reasons.push('当前模式更注重性价比')
  } else if (performanceWeight > priceWeight) {
    reasons.push('当前模式更注重性能')
  } else {
    reasons.push('当前模式在价格与性能之间保持均衡')
  }

  if (mode.powerBias === 'low') {
    reasons.push('优先控制功耗与散热负担')
  }

  if (gpuBrand === 'AMD' || gpuBrand === 'NVIDIA') {
    reasons.push(`显卡品牌偏好：${gpuBrand}`)
  }

  if (memoryTypePreference === 'DDR4' || memoryTypePreference === 'DDR5') {
    reasons.push(`内存代际偏好：${memoryTypePreference}`)
  }

  if (gpu?.id === 'no-gpu') {
    reasons.push('选择无独显以降低成本与功耗')
  } else {
    const minVram = scenario.id === 'ai'
      ? rules.selection?.minGpuVram?.ai?.nvidia ?? scenario.minVram
      : scenario.minVram ?? 0
    if (minVram > 0) {
      reasons.push(`场景显存要求：≥${minVram}GB`)
    }
  }

  if (memory?.size >= preferredMemorySize && preferredMemorySize >= 32) {
    reasons.push(`内存优先 ${preferredMemorySize}GB 以满足多任务需求`)
  }
  if (memorySticks) {
    reasons.push(`内存条数：${memorySticks} 根`)
  }
  if (memorySticks === 4 && memory?.memoryType === 'DDR5') {
    warnings.push('DDR5 四根可能降低稳定性，建议优先双条。')
  }

  if (storage?.size >= 2 && (scenario.id === 'design' || scenario.id === 'ai') && totalMid >= 9000) {
    reasons.push('存储倾向 2TB，方便素材与项目存放')
  }

  const risks = []
  if (totalMaxValue > budget.max) {
    risks.push(`价格上沿可能超过预算上限（￥${budget.max}）`)
  }
  if (totalMinValue < budget.min) {
    risks.push(`价格下沿低于预算下限（￥${budget.min}）`)
  }

  return {
    budget,
    scenario,
    mode,
    items,
    memorySticks,
    totalMin: totalMinValue,
    totalMax: totalMaxValue,
    estimatedPower: Math.round(estimatedPowerValue),
    reasons,
    risks,
    warnings,
    alternatives
  }
}

