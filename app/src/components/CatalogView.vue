<script setup>
import { computed, ref, watch } from 'vue'
import { useRecommendation } from '../composables/useRecommendation'

const {
  dataSource,
  loading,
  error,
  components
} = useRecommendation()

const catalogCategory = ref('gpus')
const catalogBrand = ref('all')
const catalogCpuId = ref('all')
const catalogModelQuery = ref('')

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

const catalogItems = computed(() => components.value?.[catalogCategory.value] ?? [])
const cpuOptions = computed(() => components.value?.cpus ?? [])
const shouldShowBrandFilter = computed(() =>
  ['cpus', 'gpus', 'motherboards', 'memory'].includes(catalogCategory.value)
)
const shouldShowCpuFilter = computed(() => catalogCategory.value === 'motherboards')
const shouldShowModelFilter = computed(() => catalogCategory.value === 'motherboards')
const selectedCpuPlatform = computed(() => {
  if (catalogCpuId.value === 'all') return ''
  const match = cpuOptions.value.find((item) => item.id === catalogCpuId.value)
  return match?.platform || ''
})

const getBrandKey = (category, item) => {
  if (!item) return ''
  if (item.brand) return item.brand
  if (category === 'memory') return item.memoryType || ''
  return ''
}

const catalogBrandOptions = computed(() => {
  if (!shouldShowBrandFilter.value) return []
  const set = new Set(
    catalogItems.value.map((item) => getBrandKey(catalogCategory.value, item)).filter(Boolean)
  )
  return Array.from(set)
})

const filteredCatalogItems = computed(() => {
  let items = catalogItems.value
  if (shouldShowBrandFilter.value && catalogBrand.value !== 'all') {
    items = items.filter((item) => getBrandKey(catalogCategory.value, item) === catalogBrand.value)
  }
  if (shouldShowCpuFilter.value && selectedCpuPlatform.value) {
    items = items.filter((item) => item.platform === selectedCpuPlatform.value)
  }
  if (shouldShowModelFilter.value && catalogModelQuery.value.trim()) {
    const query = catalogModelQuery.value.trim().toLowerCase()
    items = items.filter((item) => {
      const name = String(item.name || '').toLowerCase()
      const id = String(item.id || '').toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }
  return items
})

watch(catalogCategory, () => {
  catalogBrand.value = 'all'
  catalogCpuId.value = 'all'
  catalogModelQuery.value = ''
})

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
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-[0.2em]">配件库</p>
      <div class="mt-4 flex flex-col gap-3">
        <h1 class="text-3xl font-semibold leading-tight">配置总览</h1>
        <p class="text-base leading-6">按分类与条件浏览全部配件配置。</p>
      </div>
      <div class="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm font-semibold">
        <div v-if="loading">正在加载配置库...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else>
          数据来源：{{ dataSource === 'api' ? '后端 API' : '本地 JSON' }}
        </div>
      </div>
    </header>

    <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">筛选</h2>
        <span class="text-xs font-semibold">只读</span>
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
          ，共 {{ filteredCatalogItems.length }} 项
        </div>
        <label v-if="shouldShowBrandFilter" class="flex flex-col gap-2 text-sm font-semibold">
          品牌
          <select v-model="catalogBrand" class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
            <option value="all">全部</option>
            <option v-for="brand in catalogBrandOptions" :key="brand" :value="brand">
              {{ brand }}
            </option>
          </select>
        </label>
        <label v-if="shouldShowCpuFilter" class="flex flex-col gap-2 text-sm font-semibold">
          CPU 型号
          <select v-model="catalogCpuId" class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
            <option value="all">全部</option>
            <option v-for="cpu in cpuOptions" :key="cpu.id" :value="cpu.id">
              {{ cpu.name }}
            </option>
          </select>
        </label>
        <label v-if="shouldShowModelFilter" class="flex flex-col gap-2 text-sm font-semibold">
          主板型号
          <input
            v-model="catalogModelQuery"
            type="text"
            placeholder="输入型号关键词"
            class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm"
          />
        </label>
      </div>
    </section>

    <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">配置列表</h2>
        <span class="text-xs font-semibold">{{ componentCategories.find(item => item.key === catalogCategory)?.label || '--' }}</span>
      </div>
      <div class="mt-4 grid gap-4">
        <div
          v-for="item in filteredCatalogItems"
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
          v-if="!filteredCatalogItems.length"
          class="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
        >
          暂无数据，请稍后重试。
        </div>
      </div>
    </section>
  </div>
</template>
