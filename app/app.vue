<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { useAuth } from './lib/use-auth'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import './styles.css'
import './assets/css/main.css'

const { session, pending } = useAuth()
</script>

<template>
  <SpeedInsights />

  <!-- Pinia Colada data-fetching devtools; auto-stripped from production builds. -->
  <PiniaColadaDevtools />

  <nav>
    <ul>
      <li>
        <RouterLink to="/" exact-active-class="active">Home</RouterLink>
      </li>
      <li>
        <RouterLink to="/producs/254" active-class="active" v-slot="{ href }">{{
          href
        }}</RouterLink>
      </li>
      <li>
        <RouterLink to="/todos" active-class="active">Todos</RouterLink>
      </li>
      <li>
        <RouterLink to="/about" active-class="active">About</RouterLink>
      </li>
      <li class="spacer" />
      <!-- Rendered client-side once the session resolves; SSR shows nothing to avoid a flash. -->
      <template v-if="!pending">
        <li v-if="session">
          <RouterLink to="/account" active-class="active">{{
            session.user.name || 'Account'
          }}</RouterLink>
        </li>
        <li v-else>
          <RouterLink to="/login" active-class="active">Sign in</RouterLink>
        </li>
      </template>
    </ul>
  </nav>
  <RouterView />
</template>

<!-- Nav styling lives in the global theme (styles.css) so the shell is themeable too. -->
