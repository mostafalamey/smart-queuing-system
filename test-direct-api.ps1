# Direct API Test for Notification Preferences
# Tests the notification preferences logic with real data

param(
    [string]$TicketId = "",
    [string]$Phone = "+201015544028",
    [string]$OrgId = "def924ee-c304-4772-8129-de97818e6ee9"
)

$adminUrl = "https://smart-queue-admin.vercel.app"

Write-Host "🔍 Testing Notification Preferences API Logic" -ForegroundColor Yellow
Write-Host "Using: Phone=$Phone, OrgId=$OrgId" -ForegroundColor Cyan

if ($TicketId -eq "") {
    Write-Host ""
    Write-Host "❌ No TicketId provided. To test with a real ticket:" -ForegroundColor Red
    Write-Host "  .\test-direct-api.ps1 -TicketId 'your-real-ticket-id'"
    Write-Host ""
    Write-Host "To get a real ticket ID, you can:"
    Write-Host "  1. Create a ticket in the customer app with 'both' notifications"
    Write-Host "  2. Check the database notification_preferences table for the ticket_id"
    Write-Host "  3. Then run: .\test-direct-api.ps1 -TicketId 'that-ticket-id'"
    exit
}

# Test the push notification API with real ticket
$payload = @{
    organizationId = $OrgId
    ticketId = $TicketId
    customerPhone = $Phone
    payload = @{
        title = "🔔 Test Queue Progression"
        body = "Testing notification preferences - this should trigger both push AND WhatsApp for 'both' users"
        icon = "/icon-192x192.png"
        data = @{
            ticketNumber = "TEST-001" 
            action = "your_turn"
        }
    }
    notificationType = "your_turn"
    ticketNumber = "TEST-001"
} | ConvertTo-Json -Depth 3

Write-Host ""
Write-Host "📤 Sending test notification..." -ForegroundColor Green
Write-Host "URL: $adminUrl/api/notifications/push"

try {
    $response = Invoke-RestMethod -Uri "$adminUrl/api/notifications/push" -Method POST -Body $payload -ContentType "application/json"
    
    Write-Host ""
    Write-Host "✅ API Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor White
    
    Write-Host ""
    Write-Host "🔍 Check the console logs in Vercel for detailed debug info:" -ForegroundColor Cyan
    Write-Host "  - User notification preferences lookup"
    Write-Host "  - WhatsApp decision logic"
    Write-Host "  - Whether both push AND WhatsApp were attempted"
    
} catch {
    Write-Host ""
    Write-Host "❌ API Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
