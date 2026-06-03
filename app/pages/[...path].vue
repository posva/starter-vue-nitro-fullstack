<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
route.name === '/'
</script>

<template>
  <main>
    <h1>Not Found 404</h1>
  </main>
</template>
