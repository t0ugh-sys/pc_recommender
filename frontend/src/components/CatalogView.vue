<script setup>
import { computed, ref, watch } from 'vue'
import { useRecommendation } from '../composables/useRecommendation'
import PageHeader from './PageHeader.vue'
import AppIcon from './AppIcon.vue'
import RemoteImage from './RemoteImage.vue'
import { formatPriceRange } from '../utils/format'

const {
  dataSource,
  loading,
  error,
  components
} = useRecommendation()

const catalogCategory = ref('gpus')
const catalogBrand = ref('all')
const catalogCpuId = ref('all')
const catalogQuery = ref('')
const catalogPriceMin = ref('')
const catalogPriceMax = ref('')
const catalogSort = ref('price-asc')

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
const shouldShowSearch = computed(() => true)
const selectedCpuPlatform = computed(() => {
  if (catalogCpuId.value === 'all') return ''
  const match = cpuOptions.value.find((item) => item.id === catalogCpuId.value)
  return match?.platform || ''
})

const getPriceMid = (item) => {
  if (!item?.priceRange) return Number.POSITIVE_INFINITY
  return (item.priceRange.min + item.priceRange.max) / 2
}

const getScore = (item) => (typeof item?.score === 'number' ? item.score : 0)

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
  if (shouldShowSearch.value && catalogQuery.value.trim()) {
    const query = catalogQuery.value.trim().toLowerCase()
    items = items.filter((item) => {
      const name = String(item.name || '').toLowerCase()
      const id = String(item.id || '').toLowerCase()
      return name.includes(query) || id.includes(query)
    })
  }
  if (catalogPriceMin.value) {
    const min = Number(catalogPriceMin.value)
    if (Number.isFinite(min)) {
      items = items.filter((item) => (item.priceRange?.min ?? 0) >= min)
    }
  }
  if (catalogPriceMax.value) {
    const max = Number(catalogPriceMax.value)
    if (Number.isFinite(max)) {
      items = items.filter((item) => (item.priceRange?.max ?? Number.POSITIVE_INFINITY) <= max)
    }
  }
  if (catalogSort.value === 'price-desc') {
    items = [...items].sort((a, b) => getPriceMid(b) - getPriceMid(a))
  } else if (catalogSort.value === 'score-desc') {
    items = [...items].sort((a, b) => getScore(b) - getScore(a))
  } else {
    items = [...items].sort((a, b) => getPriceMid(a) - getPriceMid(b))
  }
  return items
})

watch(catalogCategory, () => {
  catalogBrand.value = 'all'
  catalogCpuId.value = 'all'
  catalogQuery.value = ''
  catalogPriceMin.value = ''
  catalogPriceMax.value = ''
  catalogSort.value = 'price-asc'
})

const formatPrice = (item) => formatPriceRange(item?.priceRange)

const headerMeta = computed(() => {
  const categoryLabel = componentCategories.find((item) => item.key === catalogCategory.value)?.label || '--'
  const sourceLabel = error.value
    ? '加载失败'
    : loading.value
      ? '加载中'
      : dataSource.value === 'api'
        ? '后端 API'
        : '本地 JSON'
  return [
    `分类：${categoryLabel}`,
    `数量：${filteredCatalogItems.value.length}`,
    `数据源：${sourceLabel}`
  ]
})

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
  <div class="flex flex-col gap-6 md:gap-8">
    <PageHeader
      eyebrow="配件库"
      title="配置总览"
      description="按分类与条件浏览全部配件配置。"
      :meta="headerMeta"
    >
      <template #right>
        <div class="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm font-semibold ring-1 ring-black/5">
          <div v-if="loading">正在加载配置库...</div>
          <div v-else-if="error">{{ error }}</div>
          <div v-else>
            数据来源：{{ dataSource === 'api' ? '后端 API' : '本地 JSON' }}
          </div>
        </div>
      </template>
    </PageHeader>

    <div class="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <section class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-6">
        <div class="flex items-center justify-between">
          <h2 class="flex items-center gap-2 text-2xl font-semibold">
            <AppIcon name="sliders" class="text-[rgb(var(--accent-strong))]" />
            筛选
          </h2>
          <span class="text-xs font-semibold">只读</span>
        </div>
        <div class="mt-4 grid gap-4">
          <label class="flex flex-col gap-2 text-sm font-semibold">
            分类
            <select
              v-model="catalogCategory"
              class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
            >
              <option v-for="category in componentCategories" :key="category.key" :value="category.key">
                {{ category.label }}
              </option>
            </select>
          </label>
          <div class="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm ring-1 ring-black/5">
            当前分类：{{ componentCategories.find(item => item.key === catalogCategory)?.label || '--' }}
            ，共 {{ filteredCatalogItems.length }} 项
          </div>
          <label v-if="shouldShowBrandFilter" class="flex flex-col gap-2 text-sm font-semibold">
            品牌
            <select
              v-model="catalogBrand"
              class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
            >
              <option value="all">全部</option>
              <option v-for="brand in catalogBrandOptions" :key="brand" :value="brand">
                {{ brand }}
              </option>
            </select>
          </label>
          <label v-if="shouldShowCpuFilter" class="flex flex-col gap-2 text-sm font-semibold">
            CPU 型号
            <select
              v-model="catalogCpuId"
              class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
            >
              <option value="all">全部</option>
              <option v-for="cpu in cpuOptions" :key="cpu.id" :value="cpu.id">
                {{ cpu.name }}
              </option>
            </select>
          </label>
          <label v-if="shouldShowSearch" class="flex flex-col gap-2 text-sm font-semibold">
            搜索
            <input
              v-model="catalogQuery"
              type="text"
              placeholder="搜索型号或 ID"
              class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
            />
          </label>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label class="flex flex-col gap-2 text-sm font-semibold">
              价格最低
              <input
                v-model="catalogPriceMin"
                type="number"
                min="0"
                placeholder="如 1000"
                class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-semibold">
              价格最高
              <input
                v-model="catalogPriceMax"
                type="number"
                min="0"
                placeholder="如 5000"
                class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
              />
            </label>
          </div>
          <label class="flex flex-col gap-2 text-sm font-semibold">
            排序
            <select
              v-model="catalogSort"
              class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
            >
              <option value="price-asc">价格从低到高</option>
              <option value="price-desc">价格从高到低</option>
              <option value="score-desc">评分从高到低</option>
            </select>
          </label>
        </div>
      </section>

      <section class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="flex items-center gap-2 text-2xl font-semibold">
            <AppIcon name="boxes" class="text-[rgb(var(--accent-strong))]" />
            配置列表
          </h2>
          <span class="rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs font-semibold text-neutral-800">
            {{ componentCategories.find(item => item.key === catalogCategory)?.label || '--' }}
          </span>
        </div>
        <div class="mt-4 grid gap-4">
          <div
            v-for="item in filteredCatalogItems"
            :key="item.id"
            class="rounded-3xl border border-white/70 bg-white/70 px-4 py-4 ring-1 ring-black/5"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <RemoteImage :src="item.imageUrl" :alt="item.name" :size="44" />
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{{ item.name }}</p>
                  <p class="truncate text-xs text-neutral-600">{{ item.id }}</p>
                </div>
              </div>
              <span class="text-sm font-semibold">{{ formatPrice(item) }}</span>
            </div>
            <div class="mt-3 text-xs leading-6 text-neutral-700">
              {{ buildSpecs(catalogCategory, item).join(' / ') || '暂无规格' }}
            </div>
            <div v-if="item.notes" class="mt-2 text-xs text-neutral-600">{{ item.notes }}</div>
          </div>
          <div
            v-if="!filteredCatalogItems.length"
            class="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm ring-1 ring-black/5"
          >
            暂无数据，请稍后重试。
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

