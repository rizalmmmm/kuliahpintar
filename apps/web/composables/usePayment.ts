// Composable pembayaran Midtrans Snap — muat script, buat transaksi, buka popup
import type { CreatePaymentResponse } from '@kuliahpintar/shared'

type SnapCallbacks = {
  onSuccess?: (result: unknown) => void
  onPending?: (result: unknown) => void
  onError?: (result: unknown) => void
  onClose?: () => void
}

type SnapGlobal = { pay: (token: string, cb: SnapCallbacks) => void }

export function usePayment() {
  const api = useApi()
  const config = useRuntimeConfig()

  function loadSnapScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const w = window as unknown as { snap?: SnapGlobal }
      if (w.snap) return resolve()

      const clientKey = config.public.midtransClientKey as string
      if (!clientKey) return reject(new Error('Konfigurasi pembayaran belum lengkap'))

      // SB- prefix menandakan Sandbox
      const src = clientKey.startsWith('SB-')
        ? 'https://app.sandbox.midtrans.com/snap/snap.js'
        : 'https://app.midtrans.com/snap/snap.js'

      const script = document.createElement('script')
      script.src = src
      script.setAttribute('data-client-key', clientKey)
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Gagal memuat Midtrans'))
      document.head.appendChild(script)
    })
  }

  async function upgradeToPremium(callbacks?: SnapCallbacks): Promise<void> {
    // Buat transaksi di backend (endpoint auth) → dapat Snap token
    const res = await api.post<{ data: CreatePaymentResponse }>('/api/v1/payment/create', {})
    await loadSnapScript()

    const w = window as unknown as { snap: SnapGlobal }
    w.snap.pay(res.data.token, {
      onSuccess: callbacks?.onSuccess,
      onPending: callbacks?.onPending,
      onError: callbacks?.onError,
      onClose: callbacks?.onClose,
    })
  }

  return { upgradeToPremium }
}
