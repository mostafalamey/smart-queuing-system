# WhatsApp Production Debug Test Script
param(
    [string]$TestPhone = "201015544028",
    [string]$AdminUrl = "https://smart-queue-admin.vercel.app"
)

Write-Host "🧪 WhatsApp Production Debug Test" -ForegroundColor Blue
Write-Host "Test Phone: $TestPhone" -ForegroundColor Gray
Write-Host "Admin URL: $AdminUrl" -ForegroundColor Gray
Write-Host ""

# Step 1: Check endpoint accessibility
Write-Host "🌐 Step 1: Checking endpoint accessibility..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$AdminUrl/api/health" -Method GET -TimeoutSec 10 | Out-Null
    Write-Host "✅ Admin app is accessible" -ForegroundColor Green
}
catch {
    Write-Host "❌ Admin app is not accessible: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Run production debug
Write-Host "🔍 Step 2: Running Production Debug..." -ForegroundColor Yellow
try {
    $DebugUrl = "$AdminUrl/api/test/whatsapp-production-debug?phone=$TestPhone"
    $DebugResponse = Invoke-RestMethod -Uri $DebugUrl -Method GET -TimeoutSec 30
    
    Write-Host "📊 Debug Results:" -ForegroundColor Cyan
    Write-Host "  Environment: OK" -ForegroundColor Green
    Write-Host "  Sessions: OK" -ForegroundColor Green
    Write-Host "  API: OK" -ForegroundColor Green
}
catch {
    Write-Host "❌ Production debug failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test WhatsApp API
Write-Host "📱 Step 3: Testing WhatsApp API..." -ForegroundColor Yellow
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
        Write-Host "✅ WhatsApp test message sent!" -ForegroundColor Green
    } else {
        Write-Host "❌ WhatsApp test failed: $($Response.message)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ WhatsApp API test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🏁 Test completed!" -ForegroundColor Green
