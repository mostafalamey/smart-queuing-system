# Debug session detection in queue advancement
param(
    [string]$TestPhone = "201015544028",
    [string]$OrgId = "def924ee-c304-4772-8129-de97818e6ee9"
)

Write-Host "=== DEBUGGING SESSION DETECTION ISSUE ===" -ForegroundColor Blue
Write-Host ""

# Step 1: Verify session exists using the debug endpoint
Write-Host "Step 1: Checking session with debug endpoint..." -ForegroundColor Yellow
$debugResponse = Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/test/whatsapp-production-debug?phone=$TestPhone" -Method GET

Write-Host "Debug endpoint session results:" -ForegroundColor Cyan
Write-Host "  Session count: $($debugResponse.sessions.count)" -ForegroundColor Gray
Write-Host "  Session service result: $($debugResponse.sessions.sessionServiceResult)" -ForegroundColor Gray
Write-Host "  Session details:" -ForegroundColor Gray

if ($debugResponse.sessions.sessions -and $debugResponse.sessions.sessions.Count -gt 0) {
    $session = $debugResponse.sessions.sessions[0]
    Write-Host "    ID: $($session.id)" -ForegroundColor Gray
    Write-Host "    Phone: $($session.phone_number)" -ForegroundColor Gray
    Write-Host "    Active: $($session.is_active)" -ForegroundColor Gray
    Write-Host "    Expires: $($session.expires_at)" -ForegroundColor Gray
    Write-Host "    Org ID: $($session.organization_id)" -ForegroundColor Gray
}

# Step 2: Test the notification service directly (this works for ticket creation)
Write-Host "`nStep 2: Testing notification service directly..." -ForegroundColor Yellow
try {
    $notificationTest = @{
        phone = $TestPhone
        message = "Notification service test - " + (Get-Date -Format 'HH:mm:ss')
        organizationId = $OrgId
        notificationType = "your_turn"
    } | ConvertTo-Json
    
    $notificationResult = Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/notifications/whatsapp" -Method POST -Body $notificationTest -ContentType "application/json"
    
    if ($notificationResult.success) {
        Write-Host "  ✅ Notification service works: $($notificationResult.messageId)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Notification service failed: $($notificationResult.message)" -ForegroundColor Red
        Write-Host "      Reason: $($notificationResult.reason)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Notification service error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test the whatsapp-sessions service behavior with different parameters
Write-Host "`nStep 3: Testing session service with different parameters..." -ForegroundColor Yellow

# Test A: With organization ID (what push API might be doing)
Write-Host "  Test A: Session check WITH organization ID..." -ForegroundColor Cyan
try {
    # We can't directly call the session service, but we can check what parameters
    # might cause issues by examining the session data
    
    if ($debugResponse.sessions.sessions -and $debugResponse.sessions.sessions.Count -gt 0) {
        $session = $debugResponse.sessions.sessions[0]
        $sessionOrgId = $session.organization_id
        $sessionPhone = $session.phone_number
        
        Write-Host "    Session org ID: $sessionOrgId" -ForegroundColor Gray
        Write-Host "    Test org ID: $OrgId" -ForegroundColor Gray
        Write-Host "    Org IDs match: $($sessionOrgId -eq $OrgId)" -ForegroundColor Gray
        Write-Host "    Phone match: $($sessionPhone -eq $TestPhone)" -ForegroundColor Gray
        
        if ($sessionOrgId -ne $OrgId) {
            Write-Host "    🚨 ORG ID MISMATCH! This could be the issue!" -ForegroundColor Red
        } else {
            Write-Host "    ✅ Org IDs match" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "    ❌ Error checking session details: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test what happens when we create a push notification request
Write-Host "`nStep 4: Testing push API session detection..." -ForegroundColor Yellow

# Create a test payload that will definitely trigger the session check
$testPayload = @{
    organizationId = $OrgId
    ticketId = "session-debug-$(Get-Random)"
    customerPhone = $TestPhone
    payload = @{
        title = "Session Debug Test"
        body = "Testing why session detection fails"
        icon = "/Logo.svg"
        tag = "your-turn"
    }
    notificationType = "your_turn"
    ticketNumber = "DEBUG-$(Get-Random -Maximum 999)"
} | ConvertTo-Json -Depth 5

try {
    Write-Host "  Calling push API to see session detection behavior..." -ForegroundColor Cyan
    $pushResult = Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/notifications/push" -Method POST -Body $testPayload -ContentType "application/json"
    
    Write-Host "  Push API results:" -ForegroundColor Gray
    Write-Host "    Success: $($pushResult.success)" -ForegroundColor Gray
    Write-Host "    Message: $($pushResult.message)" -ForegroundColor Gray
    
    # Check if we have push results (which we expect)
    if ($pushResult.results -and $pushResult.results.total) {
        Write-Host "    Push subscriptions found: $($pushResult.results.total)" -ForegroundColor Gray
        Write-Host "    Push success count: $($pushResult.results.success)" -ForegroundColor Gray
    }
    
    # Check WhatsApp fallback
    if ($pushResult.whatsappFallback) {
        Write-Host "    📱 WhatsApp fallback attempted: $($pushResult.whatsappFallback.attempted)" -ForegroundColor Yellow
        Write-Host "    📱 WhatsApp fallback success: $($pushResult.whatsappFallback.success)" -ForegroundColor Yellow
        
        if ($pushResult.whatsappFallback.success) {
            Write-Host "    ✅ SUCCESS! Session detection worked!" -ForegroundColor Green
        } else {
            Write-Host "    ❌ Session detection or WhatsApp sending failed" -ForegroundColor Red
        }
    } else {
        Write-Host "    📱 No WhatsApp fallback - session detection likely failed" -ForegroundColor Red
        Write-Host "    🔍 This means hasActiveWhatsAppSession returned false" -ForegroundColor Red
    }
    
} catch {
    Write-Host "    ❌ Push API error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== ANALYSIS ===" -ForegroundColor Blue
Write-Host ""
Write-Host "Expected behavior:" -ForegroundColor White
Write-Host "• Step 1 should show active session ✅"
Write-Host "• Step 2 should work (notification service) ✅" 
Write-Host "• Step 3 should show matching org IDs"
Write-Host "• Step 4 should show WhatsApp fallback attempted and successful"
Write-Host ""
Write-Host "If Step 4 shows no WhatsApp fallback, the issue is likely:" -ForegroundColor Yellow
Write-Host "1. Organization ID mismatch in session lookup" -ForegroundColor Red
Write-Host "2. Phone number formatting differences" -ForegroundColor Red
Write-Host "3. Different session checking logic in push API vs notification service" -ForegroundColor Red
Write-Host "4. Async/await timing issues in the session check" -ForegroundColor Red

Write-Host "`n🔧 Next steps based on results:" -ForegroundColor Cyan
Write-Host "• If org IDs don't match: Need to investigate why sessions have different org IDs"
Write-Host "• If no WhatsApp fallback: Need to debug the hasActiveWhatsAppSession function in push API"
Write-Host "• If fallback attempted but failed: Need to check the WhatsApp API call itself"
