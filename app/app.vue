<script setup lang="ts">
import UApp from '@nuxt/ui/components/App.vue'
import UButton from '@nuxt/ui/components/Button.vue'
import UContainer from '@nuxt/ui/components/Container.vue'
import UHeader from '@nuxt/ui/components/Header.vue'
import UMain from '@nuxt/ui/components/Main.vue'
import UNavigationMenu from '@nuxt/ui/components/NavigationMenu.vue'
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAuth } from './lib/use-auth'
import ColorModeToggle from './components/ColorModeToggle.vue'
import './assets/css/main.css'

const { session, pending } = useAuth()

const navItems = computed<NavigationMenuItem[]>(() => [
  { label: 'Home', to: '/', icon: 'i-lucide-house' },
  { label: 'Todos', to: '/todos', icon: 'i-lucide-list-checks' },
  { label: 'Product', to: '/producs/254', icon: 'i-lucide-package' },
  { label: 'About', to: '/about', icon: 'i-lucide-info' },
])
</script>

<template>
  <UApp>
    <SpeedInsights />
    <!-- Pinia Colada data-fetching devtools; auto-stripped from production builds. -->
    <PiniaColadaDevtools />

    <UHeader>
      <template #title>
        <span class="text-highlighted text-lg font-bold">Vue&nbsp;+&nbsp;Nitro</span>
      </template>

      <UNavigationMenu :items="navItems" />

      <template #right>
        <ColorModeToggle />
        <!-- Rendered client-side once the session resolves; SSR shows nothing to avoid a flash. -->
        <template v-if="!pending">
          <UButton
            v-if="session"
            :label="session.user.name || 'Account'"
            to="/account"
            color="neutral"
            variant="ghost"
            icon="i-lucide-circle-user"
          />
          <UButton v-else label="Sign in" to="/login" color="neutral" variant="subtle" />
        </template>
      </template>

      <template #body>
        <UNavigationMenu :items="navItems" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-8">
        <RouterView />
      </UContainer>
    </UMain>
  </UApp>
</template>
