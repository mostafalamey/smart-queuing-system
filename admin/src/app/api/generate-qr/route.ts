import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  try {
    let requestBody;
    try {
      requestBody = await request.json()
    } catch (jsonError) {
      console.error('QR Code generation JSON parse error:', jsonError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { organizationId, branchId, departmentId, organizationName, departmentName } = requestBody

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Construct the customer app URL with organization, branch, and department parameters
    const baseUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
    
    const qrUrl = new URL(baseUrl)
    qrUrl.searchParams.set('org', organizationId)
    
    if (branchId) {
      qrUrl.searchParams.set('branch', branchId)
    }
    
    if (departmentId) {
      qrUrl.searchParams.set('department', departmentId)
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

    let description = `QR Code for ${organizationName}`
    if (departmentId && departmentName) {
      description += ` - ${departmentName} Department`
    } else if (branchId) {
      description += ` - Specific Branch`
    } else {
      description += ` - All Branches`
    }

    return NextResponse.json({ 
      success: true, 
      qrCodeDataURL,
      url: qrUrl.toString(),
      description
    })

  } catch (error) {
    console.error('QR Code generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
