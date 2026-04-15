import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import DropZone from '../components/DropZone'
import UploadProgress from '../components/UploadProgress'
import { uploadFile, type UploadJob } from '../api/upload'

const SOURCES = [
  { value: 'navi', label: 'Navi' },
  { value: 'phonepe', label: 'PhonePe' },
  { value: 'googlepay', label: 'Google Pay' },
]

export default function Upload() {
  const qc = useQueryClient()
  const [source, setSource] = useState('navi')
  const [jobId, setJobId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setJobId(null)
    setUploading(true)
    try {
      const job = await uploadFile(file, source)
      setJobId(job.id)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [source])

  const handleComplete = useCallback((job: UploadJob) => {
    if (job.status === 'completed') {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['byCategory'] })
      qc.invalidateQueries({ queryKey: ['byMonth'] })
      qc.invalidateQueries({ queryKey: ['byDay'] })
      qc.invalidateQueries({ queryKey: ['topMerchants'] })
    }
  }, [qc])

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select App</h3>
        <div className="flex gap-2">
          {SOURCES.map(s => (
            <button
              key={s.value}
              onClick={() => setSource(s.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                source === s.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {!jobId && !uploading && <DropZone onFile={handleFile} />}
      {uploading && <p className="text-sm text-gray-500 text-center">Uploading...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {jobId && <UploadProgress jobId={jobId} onComplete={handleComplete} />}

      {jobId && (
        <button
          onClick={() => { setJobId(null); setError(null) }}
          className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Upload Another File
        </button>
      )}
    </div>
  )
}
