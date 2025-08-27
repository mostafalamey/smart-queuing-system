# Activate WhatsApp Session - Manual Test Script
Write-Host "=== WhatsApp Session Activation Guide ===" -ForegroundColor Cyan

Write-Host "`n📱 STEP 1: Send WhatsApp Message" -ForegroundColor Yellow
Write-Host "Send a message to: +20 101 554 4028" -ForegroundColor White
Write-Host "Message: Hello" -ForegroundColor Green
Write-Host "This will activate your session for testing." -ForegroundColor White

Write-Host "`n⏳ STEP 2: Wait for Message Processing" -ForegroundColor Yellow
Write-Host "After sending, wait 10-30 seconds for webhook processing..." -ForegroundColor White

Write-Host "`n🧪 STEP 3: Test Session Activation" -ForegroundColor Yellow
Write-Host "Run this command to check if session is now active:" -ForegroundColor White
Write-Host 'echo "Checking session..."; $check = ''{"phone":"201015544028","organizationId":"def924ee-c394-4772-8129-de7f818ecee9"}''; Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/check-session" -Method POST -ContentType "application/json" -Body $check' -ForegroundColor Green

Write-Host "`n🎯 STEP 4: Test Your Turn Message" -ForegroundColor Yellow
Write-Host "If session is active (hasActiveSession: True), test the message:" -ForegroundColor White
Write-Host '$test = ''{"phone":"201015544028","message":"🎯 Your Turn! - HYPER1\n\nTicket: BRE-001\nPlease proceed to Customer Service\n\nThank you! 🙏","organizationId":"def924ee-c394-4772-8129-de7f818ecee9","ticketId":"test-ticket","notificationType":"your_turn"}''; Invoke-RestMethod -Uri "http://localhost:3001/api/notifications/whatsapp" -Method POST -ContentType "application/json" -Body $test' -ForegroundColor Green

Write-Host "`n✅ Expected Result:" -ForegroundColor Green
Write-Host "You should receive the 'Your Turn' message on WhatsApp!" -ForegroundColor White

Write-Host "`n=== End of Guide ===" -ForegroundColor Cyan
