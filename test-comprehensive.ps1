# Comprehensive test for the WhatsApp notification fix
# This will help you test the real queue progression scenario

param(
    [Parameter(Mandatory=$false)]
    [string]$TestPhase = "help"
)

$phone = "+201015544028" 
$cleanPhone = "201015544028"
$orgId = "def924ee-c304-4772-8129-de97818e6ee9"
$adminUrl = "https://smart-queue-admin.vercel.app"
$customerUrl = "https://smart-queue-customer.vercel.app"

function Show-Help {
    Write-Host ""
    Write-Host "=== WhatsApp Notification Fix Test Guide ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "STEP 1: Create Test Ticket" -ForegroundColor Cyan
    Write-Host "  1. Go to: $customerUrl/$orgId"
    Write-Host "  2. Enter phone: $phone"  
    Write-Host "  3. Select notification preference: 'Both Push and WhatsApp'"
    Write-Host "  4. Create a ticket and note the ticket ID"
    Write-Host ""
    Write-Host "STEP 2: Test with Real Ticket" -ForegroundColor Cyan
    Write-Host "  Run: .\test-comprehensive.ps1 -TestPhase 'test' -TicketId 'your-ticket-id'"
    Write-Host ""
    Write-Host "STEP 3: Test Queue Progression" -ForegroundColor Cyan
    Write-Host "  Use your existing queue progression commands (test-real-tickets.ps1)"
    Write-Host "  Watch for BOTH push and WhatsApp notifications"
    Write-Host ""
    Write-Host "Expected Behavior:" -ForegroundColor Green
    Write-Host "  - User with 'both' preference + active WhatsApp session = gets BOTH notifications"
    Write-Host "  - User with 'push' preference = gets push only (WhatsApp if push fails)"  
    Write-Host "  - User with 'whatsapp' preference = gets WhatsApp only"
    Write-Host ""
}

function Test-NotificationAPI {
    param([string]$TicketId)
    
    Write-Host "Testing with Ticket ID: $TicketId" -ForegroundColor Yellow
    Write-Host ""
    
    # Test the push notification API
    $payload = @{
        organizationId = $orgId
        ticketId = $TicketId
        customerPhone = $phone
        payload = @{
            title = "Test Queue Progression"
            body = "Testing notification preferences - you should get BOTH push AND WhatsApp"
            icon = "/icon-192x192.png"
            data = @{
                ticketNumber = "TEST-001" 
                action = "your_turn"
            }
        }
        notificationType = "your_turn"
        ticketNumber = "TEST-001"
    } | ConvertTo-Json -Depth 3

    Write-Host "Sending test notification..." -ForegroundColor Green
    try {
        $response = Invoke-RestMethod -Uri "$adminUrl/api/notifications/push" -Method POST -Body $payload -ContentType "application/json"
        
        Write-Host "API Response:" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor White
        
        Write-Host ""
        if ($response.success) {
            Write-Host "SUCCESS: Check your phone for notifications!" -ForegroundColor Green
            Write-Host "You should receive:" -ForegroundColor Cyan
            Write-Host "  1. Push notification (if subscribed)"
            Write-Host "  2. WhatsApp message (if you selected 'both')"
        } else {
            Write-Host "API returned unsuccessful response" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "API Error:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# Main execution
if ($TestPhase -eq "help" -or $TestPhase -eq "") {
    Show-Help
} elseif ($TestPhase -eq "test") {
    if ($args.Count -gt 1 -and $args[1] -ne "") {
        Test-NotificationAPI -TicketId $args[1]
    } else {
        Write-Host "Error: Please provide a ticket ID" -ForegroundColor Red
        Write-Host "Usage: .\test-comprehensive.ps1 -TestPhase 'test' -TicketId 'your-ticket-id'"
    }
} else {
    Show-Help
}
