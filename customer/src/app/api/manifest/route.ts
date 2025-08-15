// Dynamic Manifest Generator for PWA
// Handles org/branch parameters and organization branding

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Note: Server-side routes can't use the client-side logger, 
// so we keep console.error for server-side error logging

// Initialize Supabase client for server-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('org')
  const branchId = searchParams.get('branch')

  // Base manifest configuration
  const manifest = {
    name: "Smart Queue - Customer App",
    short_name: "Smart Queue",
    description: "Join digital queues and get notified when it's your turn",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    scope: "/",
    categories: [
      "business",
      "productivity",
      "utilities"
    ],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      },
      {
        src: "/logo_s.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/logo_s.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ],
    shortcuts: [
      {
        name: "Join Queue",
        short_name: "Join",
        description: "Join a queue using QR code",
        url: "/",
        icons: [
          {
            src: "/logo_s.png",
            sizes: "192x192",
            type: "image/png"
          }
        ]
      }
    ]
  }

  // If org parameter is provided, customize the manifest with organization data
  if (orgId) {
    try {
      // Fetch organization data
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('name, logo_url, primary_color')
        .eq('id', orgId)
        .single()

      if (!error && organization) {
        // Update app name with organization name - format: "{Organization Name} Customer App"
        manifest.name = `${organization.name} Customer App`
        manifest.short_name = `${organization.name}`

        // Update theme color if organization has one
        if (organization.primary_color) {
          manifest.theme_color = organization.primary_color
        }

        // Use organization logo if available
        if (organization.logo_url) {
          // Detect image type from URL
          const logoUrl = organization.logo_url
          let logoType = "image/png" // default
          if (logoUrl.includes('.svg')) {
            logoType = "image/svg+xml"
          } else if (logoUrl.includes('.jpg') || logoUrl.includes('.jpeg')) {
            logoType = "image/jpeg"
          } else if (logoUrl.includes('.webp')) {
            logoType = "image/webp"
          }

          // Replace ALL icons with organization logo (remove favicon to prevent conflicts)
          manifest.icons = [
            {
              src: logoUrl,
              sizes: "192x192",
              type: logoType,
              purpose: "any"
            },
            {
              src: logoUrl,
              sizes: "512x512", 
              type: logoType,
              purpose: "any"
            },
            {
              src: logoUrl,
              sizes: "any",
              type: logoType,
              purpose: "maskable"
            }
          ]

          // Update shortcut icon
          manifest.shortcuts[0].icons = [
            {
              src: organization.logo_url,
              sizes: "192x192",
              type: logoType
            }
          ]
        }
      }
    } catch (error) {
      console.error('Error fetching organization data for manifest:', error)
      // Continue with default manifest if organization fetch fails
    }

    // Set start_url with parameters
    let startUrl = `/?org=${orgId}`
    if (branchId) {
      startUrl += `&branch=${branchId}`
    }
    manifest.start_url = startUrl
    
    // Update shortcuts to include org context
    manifest.shortcuts[0].url = startUrl
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300', // Reduced cache to 5 minutes for testing
      'X-Organization-ID': orgId || 'default',
      'X-Manifest-Generated': new Date().toISOString()
    }
  })
}
