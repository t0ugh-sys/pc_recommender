import { ref, computed, onMounted } from 'vue'

export const useRecommendation = () => {
  const rules = ref(null)
  const components = ref(null)
  const dataSource = ref('local')
  const loading = ref(true)
  const error = ref('')

  const form = ref({
    budgetId: '',
    scenarioId: '',
    modeId: '',
    gpuBrand: 'any',
    memoryType: 'auto',
    memorySticks: 'auto',
    diyMode: false
  })

  const result = ref(null)
  const selectedItems = ref({})
  const submitted = ref(false)

  const apiBase = computed(() => import.meta.env.VITE_API_BASE || '')

  const buildApiUrl = (path) => {
    const base = apiBase.value.replace(/\/+$/, '')
    return `${base}${path}`
  }

  const budgets = computed(() => rules.value?.budgets ?? [])
  const scenarios = computed(() => rules.value?.scenarios ?? [])
  const modes = computed(() => rules.value?.modes ?? [])

  const categoryLabels = {
    cpu: 'CPU',
    gpu: '显卡',
    motherboard: '主板',
    memory: '内存',
    storage: '存储',
    psu: '电源',
    case: '机箱',
    cooler: '散热'
  }

  const categoryIcons = {
    cpu: 'CPU',
    gpu: 'GPU',
    motherboard: 'MB',
    memory: 'RAM',
    storage: 'SSD',
    psu: 'PSU',
    case: 'CASE',
    cooler: 'COOL'
  }

  const displayOrder = ['cpu', 'gpu', 'motherboard', 'memory', 'storage', 'psu', 'cooler', 'case']

  const toMid = (range) => (range.min + range.max) / 2

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

  const calcPriceScore = (priceMid, target) => {
    if (!target) return 0
    const diffRatio = Math.abs(priceMid - target) / target
    return clamp(1 - diffRatio, 0, 1)
  }

  const getPowerValue = (item) => item.power ?? item.tdp ?? item.watt ?? 0

  const sortByScore = (items, target, mode) => {
    const priceWeight = mode.scoreBias?.price ?? 0.5
    const performanceWeight = mode.scoreBias?.performance ?? 0.5
    return items
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
    if (!items.length) return []
    const min = target * (1 - tolerance)
    const max = target * (1 + tolerance)
    const within = items.filter((item) => {
      const mid = toMid(item.priceRange)
      return mid >= min && mid <= max
    })
    return within.length ? within : items
  }

  const pickBest = (items, target, mode, tolerance) => {
    const filtered = pickWithinBudget(items, target, tolerance)
    const sorted = sortByScore(filtered, target, mode)
    return sorted.length ? sorted[0].item : null
  }

  const getTopWeights = (weights, count = 2) =>
    Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([key]) => categoryLabels[key] ?? key)

  const computeRecommendation = () => {
    if (!rules.value || !components.value) return null

    const budget = budgets.value.find((item) => item.id === form.value.budgetId)
    const scenario = scenarios.value.find((item) => item.id === form.value.scenarioId)
    const mode = modes.value.find((item) => item.id === form.value.modeId)
    if (!budget || !scenario || !mode) return null

    const totalMid = (budget.min + budget.max) / 2
    const tolerance = rules.value.selection?.budgetTolerance ?? rules.value.pricing?.rangeTolerance ?? 0.1

    const budgetTargets = Object.fromEntries(
      Object.entries(scenario.weights).map(([key, weight]) => [key, totalMid * weight])
    )

    const warnings = []

    const gpuBrand = form.value.gpuBrand

    const allowNoGpu = gpuBrand === 'none'
    const rawGpuCandidates = components.value.gpus
    const gpuCandidates = allowNoGpu
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
                  ? rules.value.selection?.minGpuVram?.ai?.nvidia ?? scenario.minVram
                  : rules.value.selection?.minGpuVram?.ai?.amd ?? scenario.minVram)
              : scenario.minVram ?? 0
            return (gpu.vram ?? 0) >= minVram
          })

    const gpu = pickBest(gpuCandidates, budgetTargets.gpu, mode, tolerance)
    if (!gpu) warnings.push('显卡候选不足，已无法满足当前预算或偏好。')
    if (gpu?.id === 'no-gpu' && (scenario.minScores?.gpu ?? 0) > 10) {
      warnings.push('当前场景需要独显，已按“无独显”偏好生成，性能可能不足。')
    }
    if (gpu?.id === 'no-gpu' && (scenario.minVram ?? 0) > 0) {
      warnings.push('当前场景有显存要求，已按“无独显”偏好生成，请注意负载能力。')
    }

    const memoryTypePreference = form.value.memoryType
    const cpuCandidates = components.value.cpus
      .filter((cpu) => (cpu.score ?? 0) >= (scenario.minScores?.cpu ?? 0))
      .filter((cpu) => {
        if (memoryTypePreference === 'auto') return true
        const types = String(cpu.memoryType ?? '').split('/').map((item) => item.trim())
        return types.includes(memoryTypePreference)
      })

    const cpu = pickBest(cpuCandidates, budgetTargets.cpu, mode, tolerance)
    if (!cpu) warnings.push('CPU 候选不足，已无法满足当前预算或偏好。')

    const motherboardCandidates = cpu
      ? components.value.motherboards.filter((board) => board.platform === cpu.platform)
      : components.value.motherboards
    const motherboardPool = memoryTypePreference === 'auto'
      ? motherboardCandidates
      : motherboardCandidates.filter((board) => board.memoryType === memoryTypePreference)

    const motherboard = pickBest(motherboardPool, budgetTargets.motherboard, mode, tolerance)
    if (!motherboard) warnings.push('主板候选不足，已无法满足当前预算或偏好。')

    const memoryCandidates = motherboard
      ? components.value.memory.filter((mem) => mem.memoryType === motherboard.memoryType)
      : components.value.memory
    const memoryPoolByType = memoryTypePreference === 'auto'
      ? memoryCandidates
      : memoryCandidates.filter((mem) => mem.memoryType === memoryTypePreference)

    const preferredMemorySize = ['dev', 'design', 'ai'].includes(scenario.id) ? 32 : 16
    const memoryPreferred = memoryPoolByType.filter((mem) => mem.size >= preferredMemorySize)
    const memoryPool = memoryPreferred.length ? memoryPreferred : memoryPoolByType
    const memory = pickBest(memoryPool, budgetTargets.memory, mode, tolerance)
    if (!memory) warnings.push('内存候选不足，已无法满足当前预算或偏好。')

    const memoryStickConfig = rules.value.selection?.memorySticks ?? {}
    const defaultSticks = memoryStickConfig.default ?? 2
    const ddr5Sticks = memoryStickConfig.ddr5 ?? defaultSticks
    const highCapacityThreshold = memoryStickConfig.highCapacityThreshold ?? 32
    const highCapacitySticks = memoryStickConfig.highCapacity ?? 4

    let memorySticks
    if (form.value.memorySticks === '2' || form.value.memorySticks === '4') {
      memorySticks = Number(form.value.memorySticks)
    } else if (memory?.memoryType === 'DDR5') {
      memorySticks = ddr5Sticks
    } else if ((memory?.size ?? 0) >= highCapacityThreshold) {
      memorySticks = highCapacitySticks
    } else {
      memorySticks = defaultSticks
    }

    const storageCandidates = components.value.storage
    const storagePreferred = (scenario.id === 'design' || scenario.id === 'ai') && totalMid >= 9000
      ? storageCandidates.filter((item) => item.size >= 2)
      : storageCandidates
    const storagePool = storagePreferred.length ? storagePreferred : storageCandidates
    const storage = pickBest(storagePool, budgetTargets.storage, mode, tolerance)
    if (!storage) warnings.push('存储候选不足，已无法满足当前预算或偏好。')

    const estimatedPowerValue = (cpu?.tdp ?? 0) + (gpu?.power ?? 0) + 120
    const psuMin = estimatedPowerValue * (rules.value.constraints?.psuHeadroom ?? 1.4)
    const psuCandidates = components.value.psu.filter((item) => item.watt >= psuMin)
    const psuPool = psuCandidates.length ? psuCandidates : components.value.psu
    const psu = pickBest(psuPool, budgetTargets.psu, mode, tolerance)
    if (!psu) warnings.push('电源候选不足，已无法满足当前预算或功耗。')

    const coolerMin = (cpu?.tdp ?? 0) * (rules.value.constraints?.coolerTdpRatio ?? 1.2)
    const coolerCandidates = components.value.coolers.filter((item) => item.tdpSupport >= coolerMin)
    const coolerPool = coolerCandidates.length ? coolerCandidates : components.value.coolers
    const cooler = pickBest(coolerPool, budgetTargets.cooler, mode, tolerance)
    if (!cooler) warnings.push('散热候选不足，已无法满足当前预算或功耗。')

    const caseCandidates = motherboard
      ? components.value.cases.filter((item) => item.formFactor === motherboard.formFactor)
      : components.value.cases
    const casePool = caseCandidates.length ? caseCandidates : components.value.cases
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

    const totalMinValue = items.reduce((sum, item) => sum + item.value.priceRange.min, 0)
    const totalMaxValue = items.reduce((sum, item) => sum + item.value.priceRange.max, 0)

    const reasons = []
    const topWeights = getTopWeights(scenario.weights)
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
        ? rules.value.selection?.minGpuVram?.ai?.nvidia ?? scenario.minVram
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
      warnings
    }
  }

  const toSelectionMap = (items) =>
    items.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {})

  const displayItems = computed(() => {
    const map = selectedItems.value
    return displayOrder
      .map((key) => ({ key, value: map[key] }))
      .filter((item) => item.value)
  })

  const isNoGpu = computed(() => selectedItems.value.gpu?.id === 'no-gpu')

  const totalMin = computed(() =>
    displayItems.value.reduce((sum, item) => sum + item.value.priceRange.min, 0)
  )
  const totalMax = computed(() =>
    displayItems.value.reduce((sum, item) => sum + item.value.priceRange.max, 0)
  )

  const estimatedPower = computed(() => {
    const cpu = selectedItems.value.cpu
    const gpu = selectedItems.value.gpu
    return Math.round((cpu?.tdp ?? 0) + (gpu?.power ?? 0) + 120)
  })

  const diyWarnings = computed(() => {
    if (!rules.value) return []
    const warnings = []
    const cpu = selectedItems.value.cpu
    const motherboard = selectedItems.value.motherboard
    const memory = selectedItems.value.memory
    const psu = selectedItems.value.psu
    const cooler = selectedItems.value.cooler
    const pcCase = selectedItems.value.case

    if (cpu && motherboard && cpu.platform !== motherboard.platform) {
      warnings.push('CPU 与主板平台不匹配。')
    }
    if (motherboard && memory && motherboard.memoryType !== memory.memoryType) {
      warnings.push('内存代际与主板不匹配。')
    }
    if (motherboard && pcCase && motherboard.formFactor !== pcCase.formFactor) {
      warnings.push('主板尺寸与机箱规格不匹配。')
    }
    if (psu) {
      const psuMin = estimatedPower.value * (rules.value.constraints?.psuHeadroom ?? 1.4)
      if (psu.watt < psuMin) {
        warnings.push('电源功率不足，建议提升档位。')
      }
    }
    if (cooler && cpu) {
      const coolerMin = cpu.tdp * (rules.value.constraints?.coolerTdpRatio ?? 1.2)
      if (cooler.tdpSupport < coolerMin) {
        warnings.push('散热规格偏低，建议升级散热。')
      }
    }
    return warnings
  })

  const getOptions = (key) => {
    if (!components.value) return []
    const cpu = selectedItems.value.cpu
    const motherboard = selectedItems.value.motherboard
    const powerNeed = estimatedPower.value * (rules.value?.constraints?.psuHeadroom ?? 1.4)
    const coolerNeed = (cpu?.tdp ?? 0) * (rules.value?.constraints?.coolerTdpRatio ?? 1.2)

    switch (key) {
      case 'motherboard': {
        if (!cpu) return components.value.motherboards
        const match = components.value.motherboards.filter((board) => board.platform === cpu.platform)
        return match.length ? match : components.value.motherboards
      }
      case 'memory': {
        if (!motherboard) return components.value.memory
        const match = components.value.memory.filter((mem) => mem.memoryType === motherboard.memoryType)
        return match.length ? match : components.value.memory
      }
      case 'case': {
        if (!motherboard) return components.value.cases
        const match = components.value.cases.filter((item) => item.formFactor === motherboard.formFactor)
        return match.length ? match : components.value.cases
      }
      case 'psu': {
        const match = components.value.psu.filter((item) => item.watt >= powerNeed)
        return match.length ? match : components.value.psu
      }
      case 'cooler': {
        const match = components.value.coolers.filter((item) => item.tdpSupport >= coolerNeed)
        return match.length ? match : components.value.coolers
      }
      default:
        return components.value[`${key}s`] ?? components.value[key] ?? []
    }
  }

  const diyGroups = [
    { title: '核心性能', keys: ['cpu', 'gpu'] },
    { title: '平台与内存', keys: ['motherboard', 'memory'] },
    { title: '存储与供电', keys: ['storage', 'psu'] },
    { title: '散热与机箱', keys: ['cooler', 'case'] }
  ]

  const diyDisplayGroups = computed(() =>
    diyGroups
      .map((group) => ({
        ...group,
        items: group.keys
          .map((key) => {
            const value = selectedItems.value[key]
            return value ? { key, value } : null
          })
          .filter(Boolean)
      }))
      .filter((group) => group.items.length)
  )

  const updateSelection = (key, id) => {
    const options = getOptions(key)
    const found = options.find((item) => item.id === id)
    if (found) {
      selectedItems.value = { ...selectedItems.value, [key]: found }
    }
  }

  const handleSubmit = () => {
    result.value = computeRecommendation()
    if (result.value) {
      selectedItems.value = toSelectionMap(result.value.items)
    }
    submitted.value = true
  }

  const loadJson = async (path) => {
    const response = await fetch(path)
    if (!response.ok) throw new Error('数据加载失败')
    return response.json()
  }

  const loadFromLocal = async () => {
    const [rulesData, componentsData] = await Promise.all([
      loadJson('/data/rules.json'),
      loadJson('/data/components.json')
    ])
    rules.value = rulesData
    components.value = componentsData
    dataSource.value = 'local'
  }

  const loadFromApi = async () => {
    const [rulesRes, componentsRes] = await Promise.all([
      loadJson(buildApiUrl('/configs/rules')),
      loadJson(buildApiUrl('/configs/components'))
    ])
    rules.value = rulesRes.payload ?? rulesRes
    components.value = componentsRes.payload ?? componentsRes
    dataSource.value = 'api'
  }

  onMounted(async () => {
    let loaded = false
    try {
      await loadFromApi()
      loaded = true
    } catch (err) {
      try {
        await loadFromLocal()
        loaded = true
      } catch (fallbackErr) {
        error.value = fallbackErr?.message ?? '数据加载失败'
      }
    }

    if (loaded) {
      try {
        form.value.budgetId = rules.value.budgets?.[0]?.id ?? ''
        form.value.scenarioId = rules.value.scenarios?.[0]?.id ?? ''
        form.value.modeId = rules.value.modes?.[0]?.id ?? ''
      } catch (err) {
        error.value = err?.message ?? '数据加载失败'
      }
    }
    loading.value = false
  })

  return {
    rules,
    components,
    dataSource,
    loading,
    error,
    form,
    result,
    selectedItems,
    submitted,
    budgets,
    scenarios,
    modes,
    categoryLabels,
    categoryIcons,
    displayItems,
    totalMin,
    totalMax,
    estimatedPower,
    isNoGpu,
    diyDisplayGroups,
    diyWarnings,
    handleSubmit,
    getOptions,
    updateSelection
  }
}
