# WhatsApp Production Test
param(
    [string]$TestPhone = "201015544028",
    [string]$AdminUrl = "https://smart-queue-admin.vercel.app"
)

Write-Host "WhatsApp Production Debug Test" -ForegroundColor Blue
Write-Host "Test Phone: $TestPhone"
Write-Host "Admin URL: $AdminUrl"
Write-Host ""

# Test endpoint accessibility
Write-Host "Step 1: Checking endpoint..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$AdminUrl/api/health" -Method GET -TimeoutSec 10 | Out-Null
    Write-Host "Admin app is accessible" -ForegroundColor Green
}
catch {
    Write-Host "Admin app not accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test WhatsApp API
Write-Host "Step 2: Testing WhatsApp API..." -ForegroundColor Yellow
try {
    $TestMessage = "Test message from debug script - " + (Get-Date -Format 'HH:mm:ss')
    
    $Body = @{
        phone = $TestPhone
        message = $TestMessage
        organizationId = "test-org"
        bypassSessionCheck = $true
    } | ConvertTo-Json
    
    $Response = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/whatsapp-fixed" -Method POST -Body $Body -ContentType "application/json"
    
    if ($Response.success) {
        Write-Host "WhatsApp test message sent successfully!" -ForegroundColor Green
        Write-Host "Message ID: $($Response.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "WhatsApp test failed: $($Response.message)" -ForegroundColor Red
        Write-Host "Error details: $($Response.reason)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "WhatsApp API test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Gray
    }
}

Write-Host "Test completed!" -ForegroundColor Green
