import { useEffect, useState } from 'react'

export function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => window.innerWidth < bp)
  useEffect(() => {
    const fn = () => setV(window.innerWidth < bp)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return v
}
