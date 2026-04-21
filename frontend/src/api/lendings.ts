import client from './client'

export interface Lending {
  id: string
  person_name: string
  amount: string
  amount_repaid: string
  amount_outstanding: string
  date: string
  note: string | null
  status: 'outstanding' | 'partial' | 'settled'
  linked_transaction_id: string | null
  created_at: string
  updated_at: string
}

export interface LendingCreate {
  person_name: string
  amount: number
  date: string
  note?: string
}

export interface LendingUpdate {
  person_name?: string
  amount_repaid?: number
  note?: string
}

export const fetchLendings = (status?: string) =>
  client.get<Lending[]>('/lendings', { params: status ? { status } : {} }).then(r => r.data)

export const createLending = (payload: LendingCreate) =>
  client.post<Lending>('/lendings', payload).then(r => r.data)

export const updateLending = (id: string, payload: LendingUpdate) =>
  client.patch<Lending>(`/lendings/${id}`, payload).then(r => r.data)

export const deleteLending = (id: string) =>
  client.delete(`/lendings/${id}`)
