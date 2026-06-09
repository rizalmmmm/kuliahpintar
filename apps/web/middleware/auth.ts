// Guard untuk halaman yang membutuhkan login
export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/login')
  }
})
