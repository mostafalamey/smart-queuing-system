# Setup script for testing WhatsApp notifications with ngrok and dev server
# This will help expose localhost:3001 and configure UltraMsg webhook

Write-Host "🚀 Setting up ngrok for WhatsApp notification testing" -ForegroundColor Yellow
Write-Host ""

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version
    Write-Host "✅ ngrok found: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok not found. Please install ngrok first:" -ForegroundColor Red
    Write-Host "   1. Download from: https://ngrok.com/download"
    Write-Host "   2. Or install via chocolatey: choco install ngrok"
    Write-Host "   3. Or install via scoop: scoop install ngrok"
    exit 1
}

Write-Host ""
Write-Host "📋 Setup Instructions:" -ForegroundColor Cyan
Write-Host "1. Make sure your admin dev server is running on localhost:3001"
Write-Host "2. Run ngrok to expose the admin server:"
Write-Host "   ngrok http 3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok-free.app)"
Write-Host ""
Write-Host "4. Update UltraMsg webhook to use the ngrok URL:"
Write-Host "   - Login to UltraMsg dashboard"
Write-Host "   - Go to Settings > Webhooks" 
Write-Host "   - Set webhook URL to: https://your-ngrok-url.ngrok-free.app/api/whatsapp/webhook"
Write-Host ""
Write-Host "5. Test the notification preferences fix:"
Write-Host "   - Create a ticket with 'Both' notifications selected"
Write-Host "   - Use queue progression commands to test"
Write-Host "   - Watch the console logs in real-time!"
Write-Host ""

$response = Read-Host "Press Enter to start ngrok, or type 'skip' to do it manually"

if ($response -ne "skip") {
    Write-Host "Starting ngrok on port 3001..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop ngrok when done testing" -ForegroundColor Yellow
    Write-Host ""
    
    # Start ngrok
    ngrok http 3001
}
