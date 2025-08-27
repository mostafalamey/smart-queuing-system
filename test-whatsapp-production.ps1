# WhatsApp Production Debug Test
# Run this after deploying the fixes to test WhatsApp functionality

Write-Host "🚀 Starting WhatsApp Production Debug Test" -ForegroundColor Green

# Configuration
$AdminUrl = "https://smart-queue-admin.vercel.app"  # Update with your admin URL
$TestPhone = "201015544028"  # Use your actual WhatsApp Business number for testing

Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "  Admin URL: $AdminUrl" -ForegroundColor Gray
Write-Host "  Test Phone: $TestPhone" -ForegroundColor Gray

# Step 1: Test environment variables
Write-Host "`n🔧 Step 1: Testing Environment Variables..." -ForegroundColor Yellow
try {
    $EnvResponse = Invoke-RestMethod -Uri "$AdminUrl/api/test/env-check" -Method GET
    Write-Host "✅ Environment check completed" -ForegroundColor Green
    
    if ($EnvResponse.WHATSAPP_ENABLED -ne "true") {
        Write-Host "❌ WHATSAPP_ENABLED is not set to 'true'" -ForegroundColor Red
    }
    
    if ($EnvResponse.ULTRAMSG_INSTANCE_ID -eq "❌ MISSING") {
        Write-Host "❌ ULTRAMSG_INSTANCE_ID is missing" -ForegroundColor Red
    }
    
    if ($EnvResponse.ULTRAMSG_TOKEN -eq "❌ MISSING") {
        Write-Host "❌ ULTRAMSG_TOKEN is missing" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Environment check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Test WhatsApp production debug
Write-Host "`n🔍 Step 2: Running WhatsApp Production Debug..." -ForegroundColor Yellow
try {
    $DebugResponse = Invoke-RestMethod -Uri "$AdminUrl/api/test/whatsapp-production-debug?phone=$TestPhone" -Method GET
    Write-Host "✅ Production debug completed" -ForegroundColor Green
    
    Write-Host "📊 Debug Results:" -ForegroundColor Cyan
    Write-Host "  Sessions Found: $($DebugResponse.sessions.count)" -ForegroundColor Gray
    Write-Host "  Recent Tickets: $($DebugResponse.recentTickets.count)" -ForegroundColor Gray
    Write-Host "  Session Service Result: $($DebugResponse.sessions.sessionServiceResult)" -ForegroundColor Gray
    Write-Host "  UltraMessage Status: $($DebugResponse.ultraMessageConnectivity.status)" -ForegroundColor Gray
    
    # Display recommendations
    Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan
    foreach ($rec in $DebugResponse.recommendations) {
        if ($rec.StartsWith("❗")) {
            Write-Host "  $rec" -ForegroundColor Red
        } else {
            Write-Host "  $rec" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "❌ Production debug failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test fixed WhatsApp API
Write-Host "`n📱 Step 3: Testing Fixed WhatsApp API..." -ForegroundColor Yellow
try {
    $TestMessage = "🧪 Test message from production debug script`n`nThis is a test to verify WhatsApp functionality is working.`n`nTimestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
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
