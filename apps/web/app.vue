<script setup lang="ts">
  useHead({
    titleTemplate: (title) => (title ? `${title} — KuliahPintar.id` : 'KuliahPintar.id'),
    htmlAttrs: { lang: 'id' },
  })
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
