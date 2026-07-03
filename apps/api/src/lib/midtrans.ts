// Klien Midtrans Snap — HTTP langsung, tanpa dependensi. Mode sandbox/production via env.
import { createHash } from 'node:crypto'

function isProduction(): boolean {
  return (process.env['MIDTRANS_MODE'] ?? 'sandbox') === 'production'
}

function snapBaseUrl(): string {
  return isProduction()
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

function serverKey(): string {
  const key = process.env['MIDTRANS_SERVER_KEY']
  if (!key) throw new Error('MIDTRANS_SERVER_KEY harus di-set di .env')
  return key
}

export type SnapParams = {
  orderId: string
  amount: number
  itemName: string
  customerEmail: string
  customerName?: string
  finishUrl: string
}

export type SnapResult = {
  token: string
  redirectUrl: string
}

export async function createSnapTransaction(params: SnapParams): Promise<SnapResult> {
  const auth = Buffer.from(`${serverKey()}:`).toString('base64')

  const res = await fetch(snapBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: { order_id: params.orderId, gross_amount: params.amount },
      item_details: [{ id: 'premium', price: params.amount, quantity: 1, name: params.itemName }],
      customer_details: {
        email: params.customerEmail,
        first_name: params.customerName || params.customerEmail.split('@')[0],
      },
      callbacks: { finish: params.finishUrl },
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Midtrans Snap gagal (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as { token: string; redirect_url: string }
  return { token: data.token, redirectUrl: data.redirect_url }
}

/**
 * Verifikasi signature notifikasi Midtrans.
 * signature_key = SHA512(order_id + status_code + gross_amount + server_key)
 * Wajib dicek — jangan pernah percaya body webhook tanpa verifikasi ini.
 */
export function verifyNotificationSignature(payload: {
  order_id: string
  status_code: string
  gross_amount: string
  signature_key: string
}): boolean {
  const expected = createHash('sha512')
    .update(payload.order_id + payload.status_code + payload.gross_amount + serverKey())
    .digest('hex')
  return expected === payload.signature_key
}
