import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { computeRecommendation as computeRecommendationEngine } from '../domain/recommendation/engine'

export const useRecommendation = () => {
  const controller = new AbortController()
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
  const shareState = ref({
    id: '',
    status: '',
    error: '',
    source: ''
  })

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

  const computeRecommendation = () => {
    return computeRecommendationEngine({
      rules: rules.value,
      components: components.value,
      form: form.value,
      categoryLabels
    })
  }

  const toSelectionMap = (items) =>
    items.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {})

  const applySharedPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return
    if (payload.form && typeof payload.form === 'object') {
      form.value = {
        ...form.value,
        ...payload.form
      }
    }
    if (payload.result && typeof payload.result === 'object') {
      result.value = payload.result
    }
    if (payload.selectedItems && typeof payload.selectedItems === 'object') {
      selectedItems.value = payload.selectedItems
    } else if (Array.isArray(payload.items)) {
      selectedItems.value = toSelectionMap(payload.items)
    } else if (payload.result?.items) {
      selectedItems.value = toSelectionMap(payload.result.items)
    }
    submitted.value = true
  }

  const buildSharePayload = (title) => ({
    version: 1,
    title: title || '',
    form: { ...form.value },
    result: result.value,
    selectedItems: selectedItems.value,
    createdAt: new Date().toISOString()
  })

  const loadShare = async (shareId) => {
    if (!shareId) throw new Error('分享编号为空')
    if (shareId.startsWith('local-')) {
      try {
        const cached = localStorage.getItem(`pc_share_${shareId}`)
        if (!cached) throw new Error('本地分享不存在')
        return JSON.parse(cached)
      } catch (err) {
        throw new Error('本地分享读取失败')
      }
    }
    const response = await fetch(buildApiUrl(`/public/recommendations/${shareId}`))
    if (!response.ok) throw new Error('获取分享失败')
    const data = await response.json()
    return data.payload ?? data
  }

  const saveShare = async (title) => {
    shareState.value = { id: '', status: 'saving', error: '', source: '' }
    if (!result.value) {
      shareState.value = { id: '', status: 'error', error: '请先生成推荐结果', source: '' }
      return null
    }
    const payload = buildSharePayload(title)
    try {
      const response = await fetch(buildApiUrl('/public/recommendations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null, payload })
      })
      if (!response.ok) throw new Error('分享保存失败')
      const data = await response.json()
      const shareId = data.id
      shareState.value = { id: shareId, status: 'saved', error: '', source: 'api' }
      return shareId
    } catch (err) {
      const shareId = `local-${Date.now()}`
      try {
        localStorage.setItem(`pc_share_${shareId}`, JSON.stringify(payload))
        shareState.value = { id: shareId, status: 'saved', error: '后端不可用，已保存到本地', source: 'local' }
        return shareId
      } catch (storageErr) {
        shareState.value = { id: '', status: 'error', error: '本地存储失败，无法保存分享', source: 'local' }
        return null
      }
    }
  }

  const displayItems = computed(() => {
    const map = selectedItems.value
    return displayOrder
      .map((key) => ({ key, value: map[key] }))
      .filter((item) => item.value)
  })

  const isNoGpu = computed(() => selectedItems.value.gpu?.id === 'no-gpu')

  const totalMin = computed(() =>
    displayItems.value.reduce((sum, item) => sum + (item.value.priceRange?.min ?? 0), 0)
  )
  const totalMax = computed(() =>
    displayItems.value.reduce((sum, item) => sum + (item.value.priceRange?.max ?? 0), 0)
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

  const loadJson = async (path, signal) => {
    const response = await fetch(path, signal ? { signal } : {})
    if (!response.ok) throw new Error('数据加载失败')
    return response.json()
  }

  const loadFromLocal = async () => {
    const [rulesData, componentsData] = await Promise.all([
      loadJson('/data/rules.json', controller.signal),
      loadJson('/data/components.json', controller.signal)
    ])
    rules.value = rulesData
    components.value = componentsData
    dataSource.value = 'local'
  }

  const loadFromApi = async () => {
    const [rulesRes, componentsRes] = await Promise.all([
      loadJson(buildApiUrl('/public/configs/rules'), controller.signal),
      loadJson(buildApiUrl('/public/configs/components'), controller.signal)
    ])
    rules.value = rulesRes.payload ?? rulesRes
    components.value = componentsRes.payload ?? componentsRes
    dataSource.value = 'api'
  }

  const isAbortError = (err) => err?.name === 'AbortError'

  onMounted(async () => {
    let loaded = false
    try {
      await loadFromApi()
      loaded = true
    } catch (err) {
      if (isAbortError(err)) return
      try {
        await loadFromLocal()
        loaded = true
      } catch (fallbackErr) {
        if (isAbortError(fallbackErr)) return
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

  onBeforeUnmount(() => {
    controller.abort()
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
    updateSelection,
    applySharedPayload,
    saveShare,
    loadShare,
    shareState
  }
}
