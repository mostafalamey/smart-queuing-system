// Dynamic Manifest Link Component
// Updates manifest href based on URL parameters for PWA installation

'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export function DynamicManifest() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const orgId = searchParams.get('org')
    const branchId = searchParams.get('branch')

    // Remove any existing manifest links to avoid conflicts
    const existingLinks = document.querySelectorAll('link[rel="manifest"]')
    existingLinks.forEach(link => link.remove())

    // Create new manifest link
    const manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    
    // Build manifest URL with parameters
    let manifestUrl = '/api/manifest'
    if (orgId) {
      manifestUrl += `?org=${orgId}`
      if (branchId) {
        manifestUrl += `&branch=${branchId}`
      }
      // Add cache busting for organization-specific manifests to ensure fresh data
      manifestUrl += `&v=${Math.floor(Date.now() / 300000)}` // Changes every 5 minutes
    }

    manifestLink.href = manifestUrl
    
    // Add to document head
    document.head.appendChild(manifestLink)
    
    logger.log('Dynamic manifest set:', manifestUrl)

    // Also dispatch a custom event to notify any install prompts to refresh
    window.dispatchEvent(new CustomEvent('manifestUpdated', { 
      detail: { manifestUrl, orgId, branchId }
    }))

  }, [searchParams])

  return null // This component doesn't render anything
}

export default DynamicManifest
