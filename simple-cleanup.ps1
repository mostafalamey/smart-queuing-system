# Simple cleanup script for console.log statements
Write-Host "Cleaning up console.log statements..."

$analyticsFiles = @(
    "admin\src\hooks\useHistoricalTicketData.ts",
    "admin\src\hooks\useRealTimeQueueData.ts", 
    "admin\src\components\analytics\RealTimeAnalyticsDashboard.tsx"
)

foreach ($file in $analyticsFiles) {
    $fullPath = "d:\ACS\smart-queuing-system\$file"
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file"
        $content = Get-Content $fullPath -Raw
        
        # Remove console.log statements with emoji patterns
        $content = $content -replace 'console\.log\s*\([^)]*[🔍❌✅📊🚀🎯][^)]*\)\s*;?\s*', ''
        
        # Remove other console.log statements
        $content = $content -replace 'console\.log\s*\([^)]*\)\s*;?\s*', ''
        
        # Clean up extra blank lines
        $content = $content -replace '\r?\n\s*\r?\n\s*\r?\n', "`r`n`r`n"
        
        Set-Content $fullPath $content -NoNewline
        Write-Host "Cleaned: $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Cleanup completed!"
