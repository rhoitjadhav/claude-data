import client from './client'

export interface Transaction {
  id: string
  source: string
  date: string
  description: string
  merchant: string
  amount: string
  category: string
  account: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
}

export interface TransactionFilters {
  category?: string
  start?: string
  end?: string
  search?: string
  limit?: number
  offset?: number
}

export interface TransactionCreate {
  date: string
  description: string
  amount: number
  category?: string
  note?: string
  account?: string
}

export async function createTransaction(payload: TransactionCreate): Promise<Transaction> {
  const { data } = await client.post('/transactions', payload)
  return data
}

export async function fetchTransactions(filters: TransactionFilters): Promise<TransactionListResponse> {
  const { data } = await client.get('/transactions', { params: filters })
  return data
}

export async function updateTransaction(id: string, payload: { category?: string; note?: string }): Promise<Transaction> {
  const { data } = await client.patch(`/transactions/${id}`, payload)
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  await client.delete(`/transactions/${id}`)
}

export function buildExportUrl(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.start) params.set('start', filters.start)
  if (filters.end) params.set('end', filters.end)
  if (filters.search) params.set('search', filters.search)
  return `/api/v1/export/csv?${params.toString()}`
}
