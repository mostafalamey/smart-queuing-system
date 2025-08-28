# Test notification preferences using the local dev server with ngrok
# This allows us to see real-time debug logs

param(
    [Parameter(Mandatory=$false)]
    [string]$TicketId = "",
    [Parameter(Mandatory=$false)]
    [string]$Action = "help"
)

$phone = "+201015544028"
$orgId = "def924ee-c304-4772-8129-de97818e6ee9"
$ngrokUrl = "https://d2a9d716e99c.ngrok-free.app"  # Your actual ngrok URL
$customerUrl = "https://smart-queue-customer.vercel.app"

Write-Host "=== Local Dev Server Testing ===" -ForegroundColor Yellow
Write-Host "Using ngrok URL: $ngrokUrl" -ForegroundColor Cyan
Write-Host ""

if ($Action -eq "help" -or $TicketId -eq "") {
    Write-Host "STEP 1: Create a test ticket" -ForegroundColor Green
    Write-Host "  1. Go to: $customerUrl/$orgId"
    Write-Host "  2. Enter phone: $phone"
    Write-Host "  3. Select: 'Both Push and WhatsApp'"
    Write-Host "  4. Create ticket and note the ticket ID"
    Write-Host ""
    Write-Host "STEP 2: Test with ticket ID" -ForegroundColor Green  
    Write-Host "  Run: .\test-dev-server.ps1 -TicketId 'your-ticket-id' -Action 'test'"
    Write-Host ""
    Write-Host "STEP 3: Update UltraMessage webhook (optional)" -ForegroundColor Green
    Write-Host "  Run: .\test-dev-server.ps1 -Action 'webhook'"
    Write-Host ""
    return
}

if ($Action -eq "webhook") {
    Write-Host "To update UltraMessage webhook to use ngrok:" -ForegroundColor Cyan
    Write-Host "1. Go to UltraMessage dashboard"
    Write-Host "2. Update webhook URL to: $ngrokUrl/api/whatsapp/webhook"
    Write-Host "3. This will allow WhatsApp messages to reach your dev server"
    Write-Host ""
    return
}

if ($Action -eq "test") {
    Write-Host "Testing notification preferences with Ticket ID: $TicketId" -ForegroundColor Yellow
    Write-Host ""
    
    # Test the push notification API on local dev server
    $payload = @{
        organizationId = $orgId
        ticketId = $TicketId
        customerPhone = $phone
        payload = @{
            title = "LOCAL TEST: Queue Progression"
            body = "Testing notification preferences on local dev server"
            icon = "/icon-192x192.png"
            data = @{
                ticketNumber = "DEV-001"
                action = "your_turn"
            }
        }
        notificationType = "your_turn"
        ticketNumber = "DEV-001"
    } | ConvertTo-Json -Depth 3

    Write-Host "Sending test notification to local server..." -ForegroundColor Green
    Write-Host "URL: $ngrokUrl/api/notifications/push" -ForegroundColor Gray
    
    try {
        # Add ngrok-skip-browser-warning header for free ngrok accounts
        $headers = @{
            "ngrok-skip-browser-warning" = "true"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$ngrokUrl/api/notifications/push" -Method POST -Body $payload -Headers $headers
        
        Write-Host ""
        Write-Host "=== API RESPONSE ===" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 4) -ForegroundColor White
        
        Write-Host ""
        Write-Host "=== CHECK YOUR DEV SERVER CONSOLE ===" -ForegroundColor Yellow
        Write-Host "Look for these debug logs in your localhost:3001 console:" -ForegroundColor Cyan
        Write-Host "  🔍 DEBUG: Notification preferences check"
        Write-Host "  ✅ DEBUG: WhatsApp enabled because..."
        Write-Host "  ❌ DEBUG: WhatsApp NOT enabled..."
        Write-Host "  🔍 WhatsApp decision logic"
        Write-Host ""
        
        if ($response.success) {
            Write-Host "SUCCESS: Check console logs to see the detailed decision flow!" -ForegroundColor Green
        } else {
            Write-Host "Response indicates failure - check console logs for details" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host ""
        Write-Host "=== API ERROR ===" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "If you get a connection error:" -ForegroundColor Yellow
        Write-Host "1. Make sure your admin dev server is running on port 3001"
        Write-Host "2. Make sure ngrok is forwarding to localhost:3001"
        Write-Host "3. Try accessing $ngrokUrl in your browser first"
    }
}
