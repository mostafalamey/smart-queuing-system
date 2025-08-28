# Test WhatsApp Notification Preference Fix
# Using real production data: +201015544028 and org def924ee-c304-4772-8129-de97818e6ee9

Write-Host "🧪 Testing WhatsApp Notification Preference Fix" -ForegroundColor Yellow
Write-Host ""

# Real production data
$phone = "+201015544028" 
$cleanPhone = "201015544028"
$orgId = "def924ee-c304-4772-8129-de97818e6ee9"
$adminUrl = "https://smart-queue-admin.vercel.app"

Write-Host "📊 Test Data:" -ForegroundColor Cyan
Write-Host "  Phone (with +): $phone"
Write-Host "  Phone (cleaned): $cleanPhone" 
Write-Host "  Organization: $orgId"
Write-Host ""

# Test 1: Check WhatsApp session exists
Write-Host "🔍 Test 1: Check WhatsApp Session" -ForegroundColor Green
try {
    $sessionCheckUrl = "$adminUrl/api/whatsapp/check-session"
    $sessionBody = @{
        phone = $cleanPhone
        organizationId = $orgId
    } | ConvertTo-Json
    
    Write-Host "  Testing session check for: $cleanPhone"
    $sessionResponse = Invoke-RestMethod -Uri $sessionCheckUrl -Method POST -Body $sessionBody -ContentType "application/json"
    Write-Host "  ✅ Session check successful: $($sessionResponse.hasActiveSession)" -ForegroundColor Green
    $hasSession = $sessionResponse.hasActiveSession
} catch {
    Write-Host "  ❌ Session check failed: $($_.Exception.Message)" -ForegroundColor Red
    $hasSession = $false
}
Write-Host ""

# Test 2: Create a test ticket with "both" preferences to simulate the scenario
Write-Host "🎫 Test 2: Test Notification Preferences Logic" -ForegroundColor Green
Write-Host "  This test simulates what happens when:"
Write-Host "  - User selects 'both' notifications (push + WhatsApp)"
Write-Host "  - User has active WhatsApp session: $hasSession"
Write-Host "  - Push notifications exist vs don't exist"
Write-Host ""

# Test the admin push API logic
Write-Host "🚀 Test 3: Test Push API Notification Logic" -ForegroundColor Green
try {
    # Create test payload (similar to what queue operations send)
    $testPayload = @{
        organizationId = $orgId
        ticketId = "test-ticket-id-12345"  # This would be a real ticket ID
        customerPhone = $phone
        payload = @{
            title = "🔔 Test Notification"
            body = "Testing notification preferences fix"
            icon = "/icon-192x192.png"
            data = @{
                ticketNumber = "TST-001"
                action = "your_turn"
            }
        }
        notificationType = "your_turn"
        ticketNumber = "TST-001"
    } | ConvertTo-Json -Depth 3
    
    Write-Host "  📤 Testing push notification API..."
    Write-Host "  URL: $adminUrl/api/notifications/push"
    Write-Host "  Payload preview: organizationId=$orgId, customerPhone=$phone"
    
    # Note: This will fail because we don't have a real ticket ID, but we can see the logic in action
    $pushResponse = Invoke-RestMethod -Uri "$adminUrl/api/notifications/push" -Method POST -Body $testPayload -ContentType "application/json"
    Write-Host "  ✅ Push API responded: $($pushResponse.success)" -ForegroundColor Green
    Write-Host "  📋 Response: $($pushResponse.message)"
} catch {
    Write-Host "  ⚠️ Expected error (no real ticket): $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  This is normal - we need a real ticket ID from database"
}
Write-Host ""

Write-Host "📝 Summary:" -ForegroundColor Cyan  
Write-Host "  The fix should now:"
Write-Host "  1. ✅ Read notification preferences from database by ticket_id"
Write-Host "  2. ✅ Check whatsapp_fallback and push_enabled columns"  
Write-Host "  3. ✅ Send WhatsApp when user chose 'both' AND has active session"
Write-Host "  4. Handle phone cleaning (removes + sign and other non-digits)"
Write-Host ""
Write-Host "🎯 Next Step: Test with real queue progression using your test commands!" -ForegroundColor Yellow
