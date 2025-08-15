import { useCallback } from 'react'
import { logger } from '@/lib/logger'
import { Organization, QRCodeData } from '../shared/types'

export const useQROperations = () => {
  const downloadQR = useCallback((qrCodeUrl: string, organization: Organization | null) => {
    const link = document.createElement('a')
    link.download = `${organization?.name || 'organization'}-qr-code.png`
    link.href = qrCodeUrl
    link.click()
  }, [])

  const copyQRUrl = useCallback(async (
    userProfile: any,
    showSuccess: (title: string, message: string, action?: any) => void
  ) => {
    if (!userProfile?.organization_id) return;
    
    const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
    const url = `${customerUrl}?org=${userProfile.organization_id}`
    await navigator.clipboard.writeText(url)
    
    showSuccess(
      'URL Copied!',
      'Customer queue URL has been copied to your clipboard.',
      {
        label: 'Test URL',
        onClick: () => window.open(url, '_blank')
      }
    )
  }, [])

  const downloadBranchQR = useCallback((
    branchId: string,
    branchName: string,
    branchQrCodes: QRCodeData,
    showError: (title: string, message: string) => void,
    showSuccess: (title: string, message: string) => void
  ) => {
    const qrCode = branchQrCodes[branchId]
    if (!qrCode) {
      showError('Download Failed', 'QR code not available. Please generate it first.')
      return
    }
    
    const link = document.createElement('a')
    link.download = `${branchName}-qr-code.png`
    link.href = qrCode
    link.click()
    
    showSuccess(
      'QR Code Downloaded!',
      `${branchName} QR code has been saved to your device.`
    )
  }, [])

  const copyBranchQRUrl = useCallback(async (
    branchId: string,
    branchName: string | undefined,
    userProfile: any,
    showSuccess: (title: string, message: string, action?: any) => void,
    showError: (title: string, message: string) => void
  ) => {
    if (!userProfile?.organization_id) return;
    
    try {
      const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
      const url = `${customerUrl}?org=${userProfile.organization_id}&branch=${branchId}`
      await navigator.clipboard.writeText(url)
      
      showSuccess(
        'Branch URL Copied!',
        `${branchName || 'Branch'} queue URL has been copied to your clipboard.`,
        {
          label: 'Test URL',
          onClick: () => window.open(url, '_blank')
        }
      )
    } catch (error) {
      showError('Copy Failed', 'Unable to copy URL to clipboard.')
    }
  }, [])

  const printBranchQR = useCallback((
    branchId: string,
    branchName: string,
    branchQrCodes: QRCodeData,
    organization: Organization | null,
    userProfile: any,
    showError: (title: string, message: string) => void,
    showSuccess: (title: string, message: string) => void
  ) => {
    const qrCode = branchQrCodes[branchId]
    if (!qrCode) {
      showError('Print Failed', 'QR code not available. Please generate it first.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showError('Print Failed', 'Unable to open print window. Please check your browser settings.')
      return
    }

    const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
    const url = `${customerUrl}?org=${userProfile?.organization_id}&branch=${branchId}`

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${branchName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
            }
            .org-name {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .branch-name {
              font-size: 20px;
              color: #374151;
              margin-bottom: 20px;
            }
            .qr-code {
              margin: 20px 0;
              border: 1px solid #d1d5db;
              border-radius: 4px;
            }
            .instructions {
              font-size: 16px;
              color: #6b7280;
              margin-top: 20px;
              line-height: 1.5;
            }
            .url {
              font-size: 12px;
              color: #9ca3af;
              word-break: break-all;
              margin-top: 15px;
              padding: 10px;
              background: #f9fafb;
              border-radius: 4px;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="org-name">${organization?.name || 'Organization'}</div>
            <div class="branch-name">${branchName} Branch</div>
            <img src="${qrCode}" alt="QR Code for ${branchName}" class="qr-code" />
            <div class="instructions">
              Scan this QR code with your phone to join the queue at ${branchName}
            </div>
            <div class="url">${url}</div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    
    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 1000)

    showSuccess(
      'Print Dialog Opened!',
      `${branchName} QR code is ready for printing.`
    )
  }, [])

  const refreshBranchQR = useCallback(async (
    branchId: string,
    branchName: string,
    userProfile: any,
    organization: Organization | null,
    setBranchQrCodes: React.Dispatch<React.SetStateAction<QRCodeData>>,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void
  ) => {
    if (!userProfile?.organization_id || !organization?.name) {
      showError('Refresh Failed', 'Missing organization data. Please try again.')
      return
    }

    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: userProfile.organization_id,
          branchId: branchId,
          organizationName: organization.name
        })
      })

      const data = await response.json()
      if (data.success) {
        setBranchQrCodes(prev => ({
          ...prev,
          [branchId]: data.qrCodeDataURL
        }))
        showSuccess(
          'QR Code Refreshed!',
          `${branchName} QR code has been regenerated successfully.`
        )
      } else {
        showError('Refresh Failed', 'Unable to generate QR code. Please try again.')
      }
    } catch (error) {
      logger.error('Error refreshing branch QR code:', error)
      showError('Refresh Failed', 'An error occurred while refreshing the QR code.')
    }
  }, [])

  const downloadDepartmentQR = useCallback((
    departmentId: string,
    departmentName: string,
    departmentQrCodes: QRCodeData,
    showError: (title: string, message: string) => void,
    showSuccess: (title: string, message: string) => void
  ) => {
    const qrCode = departmentQrCodes[departmentId]
    if (!qrCode) {
      showError('Download Failed', 'QR code not available. Please generate it first.')
      return
    }
    
    const link = document.createElement('a')
    link.download = `${departmentName}-department-qr-code.png`
    link.href = qrCode
    link.click()
    
    showSuccess(
      'QR Code Downloaded!',
      `${departmentName} department QR code has been saved to your device.`
    )
  }, [])

  const copyDepartmentQRUrl = useCallback(async (
    departmentId: string,
    departmentName: string | undefined,
    branchId: string | undefined,
    userProfile: any,
    showSuccess: (title: string, message: string, action?: any) => void,
    showError: (title: string, message: string) => void
  ) => {
    if (!userProfile?.organization_id) return;
    
    try {
      const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
      const url = `${customerUrl}?org=${userProfile.organization_id}&branch=${branchId}&department=${departmentId}`
      await navigator.clipboard.writeText(url)
      
      showSuccess(
        'Department URL Copied!',
        `${departmentName || 'Department'} queue URL has been copied to your clipboard.`,
        {
          label: 'Test URL',
          onClick: () => window.open(url, '_blank')
        }
      )
    } catch (error) {
      showError('Copy Failed', 'Unable to copy URL to clipboard.')
    }
  }, [])

  const printDepartmentQR = useCallback((
    departmentId: string,
    departmentName: string,
    branchId: string,
    departmentQrCodes: QRCodeData,
    organization: Organization | null,
    userProfile: any,
    showError: (title: string, message: string) => void,
    showInfo: (title: string, message: string) => void
  ) => {
    const qrCode = departmentQrCodes[departmentId]
    if (!qrCode) {
      showError('Print Failed', 'QR code not available. Please generate it first.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showError('Print Failed', 'Unable to open print window. Please check your browser settings.')
      return
    }

    const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
    const url = `${customerUrl}?org=${userProfile?.organization_id}&branch=${branchId}&department=${departmentId}`

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Department QR Code - ${departmentName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              background: white;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #333;
            }
            .logo { max-width: 100px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
            h2 { color: #666; margin-bottom: 20px; font-size: 18px; }
            .qr-code { margin: 20px 0; }
            .instructions { 
              margin-top: 20px; 
              font-size: 14px; 
              color: #666;
              line-height: 1.4;
            }
            .url { 
              font-size: 10px; 
              color: #999; 
              word-break: break-all; 
              margin-top: 10px;
              padding: 10px;
              background: #f5f5f5;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 1px solid #333; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${organization?.logo_url ? `<img src="${organization.logo_url}" alt="Logo" class="logo" />` : ''}
            <h1>${organization?.name || 'Organization'}</h1>
            <h2>${departmentName} Department</h2>
            <div class="qr-code">
              <img src="${qrCode}" alt="Department QR Code" style="max-width: 250px;" />
            </div>
            <div class="instructions">
              <strong>How to Join the Queue:</strong><br>
              1. Scan this QR code with your phone<br>
              2. Enter your phone number<br>
              3. Get your queue ticket instantly<br>
              4. Receive SMS updates on your turn
            </div>
            <div class="url">${url}</div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
    
    showInfo(
      'Print Dialog Opened',
      `${departmentName} department QR code is ready to print.`
    )
  }, [])

  const refreshDepartmentQR = useCallback(async (
    departmentId: string,
    departmentName: string,
    branchId: string,
    userProfile: any,
    organization: Organization | null,
    setDepartmentQrCodes: React.Dispatch<React.SetStateAction<QRCodeData>>,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void
  ) => {
    if (!userProfile?.organization_id || !organization?.name) {
      showError('Refresh Failed', 'Missing organization data. Please try again.')
      return
    }

    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: userProfile.organization_id,
          branchId: branchId,
          departmentId: departmentId,
          organizationName: organization.name,
          departmentName: departmentName
        })
      })

      const data = await response.json()
      if (data.success) {
        setDepartmentQrCodes(prev => ({
          ...prev,
          [departmentId]: data.qrCodeDataURL
        }))
        showSuccess(
          'QR Code Refreshed!',
          `${departmentName} department QR code has been regenerated successfully.`
        )
      } else {
        showError('Refresh Failed', 'Unable to generate QR code. Please try again.')
      }
    } catch (error) {
      logger.error('Error refreshing department QR code:', error)
      showError('Refresh Failed', 'An error occurred while refreshing the QR code.')
    }
  }, [])

  return {
    downloadQR,
    copyQRUrl,
    downloadBranchQR,
    copyBranchQRUrl,
    printBranchQR,
    refreshBranchQR,
    downloadDepartmentQR,
    copyDepartmentQRUrl,
    printDepartmentQR,
    refreshDepartmentQR
  }
}
