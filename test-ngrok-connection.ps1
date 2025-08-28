# Quick test to verify ngrok connection to dev server
$ngrokUrl = "https://d2a9d716e99c.ngrok-free.app"

Write-Host "Testing ngrok connection..." -ForegroundColor Yellow

# Test with ngrok header
$headers = @{
    "ngrok-skip-browser-warning" = "true"
}

try {
    $response = Invoke-RestMethod -Uri "$ngrokUrl" -Method GET -Headers $headers -TimeoutSec 5
    Write-Host "✅ Connected to dev server successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Connection failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure admin dev server is running on localhost:3001"
    Write-Host "2. Make sure ngrok is forwarding to localhost:3001"
    Write-Host "3. Try accessing $ngrokUrl in browser and click 'Visit Site'"
}
