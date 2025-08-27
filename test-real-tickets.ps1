# Test to check actual customer tickets with phone numbers
param(
    [string]$AdminUrl = "https://smart-queue-admin.vercel.app"
)

Write-Host "=== Checking Real Customer Tickets ===" -ForegroundColor Blue
Write-Host ""

# First, let's get some actual organization data
Write-Host "Step 1: Getting organization data..." -ForegroundColor Yellow
try {
    # This endpoint should return some debug info about recent tickets
    $DebugResponse = Invoke-RestMethod -Uri "$AdminUrl/api/test/whatsapp-production-debug" -Method GET -TimeoutSec 30
    
    Write-Host "Environment Status:" -ForegroundColor Green
    Write-Host "  UltraMessage: $($DebugResponse.environment.ULTRAMSG_INSTANCE_ID)" -ForegroundColor Gray
    Write-Host "  WhatsApp Enabled: $($DebugResponse.environment.WHATSAPP_ENABLED)" -ForegroundColor Gray
    
    Write-Host "`nRecent Tickets:" -ForegroundColor Green
    Write-Host "  Count: $($DebugResponse.recentTickets.count)" -ForegroundColor Gray
    
    if ($DebugResponse.recentTickets.count -gt 0) {
        Write-Host "  Ticket Details:" -ForegroundColor Gray
        foreach ($ticket in $DebugResponse.recentTickets.tickets) {
            $phoneDisplay = if ($ticket.customer_phone -and $ticket.customer_phone -ne "" -and $ticket.customer_phone -ne "null") { 
                "✅ PHONE: $($ticket.customer_phone)" 
            } else { 
                "❌ NO PHONE" 
            }
            Write-Host "    • Ticket: $($ticket.ticket_number) | Status: $($ticket.status) | $phoneDisplay" -ForegroundColor Cyan
        }
    }
    
    Write-Host "`nWhatsApp Session Status:" -ForegroundColor Green
    Write-Host "  Sessions Found: $($DebugResponse.sessions.count)" -ForegroundColor Gray
    Write-Host "  Active Session: $($DebugResponse.sessions.sessionServiceResult)" -ForegroundColor Gray
}
catch {
    Write-Host "Failed to get debug data: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TEST CASE: Creating ticket with phone number ===" -ForegroundColor Blue

# Try to simulate ticket creation by calling the push API directly with correct org data
Write-Host "Step 2: Testing with sample ticket that HAS phone number..." -ForegroundColor Yellow
try {
    $TestPhoneNumber = "201015544028"
    
    $TestPayload = @{
        organizationId = "test-org-id"
        ticketId = "sample-ticket-$(Get-Random)"
        customerPhone = $TestPhoneNumber  # Include phone number
        payload = @{
            title = "TEST: Your Turn! - Sample Department"
            body = "Ticket TEST-001 - Please proceed to Sample Department"
            icon = "/Logo.svg"
            tag = "your-turn"
        }
        notificationType = "your_turn"
        ticketNumber = "TEST-001"
    } | ConvertTo-Json -Depth 5
    
    Write-Host "Sending push notification with phone number..." -ForegroundColor Gray
    Write-Host "Phone: $TestPhoneNumber" -ForegroundColor Gray
    
    $TestResponse = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/push" -Method POST -Body $TestPayload -ContentType "application/json" -TimeoutSec 30
    
    if ($TestResponse.success) {
        Write-Host "✅ Push notification SUCCESSFUL!" -ForegroundColor Green
        Write-Host "  Message: $($TestResponse.message)" -ForegroundColor Gray
        
        if ($TestResponse.whatsappFallback) {
            Write-Host "  📱 WhatsApp Attempt:" -ForegroundColor Cyan
            Write-Host "    Attempted: $($TestResponse.whatsappFallback.attempted)" -ForegroundColor Gray
            Write-Host "    Success: $($TestResponse.whatsappFallback.success)" -ForegroundColor Gray
            if ($TestResponse.whatsappFallback.success) {
                Write-Host "    ✅ WhatsApp message was sent!" -ForegroundColor Green
            } else {
                Write-Host "    ❌ WhatsApp failed: $($TestResponse.whatsappFallback.error)" -ForegroundColor Red
            }
        } else {
            Write-Host "  📱 No WhatsApp fallback attempted" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Push notification failed: $($TestResponse.message)" -ForegroundColor Red
        if ($TestResponse.whatsappFallback) {
            Write-Host "  WhatsApp fallback attempted: $($TestResponse.whatsappFallback.attempted)" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "  Error details: $errorBody" -ForegroundColor Gray
    }
}

Write-Host "`n=== SUMMARY & RECOMMENDATIONS ===" -ForegroundColor Blue
Write-Host "📋 Based on the results above:" -ForegroundColor Yellow
Write-Host ""
Write-Host "If recent tickets show '❌ NO PHONE':" -ForegroundColor White
Write-Host "  • The customer app is creating tickets without phone numbers" -ForegroundColor Red
Write-Host "  • WhatsApp notifications cannot be sent without phone numbers" -ForegroundColor Red
Write-Host "  • Solution: Make phone number required for WhatsApp users" -ForegroundColor Yellow
Write-Host ""
Write-Host "If the test above shows WhatsApp success:" -ForegroundColor White
Write-Host "  • The notification system is working correctly" -ForegroundColor Green
Write-Host "  • The issue is missing phone numbers in real tickets" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Check if customers are entering phone numbers in your app" -ForegroundColor White
Write-Host "  2. Consider making phone number required for WhatsApp notifications" -ForegroundColor White
Write-Host "  3. Test by creating a real ticket WITH a phone number" -ForegroundColor White
