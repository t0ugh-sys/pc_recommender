<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from './PageHeader.vue'

const adminStatus = ref({
  last_status: '',
  last_run_at: '',
  last_message: ''
})
const adminConfigs = ref([])
const adminLog = ref('等待操作')
const adminLoading = ref(false)
const adminError = ref('')
const adminToken = ref('')
const editorKey = ref('rules')
const editorText = ref('')
const editorError = ref('')
const editorStatus = ref('')
const editorHighlightKey = ref('')
const editorIssues = ref([])
const rulesDraft = ref(null)
const rulesDraftStatus = ref('')
const rulesDraftError = ref('')
const defaultWeightKeys = ['cpu', 'gpu', 'motherboard', 'memory', 'storage', 'psu', 'cooler', 'case']
const rulesWeightKeys = computed(() => {
  if (rulesDraft.value?.scenarios?.length) {
    const set = new Set()
    rulesDraft.value.scenarios.forEach((scenario) => {
      Object.keys(scenario?.weights || {}).forEach((key) => set.add(key))
    })
    if (set.size) return Array.from(set)
  }
  return defaultWeightKeys
})

const apiBase = computed(() => import.meta.env.VITE_API_BASE || '')
const adminKeys = computed(() => {
  const keys = adminConfigs.value.map((item) => item.key)
  return keys.length ? keys : ['rules', 'components']
})
const catalogCategory = ref('gpus')
const componentCategories = [
  { key: 'cpus', label: 'CPU' },
  { key: 'gpus', label: '显卡' },
  { key: 'motherboards', label: '主板' },
  { key: 'memory', label: '内存' },
  { key: 'storage', label: '存储' },
  { key: 'psu', label: '电源' },
  { key: 'coolers', label: '散热' },
  { key: 'cases', label: '机箱' }
]
const componentsConfig = computed(() => {
  const target = adminConfigs.value.find((item) => item.key === 'components')
  return target?.payload ?? null
})
const catalogItems = computed(() => componentsConfig.value?.[catalogCategory.value] ?? [])

const formatPrice = (item) => {
  if (!item?.priceRange) return '--'
  return `￥${item.priceRange.min} - ￥${item.priceRange.max}`
}

const buildSpecs = (category, item) => {
  switch (category) {
    case 'cpus':
      return [
        item.brand && `品牌：${item.brand}`,
        item.platform && `平台：${item.platform}`,
        item.memoryType && `内存：${item.memoryType}`,
        typeof item.tdp === 'number' && `TDP：${item.tdp}W`,
        typeof item.score === 'number' && `评分：${item.score}`
      ].filter(Boolean)
    case 'gpus':
      return [
        item.brand && `品牌：${item.brand}`,
        typeof item.vram === 'number' && `显存：${item.vram}GB`,
        typeof item.power === 'number' && `功耗：${item.power}W`,
        typeof item.score === 'number' && `评分：${item.score}`
      ].filter(Boolean)
    case 'motherboards':
      return [
        item.chipset && `芯片组：${item.chipset}`,
        item.platform && `平台：${item.platform}`,
        item.memoryType && `内存：${item.memoryType}`,
        item.formFactor && `板型：${item.formFactor}`
      ].filter(Boolean)
    case 'memory':
      return [
        item.memoryType && `代际：${item.memoryType}`,
        typeof item.size === 'number' && `容量：${item.size}GB`,
        typeof item.score === 'number' && `评分：${item.score}`
      ].filter(Boolean)
    case 'storage':
      return [
        item.type && `类型：${item.type}`,
        typeof item.size === 'number' && `容量：${item.size}TB`,
        typeof item.score === 'number' && `评分：${item.score}`
      ].filter(Boolean)
    case 'psu':
      return [typeof item.watt === 'number' && `功率：${item.watt}W`].filter(Boolean)
    case 'coolers':
      return [typeof item.tdpSupport === 'number' && `散热：${item.tdpSupport}W`].filter(Boolean)
    case 'cases':
      return [item.formFactor && `板型：${item.formFactor}`].filter(Boolean)
    default:
      return []
  }
}

const buildApiUrl = (path) => {
  const base = apiBase.value.replace(/\/+$/, '')
  return `${base}${path}`
}

const buildAdminHeaders = () => {
  if (!adminToken.value) return {}
  return { 'X-Admin-Token': adminToken.value }
}

const loadAdminStatus = async () => {
  const response = await fetch(buildApiUrl('/sync/status'), { headers: buildAdminHeaders() })
  if (!response.ok) throw new Error('获取同步状态失败')
  adminStatus.value = await response.json()
}

const loadAdminConfigs = async () => {
  const response = await fetch(buildApiUrl('/configs'), { headers: buildAdminHeaders() })
  if (!response.ok) throw new Error('获取配置失败')
  adminConfigs.value = await response.json()
}

const runAdminSync = async () => {
  const response = await fetch(buildApiUrl('/sync/run'), {
    method: 'POST',
    headers: buildAdminHeaders()
  })
  if (!response.ok) throw new Error('同步触发失败')
  const data = await response.json()
  adminLog.value = `同步结果：${data.status || 'unknown'} ${data.message || ''}`.trim()
}

const loadConfigPayload = async (key) => {
  const response = await fetch(buildApiUrl(`/configs/${key}`), { headers: buildAdminHeaders() })
  if (!response.ok) throw new Error('获取配置详情失败')
  const data = await response.json()
  editorText.value = JSON.stringify(data.payload ?? data, null, 2)
}

const handleLoadConfig = async () => {
  editorError.value = ''
  editorStatus.value = ''
  editorIssues.value = []
  try {
    if (!adminToken.value) throw new Error('请先输入管理令牌')
    await loadConfigPayload(editorKey.value)
    editorStatus.value = '配置已加载'
    if (editorKey.value === 'rules') {
      loadRulesDraftFromEditor()
    }
  } catch (err) {
    editorError.value = err?.message ?? '加载配置失败'
    editorStatus.value = editorError.value
  }
}

const handleFormatConfig = () => {
  editorError.value = ''
  editorStatus.value = ''
  editorIssues.value = []
  try {
    const payload = JSON.parse(editorText.value || '{}')
    editorText.value = JSON.stringify(payload, null, 2)
    editorStatus.value = '已格式化'
  } catch (err) {
    editorError.value = 'JSON 格式错误，无法格式化'
    editorStatus.value = editorError.value
  }
}

const clonePayload = (payload) => JSON.parse(JSON.stringify(payload || {}))

const buildDefaultWeights = () => {
  const keys = rulesWeightKeys.value.length ? rulesWeightKeys.value : defaultWeightKeys
  const weight = Number((1 / keys.length).toFixed(4))
  return Object.fromEntries(keys.map((key) => [key, weight]))
}

const loadRulesDraftFromEditor = () => {
  rulesDraftError.value = ''
  rulesDraftStatus.value = ''
  if (editorKey.value !== 'rules') {
    rulesDraftError.value = '当前配置不是 rules'
    rulesDraftStatus.value = rulesDraftError.value
    return
  }
  try {
    const payload = JSON.parse(editorText.value || '{}')
    rulesDraft.value = clonePayload(payload)
    if (!Array.isArray(rulesDraft.value.budgets)) rulesDraft.value.budgets = []
    if (!Array.isArray(rulesDraft.value.scenarios)) rulesDraft.value.scenarios = []
    if (!Array.isArray(rulesDraft.value.modes)) rulesDraft.value.modes = []
    rulesDraft.value.scenarios = rulesDraft.value.scenarios.map((scenario) => ({
      ...scenario,
      weights: scenario?.weights && typeof scenario.weights === 'object' ? scenario.weights : buildDefaultWeights(),
      minScores: scenario?.minScores && typeof scenario.minScores === 'object'
        ? scenario.minScores
        : { cpu: 0, gpu: 0 }
    }))
    rulesDraftStatus.value = '规则草稿已加载'
  } catch (err) {
    rulesDraftError.value = 'JSON 格式错误，无法加载规则草稿'
    rulesDraftStatus.value = rulesDraftError.value
  }
}

const applyRulesDraftToEditor = () => {
  rulesDraftError.value = ''
  rulesDraftStatus.value = ''
  if (!rulesDraft.value) {
    rulesDraftError.value = '规则草稿为空'
    rulesDraftStatus.value = rulesDraftError.value
    return
  }
  editorText.value = JSON.stringify(rulesDraft.value, null, 2)
  rulesDraftStatus.value = '已应用到 JSON 编辑器'
}

const addBudget = () => {
  if (!rulesDraft.value) return
  rulesDraft.value.budgets.push({ id: '', label: '', min: 0, max: 0 })
}

const removeBudget = (index) => {
  if (!rulesDraft.value) return
  rulesDraft.value.budgets.splice(index, 1)
}

const addScenario = () => {
  if (!rulesDraft.value) return
  rulesDraft.value.scenarios.push({
    id: '',
    label: '',
    weights: buildDefaultWeights(),
    minScores: { cpu: 0, gpu: 0 },
    minVram: 0
  })
}

const removeScenario = (index) => {
  if (!rulesDraft.value) return
  rulesDraft.value.scenarios.splice(index, 1)
}

const addMode = () => {
  if (!rulesDraft.value) return
  rulesDraft.value.modes.push({
    id: '',
    label: '',
    scoreBias: { price: 0.5, performance: 0.5 },
    powerBias: 'balanced'
  })
}

const removeMode = (index) => {
  if (!rulesDraft.value) return
  rulesDraft.value.modes.splice(index, 1)
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const validateRulesPayload = (payload) => {
  const issues = []
  const budgets = payload?.budgets
  const scenarios = payload?.scenarios
  const modes = payload?.modes

  if (!Array.isArray(budgets)) {
    issues.push('rules.budgets 必须是数组')
  } else {
    budgets.forEach((item, index) => {
      if (!isNonEmptyString(item?.id)) issues.push(`rules.budgets[${index}].id 必填`)
      if (!isNonEmptyString(item?.label)) issues.push(`rules.budgets[${index}].label 必填`)
      if (!isNumber(item?.min)) issues.push(`rules.budgets[${index}].min 必须为数字`)
      if (!isNumber(item?.max)) issues.push(`rules.budgets[${index}].max 必须为数字`)
      if (isNumber(item?.min) && isNumber(item?.max) && item.min > item.max) {
        issues.push(`rules.budgets[${index}] min 不能大于 max`)
      }
    })
  }

  if (!Array.isArray(scenarios)) {
    issues.push('rules.scenarios 必须是数组')
  } else {
    scenarios.forEach((item, index) => {
      if (!isNonEmptyString(item?.id)) issues.push(`rules.scenarios[${index}].id 必填`)
      if (!isNonEmptyString(item?.label)) issues.push(`rules.scenarios[${index}].label 必填`)
      if (!item?.weights || typeof item.weights !== 'object') {
        issues.push(`rules.scenarios[${index}].weights 必须为对象`)
      } else {
        const weights = Object.values(item.weights)
        const invalid = weights.some((value) => !isNumber(value) || value <= 0)
        if (invalid) {
          issues.push(`rules.scenarios[${index}].weights 必须为正数`)
        }
        const sum = weights.reduce((total, value) => total + value, 0)
        if (weights.length && (sum < 0.95 || sum > 1.05)) {
          issues.push(`rules.scenarios[${index}].weights 合计需接近 1（当前 ${sum.toFixed(2)}）`)
        }
      }
    })
  }

  if (!Array.isArray(modes)) {
    issues.push('rules.modes 必须是数组')
  } else {
    modes.forEach((item, index) => {
      if (!isNonEmptyString(item?.id)) issues.push(`rules.modes[${index}].id 必填`)
      if (!isNonEmptyString(item?.label)) issues.push(`rules.modes[${index}].label 必填`)
      if (!item?.scoreBias || typeof item.scoreBias !== 'object') {
        issues.push(`rules.modes[${index}].scoreBias 必须为对象`)
      }
    })
  }

  return issues
}

const validateComponentsPayload = (payload) => {
  const issues = []
  const requiredGroups = [
    { key: 'cpus', fields: ['id', 'name', 'platform', 'tdp', 'score', 'priceRange'] },
    { key: 'gpus', fields: ['id', 'name', 'brand', 'vram', 'power', 'score', 'priceRange'] },
    { key: 'motherboards', fields: ['id', 'name', 'platform', 'memoryType', 'formFactor', 'priceRange'] },
    { key: 'memory', fields: ['id', 'name', 'memoryType', 'size', 'priceRange'] },
    { key: 'storage', fields: ['id', 'name', 'type', 'size', 'priceRange'] },
    { key: 'psu', fields: ['id', 'name', 'watt', 'priceRange'] },
    { key: 'coolers', fields: ['id', 'name', 'tdpSupport', 'priceRange'] },
    { key: 'cases', fields: ['id', 'name', 'formFactor', 'priceRange'] }
  ]

  requiredGroups.forEach(({ key, fields }) => {
    const list = payload?.[key]
    if (!Array.isArray(list)) {
      issues.push(`components.${key} 必须是数组`)
      return
    }
    list.forEach((item, index) => {
      fields.forEach((field) => {
        const value = item?.[field]
        if (field === 'priceRange') {
          if (!value || !isNumber(value.min) || !isNumber(value.max)) {
            issues.push(`components.${key}[${index}].priceRange.min/max 必须为数字`)
          } else if (value.min > value.max) {
            issues.push(`components.${key}[${index}].priceRange min 不能大于 max`)
          }
        } else if (field === 'tdp' || field === 'score' || field === 'vram' || field === 'power' || field === 'size' || field === 'watt' || field === 'tdpSupport') {
          if (!isNumber(value)) {
            issues.push(`components.${key}[${index}].${field} 必须为数字`)
          }
        } else if (!isNonEmptyString(value)) {
          issues.push(`components.${key}[${index}].${field} 必填`)
        }
      })
    })
  })

  return issues
}

const handleSaveConfig = async () => {
  editorError.value = ''
  editorStatus.value = ''
  editorHighlightKey.value = ''
  editorIssues.value = []
  if (!adminToken.value) {
    editorError.value = '请先输入管理令牌'
    editorStatus.value = editorError.value
    return
  }
  let payload
  try {
    payload = JSON.parse(editorText.value || '{}')
  } catch (err) {
    editorError.value = 'JSON 格式错误，无法保存'
    editorStatus.value = editorError.value
    return
  }
  if (editorKey.value === 'rules') {
    const requiredKeys = ['budgets', 'scenarios', 'modes']
    const missing = requiredKeys.filter((key) => !Array.isArray(payload?.[key]))
    if (missing.length) {
      editorError.value = `规则配置缺少必填数组：${missing.join(' / ')}`
      editorStatus.value = editorError.value
      return
    }
    const issues = validateRulesPayload(payload)
    if (issues.length) {
      editorIssues.value = issues
      editorError.value = '规则配置存在字段错误'
      editorStatus.value = editorError.value
      return
    }
  }
  if (editorKey.value === 'components') {
    const requiredKeys = ['cpus', 'gpus', 'motherboards', 'memory', 'storage', 'psu', 'coolers', 'cases']
    const missing = requiredKeys.filter((key) => !Array.isArray(payload?.[key]))
    if (missing.length) {
      editorError.value = `配件配置缺少必填数组：${missing.join(' / ')}`
      editorStatus.value = editorError.value
      return
    }
    const issues = validateComponentsPayload(payload)
    if (issues.length) {
      editorIssues.value = issues
      editorError.value = '配件配置存在字段错误'
      editorStatus.value = editorError.value
      return
    }
  }

  const response = await fetch(buildApiUrl(`/configs/${editorKey.value}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAdminHeaders()
    },
    body: JSON.stringify({ payload })
  })
  if (!response.ok) {
    editorError.value = '保存失败，请检查后端接口'
    editorStatus.value = editorError.value
    return
  }
  editorStatus.value = '保存成功'
  await loadAdminConfigs()
  editorHighlightKey.value = editorKey.value
}

const refreshAdmin = async () => {
  adminLoading.value = true
  adminError.value = ''
  try {
    if (!adminToken.value) throw new Error('请先输入管理令牌')
    await Promise.all([loadAdminStatus(), loadAdminConfigs()])
    if (adminLog.value === '等待操作') {
      adminLog.value = '管理端已就绪'
    }
  } catch (err) {
    adminError.value = err?.message ?? '管理端加载失败'
    adminLog.value = adminError.value
  } finally {
    adminLoading.value = false
  }
}

const handleAdminSync = async () => {
  adminLoading.value = true
  adminError.value = ''
  try {
    await runAdminSync()
    await loadAdminStatus()
  } catch (err) {
    adminError.value = err?.message ?? '同步执行失败'
    adminLog.value = adminError.value
  } finally {
    adminLoading.value = false
  }
}

onMounted(async () => {
  adminToken.value = localStorage.getItem('pc_admin_token') || ''
  await refreshAdmin()
  await handleLoadConfig()
})
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-8">
    <PageHeader
      eyebrow="管理"
      title="配置与同步"
      description="维护规则与配件库，必要时触发同步。"
    >
      <template #right>
        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <label class="flex flex-col gap-2 text-sm font-semibold">
            管理令牌
            <input
              v-model="adminToken"
              type="password"
              placeholder="输入 ADMIN_TOKEN"
              class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm"
              @change="localStorage.setItem('pc_admin_token', adminToken)"
            />
          </label>
          <p class="mt-2 text-xs leading-5 text-neutral-600">
            后端需要 <code class="font-mono">ADMIN_TOKEN</code>，本地会保存到浏览器。
          </p>
        </div>
      </template>
      <template #bottom>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p class="text-sm font-semibold">同步状态</p>
            <p class="mt-2 text-base leading-6">
              {{ adminStatus.last_status || 'unknown' }}
            </p>
          </div>
          <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p class="text-sm font-semibold">最近时间</p>
            <p class="mt-2 text-base leading-6">
              {{ adminStatus.last_run_at || '--' }}
            </p>
          </div>
          <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p class="text-sm font-semibold">配置数量</p>
            <p class="mt-2 text-base leading-6">
              {{ adminConfigs.length || 0 }} 份
            </p>
          </div>
        </div>
      </template>
    </PageHeader>

    <section class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div class="flex flex-col gap-6">
        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">操作中心</h2>
            <span class="text-xs font-semibold">同步</span>
          </div>
          <div class="mt-4 flex flex-col gap-4">
            <button
              class="h-12 w-full rounded-2xl bg-black text-sm font-semibold text-white"
              :disabled="adminLoading"
              @click="handleAdminSync"
            >
              立即同步
            </button>
            <button
              class="h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold"
              :disabled="adminLoading"
              @click="refreshAdmin"
            >
              刷新状态
            </button>
            <button
              class="h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold"
              :disabled="adminLoading"
              @click="loadAdminConfigs"
            >
              刷新配置
            </button>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">配置编辑</h2>
            <span class="text-xs font-semibold">/configs/{key}</span>
          </div>
          <div class="mt-4 grid gap-4">
            <label class="flex flex-col gap-2 text-sm font-semibold">
              选择配置
              <select v-model="editorKey" class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                <option v-for="key in adminKeys" :key="key" :value="key">
                  {{ key }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-2 text-sm font-semibold">
              JSON 内容
              <textarea
                v-model="editorText"
                rows="10"
                class="min-h-[240px] rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm leading-6"
              ></textarea>
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <button
                class="h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold"
                @click="handleLoadConfig"
              >
                重新加载
              </button>
              <button
                class="h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold"
                @click="handleFormatConfig"
              >
                格式化
              </button>
              <button
                class="h-12 w-full rounded-2xl bg-black text-sm font-semibold text-white"
                @click="handleSaveConfig"
              >
                保存配置
              </button>
            </div>
            <div v-if="editorStatus" class="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
              {{ editorStatus }}
            </div>
            <div v-if="editorError" class="rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm">
              {{ editorError }}
            </div>
            <div v-if="editorIssues.length" class="rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm">
              <p class="text-xs font-semibold">字段校验</p>
              <ul class="mt-2 flex flex-col gap-2">
                <li v-for="issue in editorIssues" :key="issue">{{ issue }}</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">规则可视化编辑</h2>
            <span class="text-xs font-semibold">rules.json</span>
          </div>
          <div class="mt-4 grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <button
                class="h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold"
                @click="loadRulesDraftFromEditor"
              >
                从 JSON 加载
              </button>
              <button
                class="h-12 w-full rounded-2xl bg-black text-sm font-semibold text-white"
                @click="applyRulesDraftToEditor"
              >
                应用到 JSON
              </button>
            </div>
            <div v-if="rulesDraftStatus" class="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
              {{ rulesDraftStatus }}
            </div>
            <div v-if="rulesDraftError" class="rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm">
              {{ rulesDraftError }}
            </div>
          </div>

          <div v-if="rulesDraft" class="mt-6 grid gap-6">
            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold">预算档位</p>
                <button class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold" @click="addBudget">
                  新增
                </button>
              </div>
              <div class="mt-4 grid gap-3">
                <div
                  v-for="(budget, index) in rulesDraft.budgets"
                  :key="`budget-${index}`"
                  class="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                >
                  <input v-model="budget.id" placeholder="id" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model="budget.label" placeholder="名称" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model.number="budget.min" type="number" placeholder="min" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model.number="budget.max" type="number" placeholder="max" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <button class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold" @click="removeBudget(index)">
                    删除
                  </button>
                </div>
                <div v-if="!rulesDraft.budgets.length" class="text-xs text-neutral-500">暂无预算档位</div>
              </div>
            </div>

            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold">使用场景</p>
                <button class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold" @click="addScenario">
                  新增
                </button>
              </div>
              <div class="mt-4 grid gap-4">
                <div
                  v-for="(scenario, index) in rulesDraft.scenarios"
                  :key="`scenario-${index}`"
                  class="rounded-2xl border border-neutral-200 bg-white p-4"
                >
                  <div class="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                    <input v-model="scenario.id" placeholder="id" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                    <input v-model="scenario.label" placeholder="名称" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                    <input v-model.number="scenario.minScores.cpu" type="number" placeholder="CPU 最低分" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                    <input v-model.number="scenario.minScores.gpu" type="number" placeholder="GPU 最低分" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                    <button class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold" @click="removeScenario(index)">
                      删除
                    </button>
                  </div>
                  <div class="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
                    <input v-model.number="scenario.minVram" type="number" placeholder="最低显存(GB)" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                    <div class="text-xs text-neutral-500">权重合计建议接近 1</div>
                  </div>
                  <div class="mt-3 grid gap-3 md:grid-cols-4">
                    <div v-for="key in rulesWeightKeys" :key="`weight-${scenario.id}-${key}`" class="flex items-center gap-2">
                      <span class="w-16 text-xs font-semibold">{{ key }}</span>
                      <input
                        v-model.number="scenario.weights[key]"
                        type="number"
                        step="0.01"
                        class="h-10 w-full rounded-2xl border border-neutral-300 px-3 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div v-if="!rulesDraft.scenarios.length" class="text-xs text-neutral-500">暂无场景</div>
              </div>
            </div>

            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold">模式偏好</p>
                <button class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold" @click="addMode">
                  新增
                </button>
              </div>
              <div class="mt-4 grid gap-4">
                <div
                  v-for="(mode, index) in rulesDraft.modes"
                  :key="`mode-${index}`"
                  class="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
                >
                  <input v-model="mode.id" placeholder="id" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model="mode.label" placeholder="名称" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model.number="mode.scoreBias.price" type="number" step="0.01" placeholder="价格权重" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model.number="mode.scoreBias.performance" type="number" step="0.01" placeholder="性能权重" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <input v-model="mode.powerBias" placeholder="powerBias" class="h-10 rounded-2xl border border-neutral-300 px-3 text-xs" />
                  <button class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold" @click="removeMode(index)">
                    删除
                  </button>
                </div>
                <div v-if="!rulesDraft.modes.length" class="text-xs text-neutral-500">暂无模式</div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">同步详情</h2>
            <span class="text-xs font-semibold">/sync/status</span>
          </div>
          <div class="mt-4 flex flex-col gap-3 text-sm leading-6">
            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p class="text-sm font-semibold">最新信息</p>
              <p class="mt-2 text-base leading-6">
                {{ adminStatus.last_message || '--' }}
              </p>
            </div>
            <div
              v-if="adminError"
              class="rounded-2xl border border-neutral-300 bg-neutral-50 p-4"
            >
              {{ adminError }}
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">接口提示</h2>
            <span class="text-xs font-semibold">API</span>
          </div>
          <p class="mt-3 text-sm leading-6">
            当前 API Base：<span class="font-semibold">{{ apiBase || '相对路径' }}</span>
          </p>
          <p class="mt-3 text-sm leading-6">
            如需切换后端地址，请在 `.env` 中设置 `VITE_API_BASE`。
          </p>
        </section>
      </div>

      <div class="flex flex-col gap-6">
        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">配置列表</h2>
            <span class="text-xs font-semibold">/configs</span>
          </div>
          <div class="mt-6 overflow-hidden rounded-2xl border border-neutral-200">
            <table class="w-full border-collapse text-sm">
              <thead class="bg-neutral-50">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">Key</th>
                  <th class="px-4 py-3 text-left font-semibold">更新时间</th>
                  <th class="px-4 py-3 text-left font-semibold">摘要</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in adminConfigs"
                  :key="item.key"
                  class="border-t border-neutral-200"
                  :class="editorHighlightKey === item.key ? 'bg-neutral-100' : ''"
                >
                  <td class="px-4 py-3">{{ item.key }}</td>
                  <td class="px-4 py-3">{{ item.updated_at || '--' }}</td>
                  <td class="px-4 py-3">
                    payload keys: {{ item.payload ? Object.keys(item.payload).length : 0 }}
                  </td>
                </tr>
                <tr v-if="!adminConfigs.length" class="border-t border-neutral-200">
                  <td class="px-4 py-3">--</td>
                  <td class="px-4 py-3">--</td>
                  <td class="px-4 py-3">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">配件库浏览</h2>
            <span class="text-xs font-semibold">components.json</span>
          </div>
          <div class="mt-4 grid gap-4">
            <label class="flex flex-col gap-2 text-sm font-semibold">
              分类
              <select v-model="catalogCategory" class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                <option v-for="category in componentCategories" :key="category.key" :value="category.key">
                  {{ category.label }}
                </option>
              </select>
            </label>
            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
              当前分类：{{ componentCategories.find(item => item.key === catalogCategory)?.label || '--' }}
              ，共 {{ catalogItems.length }} 项
            </div>
          </div>
          <div class="mt-4 grid gap-4">
            <div
              v-for="item in catalogItems"
              :key="item.id"
              class="rounded-2xl border border-neutral-200 bg-white px-4 py-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold">{{ item.name }}</p>
                  <p class="text-xs">{{ item.id }}</p>
                </div>
                <span class="text-sm font-semibold">{{ formatPrice(item) }}</span>
              </div>
              <div class="mt-3 text-xs leading-6">
                {{ buildSpecs(catalogCategory, item).join(' / ') || '暂无规格' }}
              </div>
              <div v-if="item.notes" class="mt-2 text-xs">{{ item.notes }}</div>
            </div>
            <div
              v-if="!catalogItems.length"
              class="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
            >
              暂无数据，请先加载配置。
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold leading-8">执行结果</h2>
            <span class="text-xs font-semibold">日志</span>
          </div>
          <div
            class="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6"
          >
            {{ adminLog }}
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
