<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { useAuth } from './lib/use-auth'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import ThemeControls from './components/ThemeControls.vue'
import './assets/css/main.css'

const { session, pending } = useAuth()

const links = [
  { to: '/', label: 'Home', exact: true },
  { to: '/producs/254', label: 'Products' },
  { to: '/todos', label: 'Todos' },
  { to: '/about', label: 'About' },
]
</script>

<template>
  <SpeedInsights />

  <!-- Pinia Colada data-fetching devtools; auto-stripped from production builds. -->
  <PiniaColadaDevtools />

  <nav
    class="sticky top-0 z-50 border-b border-border bg-surface/70 backdrop-blur-xl backdrop-saturate-150"
  >
    <div class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
      <RouterLink
        to="/"
        class="group flex items-center gap-2 font-semibold tracking-tight text-text hover:text-text"
      >
        <span
          class="size-6 rounded-lg bg-primary bg-linear-to-b from-white/30 shadow-sm transition-transform group-hover:scale-105"
        />
        <span>Starter</span>
      </RouterLink>

      <ul class="hidden items-center gap-1 sm:flex">
        <li v-for="link in links" :key="link.to">
          <RouterLink
            :to="link.to"
            :exact-active-class="link.exact ? 'text-primary' : undefined"
            :active-class="link.exact ? undefined : 'text-primary'"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            {{ link.label }}
          </RouterLink>
        </li>
      </ul>

      <div class="ml-auto flex items-center gap-3">
        <ThemeControls />

        <!-- Rendered client-side once the session resolves; SSR shows nothing to avoid a flash. -->
        <template v-if="!pending">
          <RouterLink
            v-if="session"
            to="/account"
            active-class="text-primary"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            {{ session.user.name || 'Account' }}
          </RouterLink>
          <RouterLink v-else to="/login" class="button px-3.5 py-1.5 text-sm"> Sign in </RouterLink>
        </template>
      </div>
    </div>
  </nav>

  <RouterView />
</template>
