#!/usr/bin/env pwsh

# UltraMessage Webhook Configuration Script

Write-Host "🔧 Configuring UltraMessage Webhook..." -ForegroundColor Cyan

$instanceId = "instance140392"
$token = "dqM0P4rnIsKAs8x"
$webhookUrl = "https://01c6cb417abe.ngrok-free.app/api/webhooks/ultramsg/inbound"
$webhookToken = "secure_webhook_secret_token_2025"

# Complete webhook URL with token parameter
$fullWebhookUrl = "${webhookUrl}?token=${webhookToken}"

Write-Host "Instance: $instanceId" -ForegroundColor Yellow
Write-Host "Webhook URL: $fullWebhookUrl" -ForegroundColor Yellow

# Method 1: Try to set webhook via API
Write-Host "`n📡 Attempting to configure webhook via API..." -ForegroundColor Green

$webhookConfig = @{
    webhook = $fullWebhookUrl
    events = "messages"
} | ConvertTo-Json

$apiUrl = "https://api.ultramsg.com/${instanceId}/webhooks?token=${token}"

try {
    Write-Host "Setting webhook URL: $apiUrl" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $webhookConfig
    Write-Host "✅ Webhook configured successfully!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "❌ API method failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This is normal - UltraMessage might require manual configuration via their dashboard." -ForegroundColor Yellow
}

# Method 2: Test current webhook connectivity
Write-Host "`n🧪 Testing webhook connectivity..." -ForegroundColor Green

$testPayload = @{
    token = $webhookToken
    id = "connectivity-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    from = "201015544028"
    to = "201015544028"
    body = "Webhook connectivity test"
    type = "text"
    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
} | ConvertTo-Json -Depth 3

try {
    $testResult = Invoke-RestMethod -Uri $webhookUrl -Method POST -ContentType "application/json" -Body $testPayload
    Write-Host "✅ Webhook is accessible and responding!" -ForegroundColor Green
    $testResult | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "❌ Webhook test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Instructions for manual configuration
Write-Host "`n📋 MANUAL CONFIGURATION REQUIRED:" -ForegroundColor Magenta
Write-Host "If the API method failed, please configure manually:" -ForegroundColor Yellow
Write-Host "1. Go to: https://app.ultramsg.com/$instanceId/webhooks" -ForegroundColor White
Write-Host "2. Set Webhook URL to: $fullWebhookUrl" -ForegroundColor White  
Write-Host "3. Enable 'Messages' events" -ForegroundColor White
Write-Host "4. Save configuration" -ForegroundColor White

Write-Host "`n🔍 To test after manual config:" -ForegroundColor Cyan
Write-Host "1. Send 'Hello' message to WhatsApp: +201015544028" -ForegroundColor White
Write-Host "2. Check if webhook receives the message" -ForegroundColor White
Write-Host "3. Should receive welcome message back" -ForegroundColor White
