# WhatsApp Production Debug Test Script
# This script tests the WhatsApp notification functionality in production

param(
    [string]$TestPhone = "201015544028",  # Default test phone number
    [string]$AdminUrl = "https://smart-queue-admin.vercel.app"
)

Write-Host "🧪 WhatsApp Production Debug Test" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host "Test Phone: $TestPhone" -ForegroundColor Gray
Write-Host "Admin URL: $AdminUrl" -ForegroundColor Gray
Write-Host ""

# Step 1: Check if endpoints are accessible
Write-Host "🌐 Step 1: Checking endpoint accessibility..." -ForegroundColor Yellow
try {
    $HealthCheck = Invoke-RestMethod -Uri "$AdminUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Admin app is accessible" -ForegroundColor Green
}
catch {
    Write-Host "❌ Admin app is not accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check that the Vercel deployment is complete." -ForegroundColor Yellow
    exit 1
}

# Step 2: Run production debug
Write-Host "`n🔍 Step 2: Running Production Debug..." -ForegroundColor Yellow
try {
    $DebugUrl = "$AdminUrl/api/test/whatsapp-production-debug?phone=$TestPhone"
    $DebugResponse = Invoke-RestMethod -Uri $DebugUrl -Method GET -TimeoutSec 30
    
    Write-Host "📊 Debug Results:" -ForegroundColor Cyan
    Write-Host "  Environment Check: $($DebugResponse.environmentCheck.status)" -ForegroundColor Green
    Write-Host "  Session Check: $($DebugResponse.sessionCheck.status)" -ForegroundColor Green
    Write-Host "  API Test: $($DebugResponse.apiTest.status)" -ForegroundColor Green
    
    if ($DebugResponse.recommendations) {
        Write-Host "`n📋 Recommendations:" -ForegroundColor Yellow
        foreach ($rec in $DebugResponse.recommendations) {
            if ($rec.StartsWith("❗")) {
                Write-Host "  $rec" -ForegroundColor Red
            } else {
                Write-Host "  $rec" -ForegroundColor Green
            }
        }
    }
}
catch {
    Write-Host "❌ Production debug failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test fixed WhatsApp API
Write-Host "`n📱 Step 3: Testing Fixed WhatsApp API..." -ForegroundColor Yellow
try {
    $Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $TestMessage = "🧪 Test message from production debug script" + "`n`n" + "This is a test to verify WhatsApp functionality is working." + "`n`n" + "Timestamp: $Timestamp"
    
    $WhatsAppBody = @{
        phone = $TestPhone
        message = $TestMessage
        organizationId = "test-org-id"
        ticketId = "test-ticket-$(Get-Random)"
        notificationType = "your_turn"
        bypassSessionCheck = $true  # Bypass session check for testing
    } | ConvertTo-Json
    
    $WhatsAppResponse = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/whatsapp-fixed" -Method POST -Body $WhatsAppBody -ContentType "application/json"
    
    if ($WhatsAppResponse.success) {
        Write-Host "✅ WhatsApp test message sent successfully!" -ForegroundColor Green
        Write-Host "  Message ID: $($WhatsAppResponse.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "❌ WhatsApp test message failed: $($WhatsAppResponse.message)" -ForegroundColor Red
        Write-Host "  Reason: $($WhatsAppResponse.reason)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "❌ WhatsApp API test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $ErrorResponse = $_.Exception.Response.GetResponseStream()
        $Reader = New-Object System.IO.StreamReader($ErrorResponse)
        $ResponseBody = $Reader.ReadToEnd()
        Write-Host "  Response: $ResponseBody" -ForegroundColor Gray
    }
}

Write-Host "`n🏁 Debug test completed!" -ForegroundColor Green
Write-Host "If the test shows issues, check the Vercel logs for more details." -ForegroundColor Cyan
