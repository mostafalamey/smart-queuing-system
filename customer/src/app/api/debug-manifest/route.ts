// Manifest Debug Page
// Helps debug manifest generation and PWA installation issues

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('org')
  const branchId = searchParams.get('branch')

  // Build manifest URL
  let manifestUrl = '/api/manifest'
  if (orgId) {
    manifestUrl += `?org=${orgId}`
    if (branchId) {
      manifestUrl += `&branch=${branchId}`
    }
  }

  // Fetch the manifest
  const baseUrl = request.nextUrl.origin
  const manifestResponse = await fetch(`${baseUrl}${manifestUrl}`)
  const manifest = await manifestResponse.json()

  // Debug info
  const debugInfo = {
    timestamp: new Date().toISOString(),
    requestUrl: request.url,
    manifestUrl: `${baseUrl}${manifestUrl}`,
    parameters: {
      orgId,
      branchId
    },
    manifest,
    manifestHeaders: Object.fromEntries(manifestResponse.headers.entries())
  }

  // Return HTML page with debug info
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PWA Manifest Debug</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
        .success { color: green; font-weight: bold; }
        .error { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>PWA Manifest Debug Tool</h1>
      
      <div class="section">
        <h2>Test Parameters</h2>
        <p><strong>Organization ID:</strong> ${orgId || 'Not provided'}</p>
        <p><strong>Branch ID:</strong> ${branchId || 'Not provided'}</p>
        <p><strong>Manifest URL:</strong> <a href="${manifestUrl}" target="_blank">${manifestUrl}</a></p>
      </div>

      <div class="section">
        <h2>Manifest Content</h2>
        <p><strong>App Name:</strong> <span class="${manifest.name?.includes('Customer App') ? 'success' : 'warning'}">${manifest.name}</span></p>
        <p><strong>Short Name:</strong> ${manifest.short_name}</p>
        <p><strong>Start URL:</strong> ${manifest.start_url}</p>
        <p><strong>Theme Color:</strong> <span style="background: ${manifest.theme_color}; padding: 2px 8px; color: white;">${manifest.theme_color}</span></p>
        
        <h3>Icons</h3>
        ${manifest.icons?.map((icon: any, index: number) => `
          <div style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 3px;">
            <p><strong>Icon ${index + 1}:</strong></p>
            <p>Source: <a href="${icon.src}" target="_blank">${icon.src}</a></p>
            <p>Sizes: ${icon.sizes}</p>
            <p>Type: ${icon.type}</p>
            ${icon.src.startsWith('http') ? `<img src="${icon.src}" style="max-width: 64px; max-height: 64px;" alt="Icon preview" />` : ''}
          </div>
        `).join('') || '<p class="error">No icons found</p>'}
      </div>

      <div class="section">
        <h2>Installation Test</h2>
        <p>To test PWA installation:</p>
        <ol>
          <li>Go to: <a href="/?org=${orgId}${branchId ? `&branch=${branchId}` : ''}" target="_blank">Customer App with Parameters</a></li>
          <li>Open browser DevTools (F12)</li>
          <li>Go to Application tab → Manifest</li>
          <li>Check that manifest URL includes parameters</li>
          <li>Verify app name and icons are correct</li>
          <li>Try installing the PWA</li>
        </ol>
      </div>

      <div class="section">
        <h2>Raw Debug Data</h2>
        <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      <div class="section">
        <h2>Quick Actions</h2>
        <p><a href="/api/debug-manifest" target="_blank">Debug Default Manifest</a></p>
        <p><a href="/api/debug-manifest?org=test-org" target="_blank">Debug Test Organization</a></p>
        <p><a href="/" target="_blank">Customer App (No Parameters)</a></p>
      </div>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    }
  })
}
