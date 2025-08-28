# Test WhatsApp Notification Preference Fix
# Using real production data: +201015544028 and org def924ee-c304-4772-8129-de97818e6ee9

Write-Host "Testing WhatsApp Notification Preference Fix" -ForegroundColor Yellow
Write-Host ""

# Real production data
$phone = "+201015544028" 
$cleanPhone = "201015544028"
$orgId = "def924ee-c304-4772-8129-de97818e6ee9"
$adminUrl = "https://smart-queue-admin.vercel.app"

Write-Host "Test Data:" -ForegroundColor Cyan
Write-Host "  Phone (with +): $phone"
Write-Host "  Phone (cleaned): $cleanPhone" 
Write-Host "  Organization: $orgId"
Write-Host ""

# Test 1: Check WhatsApp session exists
Write-Host "Test 1: Check WhatsApp Session" -ForegroundColor Green
try {
    $sessionCheckUrl = "$adminUrl/api/whatsapp/check-session"
    $sessionBody = @{
        phone = $cleanPhone
        organizationId = $orgId
    } | ConvertTo-Json
    
    Write-Host "  Testing session check for: $cleanPhone"
    $sessionResponse = Invoke-RestMethod -Uri $sessionCheckUrl -Method POST -Body $sessionBody -ContentType "application/json"
    Write-Host "  Session check successful: $($sessionResponse.hasActiveSession)" -ForegroundColor Green
    $hasSession = $sessionResponse.hasActiveSession
} catch {
    Write-Host "  Session check failed: $($_.Exception.Message)" -ForegroundColor Red
    $hasSession = $false
}
Write-Host ""

Write-Host "Summary:" -ForegroundColor Cyan  
Write-Host "  The fix should now:"
Write-Host "  1. Read notification preferences from database by ticket_id"
Write-Host "  2. Check whatsapp_fallback and push_enabled columns"  
Write-Host "  3. Send WhatsApp when user chose 'both' AND has active session"
Write-Host "  4. Handle phone cleaning (removes + sign and other non-digits)"
Write-Host ""
Write-Host "Next Step: Test with real queue progression!" -ForegroundColor Yellow
