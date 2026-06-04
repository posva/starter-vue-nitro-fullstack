<script lang="ts" setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main>
    <h1>Product {{ route.params.productId }}</h1>
    <div class="card">
      <p>This is a simple Vue Router demo app built with Vite Plugin Fullstack.</p>
      <p>It demonstrates basic routing and server-side rendering.</p>
    </div>
  </main>
</template>
