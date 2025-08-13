'use client'

import { useEffect, useRef } from 'react'

interface ColorPreviewProps {
  color: string
  className?: string
}

export function ColorPreview({ color, className = '' }: ColorPreviewProps) {
  const divRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (divRef.current) {
      divRef.current.style.backgroundColor = color
    }
  }, [color])

  return (
    <div 
      ref={divRef}
      className={`w-12 h-12 rounded-lg border-2 border-gray-300 ${className}`}
    />
  )
}
