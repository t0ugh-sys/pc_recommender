<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRecommendation } from '../composables/useRecommendation'
import PageHeader from './PageHeader.vue'

const {
  dataSource,
  loading,
  error,
  form,
  result,
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
} = useRecommendation()

const shareTitle = ref('')
const shareUrl = ref('')
const shareMessage = ref('')
const shareLoading = ref(false)

const selectedBudgetLabel = computed(() => budgets.value?.find(item => item.id === form.value.budgetId)?.label || '未选择')
const selectedScenarioLabel = computed(() => scenarios.value?.find(item => item.id === form.value.scenarioId)?.label || '未选择')
const selectedModeLabel = computed(() => modes.value?.find(item => item.id === form.value.modeId)?.label || '未选择')
const selectedGpuLabel = computed(() => {
  if (form.value.gpuBrand === 'none') return '无独显'
  if (form.value.gpuBrand === 'AMD') return 'AMD'
  if (form.value.gpuBrand === 'NVIDIA') return 'NVIDIA'
  return '不限'
})
const selectedMemoryTypeLabel = computed(() => {
  if (form.value.memoryType === 'DDR4') return 'DDR4'
  if (form.value.memoryType === 'DDR5') return 'DDR5'
  return '自动'
})
const selectedMemorySticksLabel = computed(() => {
  if (form.value.memorySticks === '2') return '2 根'
  if (form.value.memorySticks === '4') return '4 根'
  return '自动'
})

const headerMeta = computed(() => [
  `预算 ${selectedBudgetLabel.value}`,
  `场景 ${selectedScenarioLabel.value}`,
  `模式 ${selectedModeLabel.value}`,
  `显卡 ${selectedGpuLabel.value}`,
  `内存 ${selectedMemoryTypeLabel.value} / ${selectedMemorySticksLabel.value}`,
  `DIY ${form.value.diyMode ? '开' : '关'}`
])

const formatPriceRange = (item) => {
  if (!item?.priceRange) return '--'
  return `￥${item.priceRange.min} - ￥${item.priceRange.max}`
}

const buildShareUrl = (shareId) => {
  const url = new URL(window.location.href)
  url.searchParams.set('share', shareId)
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  url.pathname = basePath ? `${basePath}/` : '/'
  return url.toString()
}

const handleSaveShare = async () => {
  shareLoading.value = true
  shareMessage.value = ''
  try {
    const shareId = await saveShare(shareTitle.value)
    if (shareId) {
      shareUrl.value = buildShareUrl(shareId)
      shareMessage.value = shareState.value.error || '分享已生成'
    } else {
      shareMessage.value = shareState.value.error || '分享失败'
    }
  } finally {
    shareLoading.value = false
  }
}

const handleCopyShare = async () => {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    shareMessage.value = '链接已复制'
  } catch (err) {
    shareMessage.value = '复制失败，请手动选择链接'
  }
}

const getAlternatives = (key) => result.value?.alternatives?.[key] ?? []

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const shareId = params.get('share')
  if (!shareId) return
  try {
    const payload = await loadShare(shareId)
    applySharedPayload(payload)
    shareUrl.value = buildShareUrl(shareId)
    shareMessage.value = '已加载分享方案'
  } catch (err) {
    shareMessage.value = '分享加载失败'
  }
})

</script>

<template>
  <div class="flex flex-col gap-6 md:gap-8">
    <PageHeader
      eyebrow="推荐"
      title="主机配置推荐"
      description="输入预算、场景与偏好，生成可落地的主机方案。"
      :meta="headerMeta"
    >
      <template #bottom>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
            <p class="text-sm font-semibold">预算拆分</p>
            <p class="mt-2 text-sm leading-6 text-neutral-600">按场景权重分配预算。</p>
          </div>
          <div class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
            <p class="text-sm font-semibold">兼容校验</p>
            <p class="mt-2 text-sm leading-6 text-neutral-600">平台与规格联动校验。</p>
          </div>
          <div class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
            <p class="text-sm font-semibold">功耗估算</p>
            <p class="mt-2 text-sm leading-6 text-neutral-600">给出电源冗余建议。</p>
          </div>
        </div>
      </template>
    </PageHeader>

    <section class="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div class="flex flex-col gap-6">
        <section class="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">条件</h2>
            <span class="text-xs font-semibold">基础输入</span>
          </div>
          <div class="mt-4 rounded-2xl border border-white/70 bg-white/65 p-4 text-sm font-semibold ring-1 ring-black/5">
            <div v-if="loading">正在加载配置库...</div>
            <div v-else-if="error">{{ error }}</div>
            <div v-else>
              数据来源：{{ dataSource === 'api' ? '后端 API' : '本地 JSON' }}
            </div>
          </div>
          <form v-if="!loading && !error" class="mt-5 grid gap-5" @submit.prevent="handleSubmit">
            <div class="grid gap-3">
              <label class="flex flex-col gap-2 text-sm font-semibold">
                预算
                <select
                  v-model="form.budgetId"
                  required
                  class="h-11 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                >
                  <option v-for="item in budgets" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="flex flex-col gap-2 text-sm font-semibold">
                场景
                <select
                  v-model="form.scenarioId"
                  required
                  class="h-11 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                >
                  <option v-for="item in scenarios" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-2 text-sm font-semibold">
                模式
                <select
                  v-model="form.modeId"
                  required
                  class="h-11 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                >
                  <option v-for="item in modes" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="flex flex-col gap-2 text-sm font-semibold">
                显卡
                <select
                  v-model="form.gpuBrand"
                  required
                  class="h-11 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                >
                  <option value="any">不限</option>
                  <option value="none">无独显</option>
                  <option value="AMD">AMD</option>
                  <option value="NVIDIA">NVIDIA</option>
                </select>
                <span class="text-xs leading-5">无独显：办公/轻负载。</span>
              </label>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-2 text-sm font-semibold">
                内存
                <select
                  v-model="form.memoryType"
                  required
                  class="h-11 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                >
                  <option value="auto">自动推荐</option>
                  <option value="DDR4">DDR4</option>
                  <option value="DDR5">DDR5</option>
                </select>
              </label>
              <label class="flex flex-col gap-2 text-sm font-semibold">
                条数
                <select
                  v-model="form.memorySticks"
                  required
                  class="h-11 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                >
                  <option value="auto">自动推荐</option>
                  <option value="2">2 根</option>
                  <option value="4">4 根</option>
                </select>
              </label>
            </div>
            <label class="flex items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm font-semibold ring-1 ring-black/5">
              DIY 模式
              <div class="flex items-center gap-4">
                <input type="checkbox" v-model="form.diyMode" class="h-6 w-6 accent-[rgb(var(--accent-strong))]" />
                <span>允许手动调整部件</span>
              </div>
            </label>
            <button
              type="submit"
              :disabled="loading"
              class="h-11 w-full rounded-2xl text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.45)] disabled:cursor-not-allowed"
              :class="loading ? 'bg-neutral-200 text-neutral-600' : 'bg-[rgb(var(--accent-strong))] hover:bg-[rgb(var(--accent))]'"
            >
              生成推荐
            </button>
          </form>
        </section>

        <section class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">规则说明</h2>
            <span class="text-xs font-semibold">可调整</span>
          </div>
          <ul class="mt-4 flex flex-col gap-3 text-sm leading-6">
            <li>按权重拆分预算，兼顾均衡与目标。</li>
            <li>平台、内存、机箱与功耗同步校验。</li>
            <li>模式决定性价比与性能倾向。</li>
          </ul>
        </section>
      </div>

      <div class="flex flex-col gap-6 lg:sticky lg:top-6">
        <section v-if="result" class="rounded-3xl border border-white/70 bg-white/75 p-8 shadow-sm ring-1 ring-black/5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">结果</h2>
            <span class="text-xs font-semibold">{{ result.mode.label }}</span>
          </div>
          <div v-if="isNoGpu" class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs font-semibold text-neutral-800">
              无独显配置
            </span>
            <span class="rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs text-neutral-800">
              适合办公/轻负载
            </span>
          </div>
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            <div class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
              <p class="text-sm font-semibold">整机价格区间</p>
              <p class="mt-3 text-2xl font-semibold">
                ￥{{ totalMin.toLocaleString() }} - ￥{{ totalMax.toLocaleString() }}
              </p>
            </div>
            <div class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
              <p class="text-sm font-semibold">预计功耗</p>
              <p class="mt-3 text-2xl font-semibold">{{ estimatedPower }}W</p>
            </div>
            <div class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
              <p class="text-sm font-semibold">预算档位</p>
              <p class="mt-3 text-2xl font-semibold">{{ result.budget.label }}</p>
            </div>
          </div>
          <div class="mt-6 rounded-3xl border border-white/70 bg-white/70 ring-1 ring-black/5">
            <div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3 text-xs font-semibold uppercase">
              <span>配置清单</span>
              <span>8 项</span>
            </div>
            <div class="divide-y divide-neutral-200">
              <div
                v-for="item in displayItems"
                :key="item.key"
                class="grid gap-3 px-4 py-4 md:grid-cols-[140px_minmax(0,1fr)_160px]"
              >
                <div class="text-sm font-semibold">{{ categoryLabels[item.key] }}</div>
                <div class="min-w-0 text-sm">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="min-w-0 truncate font-semibold text-neutral-900">{{ item.value.name }}</span>
                    <span
                      v-if="item.key === 'memory' && result?.memorySticks"
                      class="shrink-0 rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs text-neutral-800"
                    >
                      {{ result.memorySticks }} 根
                    </span>
                  </div>
                  <div v-if="item.key === 'memory'" class="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                    <span
                      v-if="item.value?.memoryType"
                      class="rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-neutral-800"
                    >
                      {{ item.value.memoryType }}
                    </span>
                  </div>
                </div>
                <div class="text-sm tabular-nums md:text-right">
                  ￥{{ item.value.priceRange.min }} - ￥{{ item.value.priceRange.max }}
                </div>
                <div class="text-xs leading-6 text-neutral-700 md:col-span-3">
                  <span class="break-words">{{ item.value.notes }}</span>
                  <span class="ml-2 rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-neutral-800">
                    {{ categoryIcons[item.key] }}
                  </span>
                </div>
                <div v-if="getAlternatives(item.key).length" class="text-xs md:col-span-3">
                  <p class="mt-2 text-xs font-semibold">备选推荐</p>
                  <div class="mt-2 flex flex-col gap-2">
                    <div
                      v-for="alt in getAlternatives(item.key)"
                      :key="alt.id"
                      class="flex flex-col gap-2 rounded-2xl border border-white/70 bg-white/65 px-3 py-2 ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div class="min-w-0">
                        <div class="truncate text-xs font-semibold">{{ alt.name }}</div>
                        <div class="mt-0.5 text-xs text-neutral-600 sm:hidden">{{ formatPriceRange(alt) }}</div>
                      </div>
                      <div class="text-xs tabular-nums text-neutral-700 max-sm:hidden">{{ formatPriceRange(alt) }}</div>
                      <button
                        v-if="form.diyMode"
                        class="rounded-full border border-[rgb(var(--accent)/0.35)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs font-semibold text-neutral-800 transition-colors hover:border-[rgb(var(--accent)/0.45)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)]"
                        @click="updateSelection(item.key, alt.id)"
                      >
                        替换
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="result?.reasons?.length" class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">推荐理由</h2>
            <span class="text-xs font-semibold">简要</span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span
              v-for="reason in result.reasons"
              :key="reason"
              class="rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-neutral-800"
            >
              {{ reason }}
            </span>
          </div>
        </section>

        <section v-if="result" class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">保存与分享</h2>
            <span class="text-xs font-semibold">链接</span>
          </div>
          <div class="mt-4 grid gap-4">
            <label class="flex flex-col gap-2 text-sm font-semibold">
              方案名称（可选）
              <input
                v-model="shareTitle"
                type="text"
                placeholder="例如：设计向 9K 预算"
                class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
              />
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <button
                class="h-12 w-full rounded-2xl bg-[rgb(var(--accent-strong))] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[rgb(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.45)] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-600"
                :disabled="shareLoading"
                @click="handleSaveShare"
              >
                生成分享链接
              </button>
              <button
                class="h-12 w-full rounded-2xl border border-neutral-300 bg-white text-sm font-semibold shadow-sm transition-colors hover:border-[rgb(var(--accent)/0.4)] hover:bg-[rgb(var(--accent-soft))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] disabled:cursor-not-allowed"
                :disabled="!shareUrl"
                @click="handleCopyShare"
              >
                复制链接
              </button>
            </div>
            <div v-if="shareUrl" class="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-xs break-all ring-1 ring-black/5">
              {{ shareUrl }}
            </div>
            <div v-if="shareMessage" class="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm ring-1 ring-black/5">
              {{ shareMessage }}
            </div>
          </div>
        </section>

        <section v-else-if="submitted" class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
          <h2 class="text-2xl font-semibold">暂未生成结果</h2>
          <p class="mt-3 text-sm leading-6">请调整预算与偏好条件后重新生成推荐。</p>
        </section>

        <section v-else class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
          <h2 class="text-2xl font-semibold">等待生成推荐</h2>
          <p class="mt-3 text-sm leading-6">完成输入条件后即可生成推荐结果。</p>
        </section>

        <section v-if="form.diyMode && result" class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">DIY 调整</h2>
            <span class="text-xs font-semibold">实时校验</span>
          </div>
          <p class="mt-3 text-sm leading-6">
            你可以手动替换各部件，系统会重新计算价格区间与兼容性提示。
          </p>
          <div class="mt-4 grid gap-6">
            <div v-for="group in diyDisplayGroups" :key="group.title" class="rounded-3xl border border-white/70 bg-white/70 p-4 ring-1 ring-black/5">
              <p class="text-sm font-semibold">{{ group.title }}</p>
              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <label v-for="item in group.items" :key="item.key" class="flex flex-col gap-2 text-sm font-semibold">
                  {{ categoryLabels[item.key] }}
                  <select
                    :value="item.value.id"
                    class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.35)] focus-visible:border-[rgb(var(--accent-strong)/0.55)]"
                    @change="updateSelection(item.key, $event.target.value)"
                  >
                    <option v-for="option in getOptions(item.key)" :key="option.id" :value="option.id">
                      {{ option.name }}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="result && ((result.risks?.length ?? 0) || result.warnings.length || diyWarnings.length)"
          class="rounded-3xl border border-white/70 bg-white/70 p-6 ring-1 ring-black/5"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">风险提示</h2>
            <span class="text-xs font-semibold">需留意</span>
          </div>
          <div class="mt-4 flex flex-col gap-3 text-sm leading-6">
            <div v-if="result.risks?.length" class="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 ring-1 ring-black/5">
              <p class="text-xs font-semibold">预算风险</p>
              <ul class="mt-2 flex flex-col gap-2 text-sm leading-6">
                <li v-for="risk in result.risks" :key="risk">{{ risk }}</li>
              </ul>
            </div>
            <div v-if="result.warnings.length" class="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 ring-1 ring-black/5">
              <p class="text-xs font-semibold">系统提示</p>
              <ul class="mt-2 flex flex-col gap-2 text-sm leading-6">
                <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
            <div v-if="diyWarnings.length" class="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 ring-1 ring-black/5">
              <p class="text-xs font-semibold">DIY 校验</p>
              <ul class="mt-2 flex flex-col gap-2 text-sm leading-6">
                <li v-for="warning in diyWarnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm ring-1 ring-black/5">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">维护说明</h2>
        <span class="text-xs font-semibold">配置可更新</span>
      </div>
      <ul class="mt-4 flex flex-col gap-3 text-sm leading-6">
        <li>更新 `data/components.json` 可维护配件库与价格区间。</li>
        <li>更新 `data/rules.json` 可调整预算权重与选型规则。</li>
        <li>每次更新后请同步到 `frontend/public/data/` 目录。</li>
      </ul>
    </section>

  </div>
</template>
