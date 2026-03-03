<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RecommendationView from './components/RecommendationView.vue'
import CatalogView from './components/CatalogView.vue'
import AdminView from './components/AdminView.vue'
import AppIcon from './components/AppIcon.vue'

const activeView = ref('recommend')
const drawerOpen = ref(false)
const drawerPanel = ref(null)
const drawerCloseButton = ref(null)
const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
let lastFocusedElement = null

const navItems = [
  { key: 'recommend', label: '推荐', icon: 'sparkles' },
  { key: 'catalog', label: '配件库', icon: 'boxes' }
]

const normalizePath = (path) => {
  const trimmed = String(path || '').replace(/\/+$/, '')
  return trimmed || '/'
}

const stripBasePath = (pathname) => {
  if (!basePath) return pathname
  if (pathname === basePath) return '/'
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname
}

const withBasePath = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return basePath ? `${basePath}${normalized}` : normalized
}

const syncViewFromPath = () => {
  const path = normalizePath(stripBasePath(window.location.pathname))
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
  drawerOpen.value = false
  const targetPath = nextView === 'admin'
    ? withBasePath('/admin')
    : nextView === 'catalog'
      ? withBasePath('/catalog')
      : withBasePath('/')
  if (normalizePath(window.location.pathname) !== normalizePath(targetPath)) {
    window.history.pushState({}, '', targetPath)
  }
}

const closeDrawer = () => {
  drawerOpen.value = false
}

const activeViewLabel = () => {
  if (activeView.value === 'catalog') return '配件库'
  if (activeView.value === 'admin') return '管理'
  return '推荐'
}

const getNavButtonClass = (key) =>
  activeView.value === key
    ? 'border border-transparent bg-[rgb(var(--accent))] text-white shadow-sm'
    : 'border border-neutral-300 bg-white text-black hover:border-[rgb(var(--accent)/0.5)] hover:bg-[rgb(var(--accent-soft))]'

const getDrawerFocusables = () => {
  if (!drawerPanel.value) return []
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',')

  return Array.from(drawerPanel.value.querySelectorAll(selector)).filter(
    (element) => element && !element.hasAttribute('disabled') && element.tabIndex !== -1
  )
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') closeDrawer()
  if (!drawerOpen.value) return
  if (event.key !== 'Tab') return

  const focusables = getDrawerFocusables()
  if (!focusables.length) {
    event.preventDefault()
    return
  }

  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  const active = document.activeElement

  if (event.shiftKey) {
    if (active === first || !drawerPanel.value.contains(active)) {
      event.preventDefault()
      last.focus()
    }
    return
  }

  if (active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  syncViewFromPath()
  window.addEventListener('popstate', syncViewFromPath)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncViewFromPath)
  window.removeEventListener('keydown', handleKeydown)
  document.documentElement.style.overflow = ''
})

watch(drawerOpen, (nextValue) => {
  // Prevent background scrolling on mobile when the drawer is open.
  document.documentElement.style.overflow = nextValue ? 'hidden' : ''
  if (nextValue) {
    lastFocusedElement = document.activeElement
    nextTick(() => {
      drawerCloseButton.value?.focus?.()
    })
    return
  }
  if (lastFocusedElement?.focus) {
    nextTick(() => {
      lastFocusedElement?.focus?.()
      lastFocusedElement = null
    })
  }
})
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-neutral-100 text-black">
    <div class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(var(--bg-top),0.8)_0%,rgba(var(--bg-mid),0.92)_45%,rgba(var(--bg-bottom),0.92)_100%)]" />
      <div class="absolute -left-20 top-16 h-64 w-64 rounded-full bg-[rgb(var(--accent-soft))] blur-3xl" />
      <div class="absolute right-8 top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-soft))] blur-3xl" />
    </div>
    <div
      class="relative z-10 flex w-full font-sans"
      :aria-hidden="drawerOpen ? 'true' : undefined"
      :inert="drawerOpen ? '' : null"
    >
      <aside class="hidden w-64 border-r border-white/60 bg-white/70 px-6 py-8 shadow-sm backdrop-blur md:fixed md:inset-y-0 md:left-0 md:block">
        <div class="flex h-full flex-col gap-6">
          <p class="text-sm font-semibold uppercase tracking-[0.2em]">PC 配置推荐</p>
          <p class="mt-3 text-sm leading-6 text-neutral-600">推荐生成整机，配件库浏览全量配置。</p>
          <div class="mt-6 flex flex-col gap-3">
            <button
              v-for="item in navItems"
              :key="item.key"
              class="h-12 rounded-2xl px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.4)]"
              type="button"
              :aria-current="activeView === item.key ? 'page' : undefined"
              :class="getNavButtonClass(item.key)"
              @click="switchView(item.key)"
            >
              <span class="flex items-center gap-3">
                <AppIcon :name="item.icon" :class="activeView === item.key ? 'text-white' : 'text-[rgb(var(--accent-strong))]'" />
                <span>{{ item.label }}</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-4 py-6 md:ml-64 md:px-8 md:py-8">
        <div class="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-8">
          <header class="sticky top-0 z-30 -mx-4 border-b border-white/70 bg-white/75 px-4 py-3 backdrop-blur md:hidden">
            <div class="flex items-center justify-between gap-3">
              <button
                class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white text-sm font-semibold shadow-sm"
                type="button"
                aria-label="打开菜单"
                aria-controls="mobile-drawer"
                :aria-expanded="drawerOpen"
                @click="drawerOpen = true"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ activeViewLabel() }}</p>
                <p class="truncate text-xs text-neutral-500">PC 配置推荐</p>
              </div>
              <div class="h-11 w-11" />
            </div>
          </header>

          <RecommendationView v-if="activeView === 'recommend'" />
          <CatalogView v-else-if="activeView === 'catalog'" />
          <AdminView v-else />
        </div>
      </main>
    </div>

    <Transition name="fade">
      <div v-if="drawerOpen" class="fixed inset-0 z-50 md:hidden" @click.self="closeDrawer">
        <div class="absolute inset-0 bg-black/40" aria-hidden="true" />
        <Transition name="drawer">
          <div
            id="mobile-drawer"
            ref="drawerPanel"
            class="absolute inset-y-0 left-0 w-[18.5rem] max-w-[90vw] border-r border-neutral-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-drawer-title"
          >
            <div class="flex items-center justify-between">
              <p id="mobile-drawer-title" class="text-sm font-semibold uppercase tracking-[0.2em]">PC 配置推荐</p>
              <button
                ref="drawerCloseButton"
                class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white text-sm font-semibold shadow-sm transition-colors hover:border-[rgb(var(--accent)/0.4)] hover:bg-[rgb(var(--accent-soft))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.4)]"
                type="button"
                aria-label="关闭菜单"
                @click="closeDrawer"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p class="mt-3 text-sm leading-6 text-neutral-600">推荐生成整机，配件库浏览全量配置。</p>
            <div class="mt-6 flex flex-col gap-3">
              <button
                v-for="item in navItems"
                :key="item.key"
                class="h-12 rounded-2xl px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-strong)/0.4)]"
                type="button"
                :aria-current="activeView === item.key ? 'page' : undefined"
                :class="getNavButtonClass(item.key)"
                @click="switchView(item.key)"
              >
                <span class="flex items-center gap-3">
                  <AppIcon :name="item.icon" :class="activeView === item.key ? 'text-white' : 'text-[rgb(var(--accent-strong))]'" />
                  <span>{{ item.label }}</span>
                </span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 200ms ease;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}
</style>
