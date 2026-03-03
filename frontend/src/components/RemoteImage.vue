<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  size: { type: [Number, String], default: 40 },
  roundedClass: { type: String, default: 'rounded-2xl' }
})

const failed = ref(false)

watch(
  () => props.src,
  () => {
    failed.value = false
  }
)

const sizePx = computed(() => {
  const value = Number(props.size)
  return Number.isFinite(value) && value > 0 ? `${value}px` : '40px'
})

const shouldShowImage = computed(() => Boolean(props.src) && !failed.value)

const handleError = () => {
  failed.value = true
}
</script>

<template>
  <div
    class="shrink-0 overflow-hidden border border-white/70 bg-white/70 ring-1 ring-black/5"
    :class="roundedClass"
    :style="{ width: sizePx, height: sizePx }"
  >
    <img
      v-if="shouldShowImage"
      :src="src"
      :alt="alt"
      class="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      @error="handleError"
    />
    <div v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">
      --
    </div>
  </div>
</template>
