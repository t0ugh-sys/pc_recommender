<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import RecommendationView from './components/RecommendationView.vue'
import CatalogView from './components/CatalogView.vue'
import AdminView from './components/AdminView.vue'

const activeView = ref('recommend')
const syncViewFromPath = () => {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/admin') {
    activeView.value = 'admin'
    return
  }
  if (path === '/catalog') {
    activeView.value = 'catalog'
    return
  }
  activeView.value = 'recommend'
}

const switchView = (nextView) => {
  activeView.value = nextView
  const targetPath = nextView === 'admin'
    ? '/admin'
    : nextView === 'catalog'
      ? '/catalog'
      : '/'
  if (window.location.pathname !== targetPath) {
    window.history.pushState({}, '', targetPath)
  }
}

onMounted(() => {
  syncViewFromPath()
  window.addEventListener('popstate', syncViewFromPath)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncViewFromPath)
})
</script>

<template>
  <div class="min-h-screen bg-neutral-100 text-black">
    <div class="flex w-full font-sans">
      <aside class="fixed inset-y-0 left-0 w-64 border-r border-neutral-200 bg-white px-6 py-8 shadow-sm">
        <div class="flex h-full flex-col gap-6">
          <p class="text-sm font-semibold uppercase tracking-[0.2em]">PC 配置推荐</p>
          <p class="mt-3 text-sm leading-6">推荐生成整机，配件库浏览全量配置。</p>
          <div class="mt-6 flex flex-col gap-3">
            <button
              class="h-12 rounded-2xl px-4 text-left text-sm font-semibold"
              :class="activeView === 'recommend'
                ? 'bg-black text-white'
                : 'border border-neutral-300 bg-white text-black'"
              @click="switchView('recommend')"
            >
              推荐
            </button>
            <button
              class="h-12 rounded-2xl px-4 text-left text-sm font-semibold"
              :class="activeView === 'catalog'
                ? 'bg-black text-white'
                : 'border border-neutral-300 bg-white text-black'"
              @click="switchView('catalog')"
            >
              配件库
            </button>
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-6 py-8 pl-72">
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <header class="rounded-2xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
            <div class="flex flex-col gap-2">
              <p class="text-xs font-semibold uppercase tracking-[0.2em]">当前页面</p>
              <h2 class="text-2xl font-semibold">
                {{ activeView === 'catalog' ? '配件库' : '推荐' }}
              </h2>
              <p class="text-sm leading-6">
                {{ activeView === 'catalog'
                  ? '按分类、品牌与型号查看全量配置。'
                  : '输入预算与场景生成推荐方案。' }}
              </p>
            </div>
          </header>
          <RecommendationView v-if="activeView === 'recommend'" />
          <CatalogView v-else-if="activeView === 'catalog'" />
          <AdminView v-else />
        </div>
      </main>
    </div>
  </div>
</template>
