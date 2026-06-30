<script setup lang="ts">
import { useTheme, type ThemeMode } from '../lib/use-theme'

const { mode, accentHue, presets } = useTheme()

const modes: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Accent swatches: each click sets --accent-hue live → whole UI re-tints. -->
    <div class="hidden items-center gap-1.5 sm:flex" role="group" aria-label="Accent color">
      <button
        v-for="p in presets"
        :key="p.hue"
        type="button"
        :title="p.name"
        :aria-label="p.name"
        :aria-pressed="accentHue === p.hue"
        class="size-5 rounded-full border border-black/10 bg-none p-0 shadow-none transition-transform hover:scale-110 dark:border-white/15"
        :class="
          accentHue === p.hue ? 'ring-2 ring-text-dim/60 ring-offset-2 ring-offset-surface' : ''
        "
        :style="{ background: `oklch(0.68 0.2 ${p.hue})` }"
        @click="accentHue = p.hue"
      />
    </div>

    <!-- Light / Dark / System segmented control. -->
    <div
      class="inline-flex rounded-full border border-border bg-surface-2 p-0.5"
      role="group"
      aria-label="Color mode"
    >
      <button
        v-for="m in modes"
        :key="m.value"
        type="button"
        :aria-pressed="mode === m.value"
        :title="m.label"
        class="inline-flex size-8 items-center justify-center rounded-full border-none bg-none p-0 text-text-dim shadow-none transition-colors hover:text-text"
        :class="mode === m.value ? 'bg-surface text-primary shadow-sm' : ''"
        @click="mode = m.value"
      >
        <!-- Sun -->
        <svg
          v-if="m.value === 'light'"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
          />
        </svg>
        <!-- Moon -->
        <svg
          v-else-if="m.value === 'dark'"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
        <!-- Monitor -->
        <svg
          v-else
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8m-4-4v4" />
        </svg>
        <span class="sr-only">{{ m.label }}</span>
      </button>
    </div>
  </div>
</template>
