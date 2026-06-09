// Tipe standar untuk API responses — dipakai di frontend dan backend
export type ApiResponse<T> = {
  data: T
  meta?: ApiMeta
}

export type ApiError = {
  error: string
  code?: string
  details?: Record<string, string[]>
}

export type ApiMeta = {
  page?: number
  perPage?: number
  total?: number
  totalPages?: number
}

export type PaginationParams = {
  page?: number
  perPage?: number
}
