<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <h2 class="flex items-center gap-2 text-lg font-semibold md:text-xl">
      <slot name="icon" />
      <span>{{ title }}</span>
    </h2>
    <span v-if="subtitle" class="text-xs font-semibold text-neutral-600">{{ subtitle }}</span>
    <slot v-else name="right" />
  </div>
</template>

