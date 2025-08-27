# Complete WhatsApp Notification Debug Test
param(
    [string]$TestPhone = "201015544028",
    [string]$AdminUrl = "https://smart-queue-admin.vercel.app"
)

Write-Host "=== WhatsApp Notification Debug Test ===" -ForegroundColor Blue
Write-Host "Test Phone: $TestPhone"
Write-Host "Admin URL: $AdminUrl"
Write-Host ""

# Step 1: Test if tickets have phone numbers in the database
Write-Host "Step 1: Checking if tickets have phone numbers..." -ForegroundColor Yellow

# We'll use the debug endpoint to check recent tickets
try {
    $DebugResponse = Invoke-RestMethod -Uri "$AdminUrl/api/test/whatsapp-production-debug?phone=$TestPhone" -Method GET
    
    Write-Host "Recent Tickets Count: $($DebugResponse.recentTickets.count)" -ForegroundColor Cyan
    
    if ($DebugResponse.recentTickets.count -gt 0) {
        foreach ($ticket in $DebugResponse.recentTickets.tickets) {
            $phoneStatus = if ($ticket.customer_phone) { "HAS PHONE: $($ticket.customer_phone)" } else { "NO PHONE" }
            Write-Host "  Ticket $($ticket.ticket_number) - Status: $($ticket.status) - $phoneStatus" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No recent tickets found. Create a ticket first!" -ForegroundColor Red
    }
    
    Write-Host "Session Status: Has Active Session = $($DebugResponse.sessions.sessionServiceResult)" -ForegroundColor Green
}
catch {
    Write-Host "Failed to get debug info: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 2: Test the push notification API directly (simulates queue advancement)
Write-Host "`nStep 2: Testing push notification API (simulates queue advancement)..." -ForegroundColor Yellow

try {
    # Create a test payload that mimics what the queue advancement sends
    $PushPayload = @{
        organizationId = "cd7d84b3-7b4c-41ea-bb2e-6c6c8d06f8c0"  # Replace with actual org ID
        ticketId = "test-ticket-id-$(Get-Random)"
        customerPhone = $TestPhone
        payload = @{
            title = "Your Turn! - Test Department"
            body = "Ticket 123 - Please proceed to Test Department"
            icon = "/Logo.svg"
            tag = "your-turn"
        }
        notificationType = "your_turn"
        ticketNumber = "123"
    } | ConvertTo-Json -Depth 5
    
    Write-Host "Sending push notification request..." -ForegroundColor Gray
    
    $PushResponse = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/push" -Method POST -Body $PushPayload -ContentType "application/json"
    
    if ($PushResponse.success) {
        Write-Host "Push notification sent successfully!" -ForegroundColor Green
        Write-Host "  Message: $($PushResponse.message)" -ForegroundColor Gray
        
        if ($PushResponse.whatsappFallback) {
            Write-Host "  WhatsApp Fallback:" -ForegroundColor Cyan
            Write-Host "    Attempted: $($PushResponse.whatsappFallback.attempted)" -ForegroundColor Gray
            Write-Host "    Success: $($PushResponse.whatsappFallback.success)" -ForegroundColor Gray
        }
    } else {
        Write-Host "Push notification failed: $($PushResponse.message)" -ForegroundColor Red
    }
}
catch {
    Write-Host "Push notification API failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Gray
    }
}

# Step 3: Test the fixed WhatsApp API directly
Write-Host "`nStep 3: Testing fixed WhatsApp API directly..." -ForegroundColor Yellow

try {
    $WhatsAppPayload = @{
        phone = $TestPhone
        message = "FINAL TEST: This is to verify WhatsApp notifications work during queue advancement - $(Get-Date -Format 'HH:mm:ss')"
        organizationId = "test-org-id"
        ticketId = "test-ticket-$(Get-Random)"
        notificationType = "your_turn"
        bypassSessionCheck = $true
    } | ConvertTo-Json
    
    $WhatsAppResponse = Invoke-RestMethod -Uri "$AdminUrl/api/notifications/whatsapp-fixed" -Method POST -Body $WhatsAppPayload -ContentType "application/json"
    
    if ($WhatsAppResponse.success) {
        Write-Host "WhatsApp direct test sent successfully!" -ForegroundColor Green
        Write-Host "  Message ID: $($WhatsAppResponse.messageId)" -ForegroundColor Gray
    } else {
        Write-Host "WhatsApp direct test failed: $($WhatsAppResponse.message)" -ForegroundColor Red
    }
}
catch {
    Write-Host "WhatsApp direct test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Blue
Write-Host "1. Check if tickets in your app have phone numbers"
Write-Host "2. Verify the push notification API is being called during queue advancement"
Write-Host "3. Confirm WhatsApp sessions are active for the customer"
Write-Host ""
Write-Host "If direct WhatsApp works but not during queue advancement, the issue is:" -ForegroundColor Yellow
Write-Host "- Tickets missing phone numbers OR" -ForegroundColor Red
Write-Host "- Queue advancement not calling notification API correctly" -ForegroundColor Red
