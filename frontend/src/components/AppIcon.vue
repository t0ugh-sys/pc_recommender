<script setup>
defineProps({
  name: { type: String, required: true }
})
</script>

<template>
  <span class="inline-flex items-center justify-center" aria-hidden="true">
    <!-- Keep icons simple (stroke-based) to avoid heavy assets and keep style consistent. -->
    <svg
      v-if="name === 'sparkles'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 2l1.2 4.3L18 8l-4.8 1.7L12 14l-1.2-4.3L6 8l4.8-1.7L12 2z" />
      <path d="M19 13l.7 2.4L22 16l-2.3.6L19 19l-.7-2.4L16 16l2.3-.6L19 13z" />
    </svg>

    <svg
      v-else-if="name === 'boxes'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>

    <svg
      v-else-if="name === 'sliders'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M14 6v0" />
      <path d="M4 12h2" />
      <path d="M10 12h10" />
      <path d="M8 12v0" />
      <path d="M4 18h8" />
      <path d="M16 18h4" />
      <path d="M14 18v0" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="18" r="2" />
    </svg>

    <svg
      v-else-if="name === 'clipboard'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M9 4h6" />
      <path d="M10 2h4v4h-4V2z" />
      <path d="M7 6h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>

    <svg
      v-else-if="name === 'share'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M15 8l5-5" />
      <path d="M20 3v6h-6" />
      <path d="M20 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>

    <svg
      v-else-if="name === 'shield'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>

    <svg
      v-else-if="name === 'wrench'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 7a6 6 0 0 1-8 5.7L6 19.7a2 2 0 0 1-2.8-2.8l7-7A6 6 0 0 1 16 3l-3 3 2 2 3-3z" />
    </svg>

    <svg
      v-else-if="name === 'info'"
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>

    <svg
      v-else
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M12 2v20" />
      <path d="M2 12h20" />
    </svg>
  </span>
</template>

