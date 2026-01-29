<script setup>
import { computed } from 'vue'
import { useRecommendation } from '../composables/useRecommendation'

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
  updateSelection
} = useRecommendation()

const selectedBudgetLabel = computed(() => budgets.value?.find(item => item.id === form.budgetId)?.label || '未选择')
const selectedScenarioLabel = computed(() => scenarios.value?.find(item => item.id === form.scenarioId)?.label || '未选择')
const selectedModeLabel = computed(() => modes.value?.find(item => item.id === form.modeId)?.label || '未选择')
const selectedGpuLabel = computed(() => {
  if (form.gpuBrand === 'none') return '无独显'
  if (form.gpuBrand === 'AMD') return 'AMD'
  if (form.gpuBrand === 'NVIDIA') return 'NVIDIA'
  return '不限'
})
const selectedMemoryTypeLabel = computed(() => {
  if (form.memoryType === 'DDR4') return 'DDR4'
  if (form.memoryType === 'DDR5') return 'DDR5'
  return '自动'
})
const selectedMemorySticksLabel = computed(() => {
  if (form.memorySticks === '2') return '2 根'
  if (form.memorySticks === '4') return '4 根'
  return '自动'
})

</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <div class="flex flex-col gap-4">
        <p class="text-sm font-semibold uppercase tracking-[0.2em]">PC 配置推荐</p>
        <div class="flex flex-col gap-3">
          <h1 class="text-3xl font-semibold leading-tight">主机配置推荐</h1>
          <p class="text-base leading-6">输入预算、场景与偏好，生成可落地的主机方案。</p>
        </div>
      </div>
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p class="text-sm font-semibold">预算拆分</p>
          <p class="mt-2 text-sm leading-6">场景权重分配预算。</p>
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p class="text-sm font-semibold">兼容校验</p>
          <p class="mt-2 text-sm leading-6">平台与规格匹配。</p>
        </div>
        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p class="text-sm font-semibold">功耗估算</p>
          <p class="mt-2 text-sm leading-6">电源冗余建议。</p>
        </div>
      </div>
      <div class="mt-6 flex flex-wrap gap-2 text-xs">
        <span class="rounded-full border border-neutral-300 px-3 py-1">
          预算：{{ selectedBudgetLabel }}
        </span>
        <span class="rounded-full border border-neutral-300 px-3 py-1">
          场景：{{ selectedScenarioLabel }}
        </span>
        <span class="rounded-full border border-neutral-300 px-3 py-1">
          模式：{{ selectedModeLabel }}
        </span>
        <span class="rounded-full border border-neutral-300 px-3 py-1">
          显卡：{{ selectedGpuLabel }}
        </span>
        <span class="rounded-full border border-neutral-300 px-3 py-1">
          内存代际：{{ selectedMemoryTypeLabel }}
        </span>
        <span class="rounded-full border border-neutral-300 px-3 py-1">
          内存条数：{{ selectedMemorySticksLabel }}
        </span>
      </div>
    </header>

    <section class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div class="flex flex-col gap-6">
        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">条件</h2>
            <span class="text-xs font-semibold">基础输入</span>
          </div>
          <div class="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm font-semibold">
            <div v-if="loading">正在加载配置库...</div>
            <div v-else-if="error">{{ error }}</div>
            <div v-else>
              数据来源：{{ dataSource === 'api' ? '后端 API' : '本地 JSON' }}
            </div>
          </div>
          <form v-if="!loading && !error" class="mt-6 grid gap-6" @submit.prevent="handleSubmit">
            <div class="grid gap-4">
              <label class="flex flex-col gap-2 text-sm font-semibold">
                预算档位
                <select v-model="form.budgetId" required class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                  <option v-for="item in budgets" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="flex flex-col gap-2 text-sm font-semibold">
                使用场景
                <select v-model="form.scenarioId" required class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                  <option v-for="item in scenarios" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="flex flex-col gap-2 text-sm font-semibold">
                偏好模式
                <select v-model="form.modeId" required class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                  <option v-for="item in modes" :key="item.id" :value="item.id">
                    {{ item.label }}
                  </option>
                </select>
              </label>
              <label class="flex flex-col gap-2 text-sm font-semibold">
                显卡品牌
                <select v-model="form.gpuBrand" required class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                  <option value="any">不限</option>
                  <option value="none">无独显</option>
                  <option value="AMD">AMD</option>
                  <option value="NVIDIA">NVIDIA</option>
                </select>
                <span class="text-xs leading-5">无独显适合办公/轻负载。</span>
              </label>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="flex flex-col gap-2 text-sm font-semibold">
                内存代际
                <select v-model="form.memoryType" required class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                  <option value="auto">自动推荐</option>
                  <option value="DDR4">DDR4</option>
                  <option value="DDR5">DDR5</option>
                </select>
              </label>
              <label class="flex flex-col gap-2 text-sm font-semibold">
                内存条数
                <select v-model="form.memorySticks" required class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm">
                  <option value="auto">自动推荐</option>
                  <option value="2">2 根</option>
                  <option value="4">4 根</option>
                </select>
              </label>
            </div>
            <label class="flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm font-semibold">
              DIY 模式
              <div class="flex items-center gap-4">
                <input type="checkbox" v-model="form.diyMode" class="h-6 w-6 accent-black" />
                <span>允许手动调整部件</span>
              </div>
            </label>
            <button
              type="submit"
              :disabled="loading"
              class="h-12 w-full rounded-2xl text-sm font-semibold text-white"
              :class="loading ? 'bg-neutral-300 text-black' : 'bg-black'"
            >
              生成推荐
            </button>
          </form>
        </section>

        <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
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
        <section v-if="result" class="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">结果</h2>
            <span class="text-xs font-semibold">{{ result.mode.label }}</span>
          </div>
          <div v-if="isNoGpu" class="mt-4 flex flex-wrap gap-2">
            <span class="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold">
              无独显配置
            </span>
            <span class="rounded-full border border-neutral-300 px-3 py-1 text-xs">
              适合办公/轻负载
            </span>
          </div>
          <div class="mt-6 grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p class="text-sm font-semibold">整机价格区间</p>
              <p class="mt-3 text-2xl font-semibold">
                ￥{{ totalMin.toLocaleString() }} - ￥{{ totalMax.toLocaleString() }}
              </p>
            </div>
            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p class="text-sm font-semibold">预计功耗</p>
              <p class="mt-3 text-2xl font-semibold">{{ estimatedPower }}W</p>
            </div>
            <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p class="text-sm font-semibold">预算档位</p>
              <p class="mt-3 text-2xl font-semibold">{{ result.budget.label }}</p>
            </div>
          </div>
          <div class="mt-6 rounded-2xl border border-neutral-200 bg-white">
            <div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3 text-xs font-semibold uppercase">
              <span>配置清单</span>
              <span>8 项</span>
            </div>
            <div class="divide-y divide-neutral-200">
              <div v-for="item in displayItems" :key="item.key" class="grid gap-3 px-4 py-4 md:grid-cols-[140px_1fr_160px]">
                <div class="text-sm font-semibold">{{ categoryLabels[item.key] }}</div>
                <div class="text-sm">
                  {{ item.value.name }}
                  <span
                    v-if="item.key === 'memory' && result?.memorySticks"
                    class="ml-2 rounded-full border border-neutral-300 px-3 py-1 text-xs"
                  >
                    {{ result.memorySticks }} 根
                  </span>
                </div>
                <div class="text-sm md:text-right">￥{{ item.value.priceRange.min }} - ￥{{ item.value.priceRange.max }}</div>
                <div class="text-xs md:col-span-3">
                  {{ item.value.notes }}
                  <span class="ml-2 rounded-full border border-neutral-300 px-3 py-1">
                    {{ categoryIcons[item.key] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="result?.reasons?.length" class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">推荐理由</h2>
            <span class="text-xs font-semibold">简要</span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span v-for="reason in result.reasons" :key="reason" class="rounded-full border border-neutral-300 px-3 py-1">
              {{ reason }}
            </span>
          </div>
        </section>

        <section v-else-if="submitted" class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 class="text-2xl font-semibold">暂未生成结果</h2>
          <p class="mt-3 text-sm leading-6">请调整预算与偏好条件后重新生成推荐。</p>
        </section>

        <section v-else class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 class="text-2xl font-semibold">等待生成推荐</h2>
          <p class="mt-3 text-sm leading-6">完成输入条件后即可生成推荐结果。</p>
        </section>

        <section v-if="form.diyMode && result" class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">DIY 调整</h2>
            <span class="text-xs font-semibold">实时校验</span>
          </div>
          <p class="mt-3 text-sm leading-6">
            你可以手动替换各部件，系统会重新计算价格区间与兼容性提示。
          </p>
          <div class="mt-4 grid gap-6">
            <div v-for="group in diyDisplayGroups" :key="group.title" class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <p class="text-sm font-semibold">{{ group.title }}</p>
              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <label v-for="item in group.items" :key="item.key" class="flex flex-col gap-2 text-sm font-semibold">
                  {{ categoryLabels[item.key] }}
                  <select
                    :value="item.value.id"
                    class="h-12 rounded-2xl border border-neutral-300 bg-white px-4 text-sm"
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

        <section v-if="result && ((result.risks?.length ?? 0) || result.warnings.length || diyWarnings.length)" class="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold">风险提示</h2>
            <span class="text-xs font-semibold">需留意</span>
          </div>
          <div class="mt-4 flex flex-col gap-3 text-sm leading-6">
            <div v-if="result.risks?.length" class="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
              <p class="text-xs font-semibold">预算风险</p>
              <ul class="mt-2 flex flex-col gap-2 text-sm leading-6">
                <li v-for="risk in result.risks" :key="risk">{{ risk }}</li>
              </ul>
            </div>
            <div v-if="result.warnings.length" class="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
              <p class="text-xs font-semibold">系统提示</p>
              <ul class="mt-2 flex flex-col gap-2 text-sm leading-6">
                <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
            <div v-if="diyWarnings.length" class="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
              <p class="text-xs font-semibold">DIY 校验</p>
              <ul class="mt-2 flex flex-col gap-2 text-sm leading-6">
                <li v-for="warning in diyWarnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold">维护说明</h2>
        <span class="text-xs font-semibold">配置可更新</span>
      </div>
      <ul class="mt-4 flex flex-col gap-3 text-sm leading-6">
        <li>更新 `data/components.json` 可维护配件库与价格区间。</li>
        <li>更新 `data/rules.json` 可调整预算权重与选型规则。</li>
        <li>每次更新后请同步到 `app/public/data/` 目录。</li>
      </ul>
    </section>

  </div>
</template>
