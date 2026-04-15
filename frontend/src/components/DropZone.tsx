import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  onFile: (file: File) => void
}

export default function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') onFile(file)
  }, [onFile])

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
      )}
    >
      <Upload size={32} className="text-gray-400 mb-3" />
      <p className="text-sm font-medium text-gray-700">Drop your PDF here</p>
      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </label>
  )
}
