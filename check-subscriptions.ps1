# Check existing push subscriptions
$checkQuery = @"
SELECT 
    id,
    organization_id,
    customer_phone,
    endpoint,
    is_active,
    created_at
FROM push_subscriptions 
WHERE organization_id = 'def924ee-c304-4772-8129-de97818e6ee9'
ORDER BY created_at DESC
LIMIT 10
"@ | ConvertTo-Json

Write-Host "Checking push subscriptions in database..." -ForegroundColor Yellow

$checkApiUrl = "http://localhost:3001/api/test/db-query"
try {
    $result = Invoke-RestMethod -Uri $checkApiUrl -Method POST -ContentType "application/json" -Body $checkQuery
    Write-Host "Query successful!" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3 | Write-Host
} catch {
    Write-Host "API endpoint not available. Checking with direct Supabase query..." -ForegroundColor Yellow
    
    # Alternative approach - create a simple test file
    $testQuery = @"
{
  "method": "select", 
  "table": "push_subscriptions",
  "columns": "*",
  "filters": {"organization_id": "def924ee-c304-4772-8129-de97818e6ee9"},
  "limit": 10
}
"@
    
    Write-Host "Test query prepared:" -ForegroundColor Cyan
    Write-Host $testQuery -ForegroundColor White
    
    # Try alternative - test subscription creation
    Write-Host "`nTesting subscription creation API..." -ForegroundColor Yellow
    $testSub = @{
        organizationId = "def924ee-c304-4772-8129-de97818e6ee9"
        customerPhone = "201015544028"
        subscription = @{
            endpoint = "https://test.endpoint.com/test"
            keys = @{
                p256dh = "test-p256dh-key"
                auth = "test-auth-key"
            }
        }
        userAgent = "Test-Agent"
    } | ConvertTo-Json -Depth 3
    
    try {
        $subResult = Invoke-RestMethod -Uri "http://localhost:3001/api/notifications/subscribe" -Method POST -ContentType "application/json" -Body $testSub
        Write-Host "Subscription test result:" -ForegroundColor Green
        $subResult | ConvertTo-Json -Depth 3 | Write-Host
    } catch {
        Write-Host "Subscription test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
