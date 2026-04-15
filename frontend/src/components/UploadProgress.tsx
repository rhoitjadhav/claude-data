import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { fetchJob, type UploadJob } from '../api/upload'

interface Props { jobId: string; onComplete: (job: UploadJob) => void }

export default function UploadProgress({ jobId, onComplete }: Props) {
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === 'completed' || status === 'failed' ? false : 1500
    },
  })

  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed') onComplete(job)
  }, [job, onComplete])

  if (!job) return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader size={14} className="animate-spin" /> Starting...</div>

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-2">
        {job.status === 'completed' && <CheckCircle size={18} className="text-green-500" />}
        {job.status === 'failed' && <XCircle size={18} className="text-red-500" />}
        {(job.status === 'pending' || job.status === 'processing') && <Loader size={18} className="animate-spin text-brand-500" />}
        <span className="text-sm font-medium capitalize">{job.status}</span>
      </div>
      {job.status === 'completed' && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>Parsed: <strong>{job.total_parsed}</strong> rows</p>
          <p>Saved: <strong>{job.total_saved}</strong> transactions</p>
          <p>Skipped: <strong>{(job.total_parsed ?? 0) - (job.total_saved ?? 0)}</strong> (filtered out)</p>
        </div>
      )}
      {job.status === 'failed' && (
        <p className="text-sm text-red-600">{job.error}</p>
      )}
    </div>
  )
}
