# Create notification preferences manually for testing
# This will simulate what should happen when user selects "Both Push and WhatsApp"

$ngrokUrl = "https://d2a9d716e99c.ngrok-free.app"
$phone = "+201015544028"
$cleanPhone = "201015544028"
$orgId = "def924ee-c304-4772-8129-de97818e6ee9"

Write-Host "=== Creating Missing Notification Preferences ===" -ForegroundColor Yellow
Write-Host ""

# Create a test to manually insert notification preferences
$createPrefsPayload = @{
    action = "create_test_preferences"
    organizationId = $orgId
    customerPhone = $phone
    pushEnabled = $true
    whatsappEnabled = $true
} | ConvertTo-Json

Write-Host "We need to manually create notification preferences for testing." -ForegroundColor Cyan
Write-Host "Phone: $phone (cleaned: $cleanPhone)"
Write-Host "Organization: $orgId"
Write-Host ""

Write-Host "The notification preferences should have been created when you enabled push notifications," -ForegroundColor Yellow
Write-Host "but they're missing from the database."
Write-Host ""

Write-Host "Solution: Let's create them manually through the subscribe API:" -ForegroundColor Green
Write-Host ""

# Test creating notification preferences through the subscribe API
Write-Host "Calling the subscribe API to create notification preferences..." -ForegroundColor Cyan

$subscribePayload = @{
    organizationId = $orgId
    customerPhone = $phone
    subscription = @{
        endpoint = "test-endpoint"
        keys = @{
            p256dh = "test-p256dh"
            auth = "test-auth"
        }
    }
} | ConvertTo-Json -Depth 3

try {
    $headers = @{
        "ngrok-skip-browser-warning" = "true"
        "Content-Type" = "application/json"
    }
    
    Write-Host "Sending request to create subscription and preferences..."
    $response = Invoke-RestMethod -Uri "$ngrokUrl/api/notifications/subscribe" -Method POST -Body $subscribePayload -Headers $headers
    
    Write-Host ""
    Write-Host "✅ Subscribe API Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor White
    
    Write-Host ""
    Write-Host "Now test the notification preferences again:" -ForegroundColor Cyan
    Write-Host ".\test-dev-server.ps1 -TicketId 'test-fix-12345' -Action 'test'"
    
} catch {
    Write-Host ""
    Write-Host "❌ Error creating subscription:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host ""
    Write-Host "Alternative: Check if notification preferences exist in database" -ForegroundColor Yellow
    Write-Host "The issue might be that preferences were never created when push notifications were set up"
}
