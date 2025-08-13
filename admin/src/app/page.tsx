'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [user, loading, router])

  // Show loading state
  return <LoadingSpinner message="Redirecting..." />
}
