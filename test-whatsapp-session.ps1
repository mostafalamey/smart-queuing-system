# Test WhatsApp Session Creation API
Write-Host "=== Testing Customer App WhatsApp Session API ===" -ForegroundColor Cyan

# Test 1: Check if customer app is running
Write-Host "`n1. Checking if customer app is running on port 3002..." -ForegroundColor Yellow
try {
    $ping = Invoke-RestMethod -Uri "http://localhost:3002/api/test/simple" -Method GET
    Write-Host "✅ Customer app is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Customer app is not accessible" -ForegroundColor Red
    exit 1
}

# Test 2: Test environment debug
Write-Host "`n2. Testing database connectivity..." -ForegroundColor Yellow
try {
    $envDebug = Invoke-RestMethod -Uri "http://localhost:3002/api/test/env-debug" -Method GET
    if ($envDebug.database.whatsappSessionsQuery.hasData -eq $true -or $envDebug.database.whatsappSessionsQuery.error -eq $null) {
        Write-Host "✅ Database connectivity working" -ForegroundColor Green
    } else {
        Write-Host "❌ Database connectivity issue: $($envDebug.database.whatsappSessionsQuery.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Environment debug failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test WhatsApp session creation
Write-Host "`n3. Testing WhatsApp session creation..." -ForegroundColor Yellow
$sessionData = @{
    phone = "966555123456"
    organizationId = "test-customer-session"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3002/api/whatsapp/create-session" -Method POST -ContentType "application/json" -Body $sessionData
    Write-Host "✅ Session creation successful!" -ForegroundColor Green
    Write-Host "Response: $($result | ConvertTo-Json -Depth 2)" -ForegroundColor White
} catch {
    Write-Host "❌ Session creation failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get detailed error
    try {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $errorStream = $errorResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error details: $errorBody" -ForegroundColor Red
        }
    } catch {
        Write-Host "Could not get detailed error information" -ForegroundColor Red
    }
}

# Test 4: Verify session was created
Write-Host "`n4. Verifying session was created..." -ForegroundColor Yellow
try {
    $check = Invoke-RestMethod -Uri "http://localhost:3002/api/whatsapp/create-session?phone=966555123456" -Method GET
    if ($check.hasActiveSession) {
        Write-Host "✅ Session verification successful - session exists!" -ForegroundColor Green
    } else {
        Write-Host "❌ No active session found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Session verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
