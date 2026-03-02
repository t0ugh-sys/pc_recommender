<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  meta: { type: Array, default: () => [] }
})
</script>

<template>
  <header
    class="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm backdrop-blur ring-1 ring-black/5 md:p-8"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <p
            v-if="eyebrow"
            class="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--accent-strong))]"
          >
            {{ eyebrow }}
          </p>
          <h1 class="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
            {{ title }}
          </h1>
          <p v-if="description" class="mt-3 text-sm leading-6 text-neutral-600">
            {{ description }}
          </p>
        </div>
        <div v-if="$slots.right" class="md:pl-6">
          <slot name="right" />
        </div>
      </div>

      <div v-if="meta?.length" class="flex flex-wrap gap-2 text-xs">
        <span
          v-for="(item, index) in meta"
          :key="`${index}-${item}`"
          class="rounded-full border border-[rgb(var(--accent)/0.25)] bg-[rgb(var(--accent-soft))] px-3 py-1 text-neutral-700"
        >
          {{ item }}
        </span>
      </div>

      <div v-if="$slots.bottom">
        <slot name="bottom" />
      </div>
    </div>
  </header>
</template>
