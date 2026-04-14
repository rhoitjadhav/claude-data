import client from './client'

export interface UploadJob {
  id: string
  filename: string
  source: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error: string | null
  total_parsed: number | null
  total_saved: number | null
  created_at: string
}

export async function uploadFile(file: File, source: string): Promise<UploadJob> {
  const form = new FormData()
  form.append('file', file)
  form.append('source', source)
  const { data } = await client.post<UploadJob>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchJob(jobId: string): Promise<UploadJob> {
  const { data } = await client.get<UploadJob>(`/jobs/${jobId}`)
  return data
}
