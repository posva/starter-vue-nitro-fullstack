<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main>
    <h1>Not Found 404</h1>
    <pre>{{ route.params.path }}</pre>
  </main>
</template>
