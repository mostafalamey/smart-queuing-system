# Check what's actually in the notification_preferences table
# This will help us understand if the issue is with creation or lookup

param(
    [Parameter(Mandatory=$false)]
    [string]$Phone = "201015544028",
    [Parameter(Mandatory=$false)]
    [string]$OrgId = "def924ee-c304-4772-8129-de97818e6ee9"
)

$ngrokUrl = "https://d2a9d716e99c.ngrok-free.app"

Write-Host "=== Debugging Notification Preferences Database ===" -ForegroundColor Yellow
Write-Host ""

# Create a simple API endpoint test to query the database directly
$testPayload = @{
    action = "debug_preferences"
    phone = $Phone
    organizationId = $OrgId
} | ConvertTo-Json

Write-Host "Creating temporary debug endpoint to check database..." -ForegroundColor Cyan
Write-Host "We need to add a debug endpoint to check notification_preferences table"
Write-Host ""
Write-Host "What we found from logs:" -ForegroundColor Yellow
Write-Host "  ❌ notification preferences query returns null"
Write-Host "  ❌ This means either:"
Write-Host "     1. No notification_preferences record was created when ticket was made"
Write-Host "     2. The ticket_id lookup is failing"
Write-Host "     3. The customer app isn't saving preferences correctly"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Create a REAL ticket (not test-debug-12345) at:"
Write-Host "     https://smart-queue-customer.vercel.app/$OrgId"
Write-Host "  2. Select 'Both Push and WhatsApp' notifications"
Write-Host "  3. Note the real ticket ID from the database or customer app"
Write-Host "  4. Test with that real ticket ID"
Write-Host ""
Write-Host "OR we can check the customer app database insertion logic..."
