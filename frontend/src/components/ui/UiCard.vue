<script setup>
import { computed } from 'vue'

const props = defineProps({
  as: { type: String, default: 'section' },
  variant: { type: String, default: 'surface' },
  padding: { type: String, default: 'md' },
  rounded: { type: String, default: '3xl' }
})

const roundedClass = computed(() => {
  const value = String(props.rounded || '').trim()
  return value ? `rounded-${value}` : 'rounded-3xl'
})

const variantClass = computed(() => {
  if (props.variant === 'soft') return 'bg-white/70'
  if (props.variant === 'solid') return 'bg-white/85'
  return 'bg-white/75'
})

const paddingClass = computed(() => {
  if (props.padding === 'sm') return 'p-4'
  if (props.padding === 'lg') return 'p-8'
  return 'p-6'
})
</script>

<template>
  <component
    :is="as"
    class="border border-white/70 shadow-sm ring-1 ring-black/5 backdrop-blur"
    :class="[roundedClass, variantClass, paddingClass]"
  >
    <slot />
  </component>
</template>
