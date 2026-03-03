<script setup>
import { computed } from 'vue'

const props = defineProps({
  tone: { type: String, default: 'accent' },
  size: { type: String, default: 'md' }
})

const toneClass = computed(() => {
  if (props.tone === 'neutral') return 'border-neutral-200 bg-white text-neutral-700'
  if (props.tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (props.tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] text-neutral-800'
})

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'px-2.5 py-1 text-[11px]'
  return 'px-3 py-1 text-xs'
})
</script>

<template>
  <span class="inline-flex items-center gap-1 rounded-full border font-semibold" :class="[toneClass, sizeClass]">
    <slot />
  </span>
</template>

