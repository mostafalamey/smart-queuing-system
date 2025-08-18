// Handle Supabase auth callbacks
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  console.log('=== AUTH CALLBACK ===')
  console.log('Full URL:', requestUrl.href)
  console.log('Search params:', requestUrl.searchParams.toString())
  
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  
  console.log('Auth callback params:', { code, token_hash, type })

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Handle cookie setting for server-side
          },
          remove(name: string, options: any) {
            // Handle cookie removal for server-side
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      console.log('Code exchange result:', { data: !!data, error })
      
      if (!error && data.user) {
        console.log('User authenticated:', data.user.email)
        console.log('User metadata:', data.user.user_metadata)
        
        // Redirect to accept-invitation page with success
        return NextResponse.redirect(new URL('/accept-invitation?auth=success', requestUrl.origin))
      }
    } catch (err) {
      console.error('Code exchange error:', err)
    }
  }

  // If we get here, something went wrong or it's a different type of callback
  console.log('Redirecting to accept-invitation for manual handling')
  return NextResponse.redirect(new URL('/accept-invitation', requestUrl.origin))
}
