# Comprehensive Queue Advancement Debug Test
param(
    [string]$AdminUrl = "https://smart-queue-admin.vercel.app",
    [string]$TestPhone = "201015544028"
)

Write-Host "=== COMPREHENSIVE QUEUE ADVANCEMENT DEBUG ===" -ForegroundColor Blue
Write-Host ""

# Test 1: Verify the notification service can be called directly
Write-Host "Test 1: Direct notification service test..." -ForegroundColor Yellow
try {
    # Simulate exactly what queue advancement should do
    $notificationTest = @{
        organizationId = "test-org"
        ticketId = "debug-$(Get-Random)"
        customerPhone = $TestPhone
        payload = @{
            title = "Your Turn!"
            body = "Debug test - Please proceed"
            icon = "/Logo.svg"
            tag = "your-turn"
        }
        notificationType = "your_turn"
        ticketNumber = "DEBUG-$(Get-Random -Maximum 999)"
    } | ConvertTo-Json -Depth 5
    
    Write-Host "  Calling push notification API (queue advancement path)..." -ForegroundColor Gray
    $pushResult = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/push" -Method POST -Body $notificationTest -ContentType "application/json"
    
    Write-Host "  Push API Result:" -ForegroundColor Cyan
    Write-Host "    Success: $($pushResult.success)" -ForegroundColor Gray
    Write-Host "    Message: $($pushResult.message)" -ForegroundColor Gray
    
    if ($pushResult.whatsappFallback) {
        Write-Host "    WhatsApp Fallback:" -ForegroundColor Yellow
        Write-Host "      Attempted: $($pushResult.whatsappFallback.attempted)" -ForegroundColor Gray
        Write-Host "      Success: $($pushResult.whatsappFallback.success)" -ForegroundColor Gray
        if ($pushResult.whatsappFallback.error) {
            Write-Host "      Error: $($pushResult.whatsappFallback.error)" -ForegroundColor Red
        }
    } else {
        Write-Host "    No WhatsApp fallback info" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Push API failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "    Response: $responseBody" -ForegroundColor Gray
    }
}

# Test 2: Check what happens if we call the WhatsApp API directly (bypassing push)
Write-Host "`nTest 2: Direct WhatsApp API test..." -ForegroundColor Yellow
try {
    $directWhatsApp = @{
        phone = $TestPhone
        message = "Direct WhatsApp API test - Your turn! Ticket DEBUG-$(Get-Random) - Please proceed to the service counter."
        organizationId = "test-org"
        notificationType = "your_turn"
    } | ConvertTo-Json
    
    $whatsappResult = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/whatsapp" -Method POST -Body $directWhatsApp -ContentType "application/json"
    
    if ($whatsappResult.success) {
        Write-Host "  ✅ Direct WhatsApp: SUCCESS" -ForegroundColor Green
        Write-Host "    Message ID: $($whatsappResult.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Direct WhatsApp: FAILED - $($whatsappResult.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Direct WhatsApp: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check recent tickets to ensure they have phone numbers
Write-Host "`nTest 3: Checking recent tickets..." -ForegroundColor Yellow
try {
    $debugInfo = Invoke-RestMethod -Uri "$AdminUrl/api/test/whatsapp-production-debug?phone=$TestPhone" -Method GET
    
    Write-Host "  Recent tickets: $($debugInfo.recentTickets.count)" -ForegroundColor Gray
    
    if ($debugInfo.recentTickets.count -gt 0) {
        Write-Host "  Ticket details:" -ForegroundColor Cyan
        foreach ($ticket in $debugInfo.recentTickets.tickets) {
            $phoneStatus = if ($ticket.customer_phone) { 
                "✅ Phone: $($ticket.customer_phone)" 
            } else { 
                "❌ NO PHONE" 
            }
            Write-Host "    • $($ticket.ticket_number) | $($ticket.status) | $phoneStatus" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  No recent tickets found" -ForegroundColor Yellow
        Write-Host "    Create a ticket in your customer app first!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Failed to check tickets: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== ANALYSIS ===" -ForegroundColor Blue
Write-Host ""
Write-Host "What the results mean:" -ForegroundColor White
Write-Host ""
Write-Host "If Test 1 shows success=false with 'No active subscriptions':" -ForegroundColor Yellow
Write-Host "  → The push notification logic is preventing WhatsApp from being sent" -ForegroundColor Red
Write-Host ""
Write-Host "If Test 1 shows WhatsApp fallback attempted=true but success=false:" -ForegroundColor Yellow  
Write-Host "  → The notification service is being called but the WhatsApp API call is failing" -ForegroundColor Red
Write-Host ""
Write-Host "If Test 2 works but Test 1 doesn't:" -ForegroundColor Yellow
Write-Host "  → The issue is in the push notification → notification service → WhatsApp chain" -ForegroundColor Red
Write-Host ""
Write-Host "If Test 3 shows no recent tickets or tickets without phone numbers:" -ForegroundColor Yellow
Write-Host "  → Create a real ticket with a phone number first" -ForegroundColor Red

Write-Host "`n🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "1. If the tests above show issues, we know where to focus" -ForegroundColor White
Write-Host "2. Try creating a real ticket and advancing the queue manually" -ForegroundColor White
Write-Host "3. Check your browser's developer console for any JavaScript errors" -ForegroundColor White
Write-Host "4. Verify you're selecting the correct department when advancing the queue" -ForegroundColor White
