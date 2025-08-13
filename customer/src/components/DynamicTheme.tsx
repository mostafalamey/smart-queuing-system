'use client'

import { useEffect } from 'react'

interface DynamicThemeProps {
  brandColor: string
  children: React.ReactNode
}

export function DynamicTheme({ brandColor, children }: DynamicThemeProps) {
  useEffect(() => {
    // Set CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--brand-color', brandColor)
    
    // Calculate a darker version for hover states
    const color = brandColor.replace('#', '')
    const r = parseInt(color.substr(0, 2), 16)
    const g = parseInt(color.substr(2, 2), 16)
    const b = parseInt(color.substr(4, 2), 16)
    
    // Darken the color by reducing RGB values
    const darkerR = Math.max(0, r - 30)
    const darkerG = Math.max(0, g - 30)
    const darkerB = Math.max(0, b - 30)
    
    const darkerColor = `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`
    document.documentElement.style.setProperty('--brand-color-dark', darkerColor)
  }, [brandColor])

  return <div className="dynamic-bg min-h-screen">{children}</div>
}
