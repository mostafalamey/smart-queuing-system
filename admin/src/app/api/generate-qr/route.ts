import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    const { organizationId, branchId, organizationName } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Construct the customer app URL with organization and branch parameters
    const baseUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
    
    const qrUrl = new URL(baseUrl)
    qrUrl.searchParams.set('org', organizationId)
    
    if (branchId) {
      qrUrl.searchParams.set('branch', branchId)
    }

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl.toString(), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    return NextResponse.json({ 
      success: true, 
      qrCodeDataURL,
      url: qrUrl.toString(),
      description: branchId 
        ? `QR Code for ${organizationName} - Specific Branch`
        : `QR Code for ${organizationName} - All Branches`
    })

  } catch (error) {
    console.error('QR Code generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
