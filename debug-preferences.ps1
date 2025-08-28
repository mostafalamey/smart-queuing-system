# Debug script to test notification preferences logic
# This will help debug why WhatsApp isn't sent when push subscriptions exist

param(
    [Parameter(Mandatory=$true)]
    [string]$TicketId
)

$phone = "+201015544028"
$orgId = "def924ee-c304-4772-8129-de97818e6ee9"
$adminUrl = "https://smart-queue-admin.vercel.app"

Write-Host "=== Debugging Notification Preferences ===" -ForegroundColor Yellow
Write-Host "Phone: $phone"
Write-Host "Organization: $orgId" 
Write-Host "Ticket ID: $TicketId"
Write-Host ""

# Test 1: Send a test notification and capture detailed response
Write-Host "Step 1: Sending test notification to debug logic..." -ForegroundColor Cyan

$payload = @{
    organizationId = $orgId
    ticketId = $TicketId
    customerPhone = $phone
    payload = @{
        title = "DEBUG: Notification Preferences Test"
        body = "Testing why WhatsApp isn't sent when push subscriptions exist"
        icon = "/icon-192x192.png" 
        data = @{
            ticketNumber = "DEBUG-001"
            action = "your_turn"
        }
    }
    notificationType = "your_turn"
    ticketNumber = "DEBUG-001"
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$adminUrl/api/notifications/push" -Method POST -Body $payload -ContentType "application/json"
    
    Write-Host ""
    Write-Host "=== API RESPONSE ===" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 4) -ForegroundColor White
    
    Write-Host ""
    Write-Host "=== ANALYSIS ===" -ForegroundColor Yellow
    
    if ($response.results) {
        Write-Host "Push Results:"
        Write-Host "  Total subscriptions: $($response.results.total)"
        Write-Host "  Successful: $($response.results.success)"
        Write-Host "  Failed: $($response.results.failed)"
    }
    
    if ($response.whatsappFallback) {
        Write-Host "WhatsApp Results:"
        Write-Host "  Attempted: $($response.whatsappFallback.attempted)"
        Write-Host "  Successful: $($response.whatsappFallback.success)"
    } else {
        Write-Host "WhatsApp Results: NOT ATTEMPTED" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
    Write-Host "1. Check Vercel logs for detailed debug info:"
    Write-Host "   - Look for 'User notification preferences:'"
    Write-Host "   - Look for 'WhatsApp decision logic:'"
    Write-Host "2. The logs will show exactly what notification_preferences were found"
    Write-Host "3. The logs will show why shouldSendWhatsApp was true/false"

} catch {
    Write-Host ""
    Write-Host "=== API ERROR ===" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
