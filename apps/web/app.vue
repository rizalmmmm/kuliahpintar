<script setup lang="ts">
  const route = useRoute()
  const siteUrl = useRuntimeConfig().public.siteUrl

  // Canonical & og:url per halaman (tanpa query string) — cegah konten ganda di Google
  const urlKanonik = computed(() => `${siteUrl}${route.path}`)

  useHead({
    titleTemplate: (title) => (title ? `${title} — KuliahPintar.id` : 'KuliahPintar.id'),
    htmlAttrs: { lang: 'id' },
    link: [{ rel: 'canonical', href: urlKanonik }],
    meta: [{ property: 'og:url', content: urlKanonik }],
  })
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
