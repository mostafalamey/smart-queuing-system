# Test WhatsApp Notification Preferences Fix
# This script tests if the admin API now properly respects user notification preferences

$orgId = "def924ee-c304-4772-8129-de97818e6ee9"  # Real org UUID
$phone = "201015544028"  # Real phone with active session
$adminUrl = "https://smart-queue-admin.vercel.app"

Write-Host "🧪 Testing WhatsApp Notification Preferences Fix" -ForegroundColor Cyan
Write-Host "Organization: $orgId" -ForegroundColor Gray
Write-Host "Phone: $phone" -ForegroundColor Gray
Write-Host ""

# Test push notification API with a sample ticket that should have preferences
$body = @{
    organizationId = $orgId
    ticketId = "12345678-1234-1234-1234-123456789012"  # Sample ticket ID
    customerPhone = $phone
    payload = @{
        title = "Test Notification"
        body = "Testing user preference logic"
        icon = "/icon-192x192.png"
        data = @{
            ticketId = "12345678-1234-1234-1234-123456789012"
            action = "almost_your_turn"
        }
    }
    notificationType = "almost_your_turn"
    ticketNumber = "TST-001"
} | ConvertTo-Json -Depth 10

Write-Host "📡 Calling push notification API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$adminUrl/api/notifications/push" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
    
    Write-Host "✅ Response Status: $($response.StatusCode)" -ForegroundColor Green
    
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "📋 Response Data:" -ForegroundColor Cyan
    $responseData | ConvertTo-Json -Depth 5 | Write-Host
    
    # Look for preference-related logs in the response
    if ($responseData.message -like "*preference*" -or $responseData.message -like "*WhatsApp*") {
        Write-Host "🎯 Preference logic appears to be working!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.Content.ReadAsStringAsync().Result
        Write-Host "Error details: $errorContent" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔍 Key Things to Check:" -ForegroundColor Cyan
Write-Host "1. API should read notification_preferences table" -ForegroundColor Gray
Write-Host "2. Should respect user's whatsapp_fallback and push_enabled choices" -ForegroundColor Gray
Write-Host "3. Should NOT send WhatsApp to everyone like before" -ForegroundColor Gray
Write-Host "4. Should send WhatsApp only when user opted for it OR push fails" -ForegroundColor Gray
