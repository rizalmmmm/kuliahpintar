// Composable untuk HTTP request ke KuliahPintar API dengan auth token otomatis
export function useApi() {
  const config = useRuntimeConfig()
  const supabase = useSupabaseClient()

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()

    const res = await fetch(`${config.public.apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }

    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}
