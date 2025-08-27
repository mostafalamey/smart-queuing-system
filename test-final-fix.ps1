# Test the final session checking fix
param(
    [string]$TestPhone = "201015544028",
    [string]$OrgId = "def924ee-c304-4772-8129-de97818e6ee9"
)

Write-Host "=== TESTING FINAL SESSION CHECKING FIX ===" -ForegroundColor Blue
Write-Host "Waiting 30 seconds for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`nTesting with real organization UUID..." -ForegroundColor Yellow

$testPayload = @{
    organizationId = $OrgId
    ticketId = "final-test-$(Get-Random)"
    customerPhone = $TestPhone
    payload = @{
        title = "FINAL TEST: Your Turn!"
        body = "Testing final session checking fix"
        icon = "/Logo.svg"
        tag = "your-turn"
    }
    notificationType = "your_turn"
    ticketNumber = "FINAL-$(Get-Random -Maximum 999)"
} | ConvertTo-Json -Depth 5

try {
    $result = Invoke-RestMethod -Uri "https://smart-queue-admin.vercel.app/api/notifications/push" -Method POST -Body $testPayload -ContentType "application/json"
    
    Write-Host "RESULT:" -ForegroundColor Green
    Write-Host "  Success: $($result.success)" -ForegroundColor Gray
    Write-Host "  Message: $($result.message)" -ForegroundColor Gray
    
    if ($result.whatsappFallback) {
        Write-Host "  📱 WhatsApp Fallback Found!" -ForegroundColor Green
        Write-Host "    Attempted: $($result.whatsappFallback.attempted)" -ForegroundColor Gray
        Write-Host "    Success: $($result.whatsappFallback.success)" -ForegroundColor Gray
        
        if ($result.whatsappFallback.success) {
            Write-Host "    🎉 SUCCESS! WhatsApp message sent during queue advancement!" -ForegroundColor Green
            Write-Host "    ✅ The fix is working! Your queue WhatsApp notifications should now work!" -ForegroundColor Green
        } else {
            Write-Host "    ❌ WhatsApp sending failed: $($result.whatsappFallback.error)" -ForegroundColor Red
        }
    } else {
        Write-Host "  📱 No WhatsApp fallback - still not working" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Now test in your actual app:" -ForegroundColor Cyan
Write-Host "1. Create a real ticket with WhatsApp notifications"
Write-Host "2. Advance the queue in admin dashboard"
Write-Host "3. Check if you receive WhatsApp messages!"
