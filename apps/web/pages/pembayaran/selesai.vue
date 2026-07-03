<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Status Pembayaran' })

  const route = useRoute()

  // Status dari callback Snap (onSuccess/onPending) atau redirect finish Midtrans
  const status = computed(() => (route.query.status as string) || 'success')

  const konten = computed(() => {
    switch (status.value) {
      case 'pending':
        return {
          emoji: '⏳',
          judul: 'Menunggu Pembayaran',
          pesan:
            'Pembayaranmu sedang diproses. Premium akan aktif otomatis begitu pembayaran terkonfirmasi. Cek kembali dashboard beberapa saat lagi.',
        }
      case 'error':
        return {
          emoji: '❌',
          judul: 'Pembayaran Gagal',
          pesan: 'Transaksi tidak berhasil diselesaikan. Kamu bisa mencoba lagi kapan saja.',
        }
      default:
        return {
          emoji: '🎉',
          judul: 'Pembayaran Berhasil!',
          pesan:
            'Terima kasih! Premium-mu sedang diaktifkan. Status akan diperbarui otomatis di dashboard dalam beberapa saat.',
        }
    }
  })
</script>

<template>
  <div class="container mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
    <div class="text-6xl">{{ konten.emoji }}</div>
    <h1 class="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{{ konten.judul }}</h1>
    <p class="mt-3 text-gray-600 dark:text-gray-400">{{ konten.pesan }}</p>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row">
      <NuxtLink to="/dashboard" class="btn-primary px-6 py-2.5">Ke Dashboard</NuxtLink>
      <NuxtLink v-if="status === 'error'" to="/harga" class="btn-secondary px-6 py-2.5">
        Coba Lagi
      </NuxtLink>
    </div>
  </div>
</template>
