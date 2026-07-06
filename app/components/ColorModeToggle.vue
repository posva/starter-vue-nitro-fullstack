<script setup lang="ts">
import UButton from '@nuxt/ui/components/Button.vue'
import { onMounted, ref } from 'vue'
import { useDark, useToggle } from '@vueuse/core'

// Reuses the same `useDark` instance Nuxt UI's color-mode plugin installs
// (storage key 'vueuse-color-scheme'), so this toggles the global theme and
// persists across reloads.
const isDark = useDark()
const toggleDark = useToggle(isDark)

// `isDark` only reflects localStorage / OS preference on the client. Gate the
// icon + label on mount so the button's SSR markup matches the first client
// render (no hydration mismatch); the page theme itself is applied pre-paint by
// the inline script in entry-server.ts.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <UButton
    :icon="mounted && isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
    color="neutral"
    variant="ghost"
    :aria-label="mounted && isDark ? 'Switch to light theme' : 'Switch to dark theme'"
    @click="toggleDark()"
  />
</template>
