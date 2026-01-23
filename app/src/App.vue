<script setup>
import { ref, computed, onMounted } from 'vue'

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
  diyMode: false
})

const result = ref(null)
const selectedItems = ref({})
const submitted = ref(false)

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

  const gpuCandidates = components.value.gpus
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

  const cpuCandidates = components.value.cpus
    .filter((cpu) => (cpu.score ?? 0) >= (scenario.minScores?.cpu ?? 0))

  const cpu = pickBest(cpuCandidates, budgetTargets.cpu, mode, tolerance)
  if (!cpu) warnings.push('CPU 候选不足，已无法满足当前预算或偏好。')

  const motherboardCandidates = cpu
    ? components.value.motherboards.filter((board) => board.platform === cpu.platform)
    : components.value.motherboards

  const motherboard = pickBest(motherboardCandidates, budgetTargets.motherboard, mode, tolerance)
  if (!motherboard) warnings.push('主板候选不足，已无法满足当前预算或偏好。')

  const memoryCandidates = motherboard
    ? components.value.memory.filter((mem) => mem.memoryType === motherboard.memoryType)
    : components.value.memory

  const preferredMemorySize = ['dev', 'design', 'ai'].includes(scenario.id) ? 32 : 16
  const memoryPreferred = memoryCandidates.filter((mem) => mem.size >= preferredMemorySize)
  const memoryPool = memoryPreferred.length ? memoryPreferred : memoryCandidates
  const memory = pickBest(memoryPool, budgetTargets.memory, mode, tolerance)
  if (!memory) warnings.push('内存候选不足，已无法满足当前预算或偏好。')

  const storageCandidates = components.value.storage
  const storagePreferred = (scenario.id === 'design' || scenario.id === 'ai') && totalMid >= 9000
    ? storageCandidates.filter((item) => item.size >= 2)
    : storageCandidates
  const storagePool = storagePreferred.length ? storagePreferred : storageCandidates
  const storage = pickBest(storagePool, budgetTargets.storage, mode, tolerance)
  if (!storage) warnings.push('存储候选不足，已无法满足当前预算或偏好。')

  const estimatedPower = (cpu?.tdp ?? 0) + (gpu?.power ?? 0) + 120
  const psuMin = estimatedPower * (rules.value.constraints?.psuHeadroom ?? 1.4)
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

  const totalMin = items.reduce((sum, item) => sum + item.value.priceRange.min, 0)
  const totalMax = items.reduce((sum, item) => sum + item.value.priceRange.max, 0)

  return {
    budget,
    scenario,
    mode,
    items,
    totalMin,
    totalMax,
    estimatedPower: Math.round(estimatedPower),
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
  const base = import.meta.env.VITE_API_BASE || ''
  const [rulesRes, componentsRes] = await Promise.all([
    loadJson(`${base}/configs/rules`),
    loadJson(`${base}/configs/components`)
  ])
  rules.value = rulesRes.payload ?? rulesRes
  components.value = componentsRes.payload ?? componentsRes
  dataSource.value = 'api'
}

onMounted(async () => {
  try {
    await loadFromApi()
  } catch (err) {
    try {
      await loadFromLocal()
    } catch (fallbackErr) {
      error.value = fallbackErr?.message ?? '数据加载失败'
    }
    return
  }

  try {
    form.value.budgetId = rules.value.budgets?.[0]?.id ?? ''
    form.value.scenarioId = rules.value.scenarios?.[0]?.id ?? ''
    form.value.modeId = rules.value.modes?.[0]?.id ?? ''
  } catch (err) {
    error.value = err?.message ?? '数据加载失败'
  }
  loading.value = false
})
</script>

<template>
  <div class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">PC 配置助手</p>
        <h1>电脑主机推荐配置系统</h1>
        <p class="subtitle">根据预算档位、场景与偏好模式推荐主机配置（全新）</p>
        <div class="hero-tags">
          <span>国内渠道</span>
          <span>区间价格</span>
          <span>多场景</span>
          <span>AMD / NVIDIA</span>
        </div>
      </div>
      <div class="hero-panel">
        <h3>推荐逻辑</h3>
        <ul>
          <li>预算拆分 + 场景权重</li>
          <li>兼容性校验 + 功耗估算</li>
          <li>性价比 / 性能 / 静音模式</li>
        </ul>
      </div>
    </header>

    <section class="card">
      <div class="card-title">
        <h2>需求输入</h2>
        <p>选择预算与场景后生成推荐配置</p>
      </div>
      <div v-if="loading" class="status">正在加载配置库...</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else class="status hint">数据来源：{{ dataSource === 'api' ? '后端 API' : '本地 JSON' }}</div>
      <form v-else class="form" @submit.prevent="handleSubmit">
        <label>
          预算档位
          <select v-model="form.budgetId" required>
            <option v-for="item in budgets" :key="item.id" :value="item.id">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          使用场景
          <select v-model="form.scenarioId" required>
            <option v-for="item in scenarios" :key="item.id" :value="item.id">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          偏好模式
          <select v-model="form.modeId" required>
            <option v-for="item in modes" :key="item.id" :value="item.id">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          显卡品牌
          <select v-model="form.gpuBrand" required>
            <option value="any">不限</option>
            <option value="AMD">AMD</option>
            <option value="NVIDIA">NVIDIA</option>
          </select>
        </label>
        <label class="toggle">
          DIY 模式
          <input type="checkbox" v-model="form.diyMode" />
          <span>允许手动调整部件</span>
        </label>
        <button type="submit">生成推荐</button>
      </form>
    </section>

    <section v-if="result" class="card">
      <div class="card-title">
        <h2>推荐结果</h2>
        <p>基于当前输入生成的主机配置方案</p>
      </div>
      <div class="summary">
        <div class="summary-item">
          <span>预算档位</span>
          <strong>{{ result.budget.label }}</strong>
        </div>
        <div class="summary-item">
          <span>场景</span>
          <strong>{{ result.scenario.label }}</strong>
        </div>
        <div class="summary-item">
          <span>模式</span>
          <strong>{{ result.mode.label }}</strong>
        </div>
        <div class="summary-item highlight">
          <span>整机价格区间</span>
          <strong>￥{{ totalMin.toLocaleString() }} - ￥{{ totalMax.toLocaleString() }}</strong>
        </div>
        <div class="summary-item">
          <span>预计功耗</span>
          <strong>{{ estimatedPower }}W</strong>
        </div>
      </div>

      <div v-if="form.diyMode" class="diy-panel">
        <h3>DIY 调整</h3>
        <p>你可以手动替换各部件，系统会重新计算价格区间与兼容性提示。</p>
        <div class="diy-grid">
          <label v-for="item in displayItems" :key="item.key">
            {{ categoryLabels[item.key] }}
            <select :value="item.value.id" @change="updateSelection(item.key, $event.target.value)">
              <option v-for="option in getOptions(item.key)" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div class="components-grid">
        <div v-for="item in displayItems" :key="item.key" class="component-card" :data-type="item.key">
          <div class="component-icon" :data-type="item.key">{{ categoryIcons[item.key] }}</div>
          <div class="component-body">
            <span class="component-label">{{ categoryLabels[item.key] }}</span>
            <strong class="component-name">{{ item.value.name }}</strong>
            <span class="component-price">￥{{ item.value.priceRange.min }} - ￥{{ item.value.priceRange.max }}</span>
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>部件</th>
              <th>推荐型号</th>
              <th>价格区间</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayItems" :key="item.key">
              <td>{{ categoryLabels[item.key] }}</td>
              <td>{{ item.value.name }}</td>
              <td>￥{{ item.value.priceRange.min }} - ￥{{ item.value.priceRange.max }}</td>
              <td>{{ item.value.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="result.warnings.length || diyWarnings.length" class="warnings">
        <strong>提示：</strong>
        <ul>
          <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
          <li v-for="warning in diyWarnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>
    </section>

    <section v-else-if="submitted" class="card empty">
      <h2>暂未生成结果</h2>
      <p>请调整预算与偏好条件后重新生成推荐。</p>
    </section>

    <section class="card">
      <div class="card-title">
        <h2>维护说明</h2>
        <p>配置库与规则可独立更新</p>
      </div>
      <ul class="list">
        <li>更新 `data/components.json` 可维护配件库与价格区间。</li>
        <li>更新 `data/rules.json` 可调整预算权重与选型规则。</li>
        <li>每次更新后请同步到 `app/public/data/` 目录。</li>
      </ul>
    </section>
  </div>
</template>
