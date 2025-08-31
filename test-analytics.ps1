# PowerShell script to test and manually trigger analytics processing
param(
    [string]$AdminKey = "nBxffbNel9l28dpL7L3Ue0QJxEqAZlhV",
    [string]$FunctionUrl = "https://xxaqztdwdjgrkdyfnjvr.supabase.co/functions/v1/cleanup-database"
)

Write-Host "ANALYTICS DIAGNOSIS AND TEST" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow
Write-Host ""

# Test the cleanup function with dry run to see analytics processing
Write-Host "1. Testing analytics processing with cleanup function (dry run)..." -ForegroundColor Cyan

# Create request body
$testBody = @{
    adminKey = $AdminKey
    dryRun = $true
    cleanupType = "both"
} | ConvertTo-Json

try {
    # Note: Using basic content type since we don't have the anon key
    $response = Invoke-RestMethod -Uri $FunctionUrl -Method POST -Body $testBody -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Function executed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Analyze the response for analytics information
    if ($response.organizationResults) {
        foreach ($orgResult in $response.organizationResults) {
            Write-Host "Organization: $($orgResult.organizationName)" -ForegroundColor Yellow
            
            if ($orgResult.analyticsProcessed) {
                $analytics = $orgResult.analyticsProcessed
                Write-Host "  Analytics Processing:" -ForegroundColor White
                Write-Host "    ✅ Success: $($analytics.success)" -ForegroundColor $(if($analytics.success) { "Green" } else { "Red" })
                Write-Host "    📊 Records Processed: $($analytics.recordsProcessed)" -ForegroundColor White
                Write-Host "    ⏱️  Execution Time: $($analytics.executionTimeMs)ms" -ForegroundColor White
                Write-Host "    📅 Date Processed: $($analytics.processedDate)" -ForegroundColor White
                
                if ($analytics.error) {
                    Write-Host "    ❌ ERROR: $($analytics.error)" -ForegroundColor Red
                }
            } else {
                Write-Host "  ❌ No analytics processing info in response" -ForegroundColor Red
            }
            
            Write-Host "  Tickets: $($orgResult.ticketsProcessed) processed" -ForegroundColor Gray
            Write-Host "  Notifications: $($orgResult.notificationsProcessed) processed" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    Write-Host "DIAGNOSIS BASED ON RESULTS:" -ForegroundColor Green
    Write-Host ""
    
    $hasAnalyticsSuccess = $false
    $hasAnalyticsData = $false
    
    foreach ($orgResult in $response.organizationResults) {
        if ($orgResult.analyticsProcessed -and $orgResult.analyticsProcessed.success) {
            $hasAnalyticsSuccess = $true
            if ($orgResult.analyticsProcessed.recordsProcessed -gt 0) {
                $hasAnalyticsData = $true
            }
        }
    }
    
    if ($hasAnalyticsSuccess) {
        Write-Host "✅ Analytics processing function is working" -ForegroundColor Green
        
        if ($hasAnalyticsData) {
            Write-Host "✅ Analytics data is being processed and stored" -ForegroundColor Green
            Write-Host ""
            Write-Host "🔍 LIKELY ISSUE:" -ForegroundColor Yellow
            Write-Host "Your Enhanced Analytics is showing 0/N/A because:" -ForegroundColor White
            Write-Host "1. The analytics processing only runs during cleanup (typically daily)" -ForegroundColor White
            Write-Host "2. Your admin app is querying analytics tables, but they may be empty" -ForegroundColor White
            Write-Host "3. Analytics are processed for 'yesterday' but your app might be looking at 'today'" -ForegroundColor White
            Write-Host ""
            Write-Host "🛠️  SOLUTION:" -ForegroundColor Green
            Write-Host "1. Run your GitHub Action manually to process yesterday's data" -ForegroundColor White
            Write-Host "2. Or wait for the nightly cleanup to populate analytics tables" -ForegroundColor White
            Write-Host "3. Check if your admin app time filters match the analytics data dates" -ForegroundColor White
        } else {
            Write-Host "⚠️  Analytics function works but no data processed" -ForegroundColor Yellow
            Write-Host "This means there were no tickets to analyze yesterday" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Analytics processing is failing" -ForegroundColor Red
        Write-Host "Check the error messages above for database/function issues" -ForegroundColor White
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ FAILED - Status Code: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 401) {
        Write-Host "Authentication failed - this test requires the anon key" -ForegroundColor Yellow
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎯 NEXT STEPS TO FIX ENHANCED ANALYTICS:" -ForegroundColor Green
Write-Host "1. Trigger your GitHub Action to process analytics: https://github.com/mostafalamey/smart-queuing-system/actions" -ForegroundColor White
Write-Host "2. Check that your time range in the admin app matches analytics data (try Last 7 Days)" -ForegroundColor White  
Write-Host "3. Verify you have completed tickets in the past week to analyze" -ForegroundColor White
Write-Host "4. Analytics process data for completed/cancelled tickets only" -ForegroundColor White
