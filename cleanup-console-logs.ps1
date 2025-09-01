# Production Cleanup Script
# Removes debug console.log statements from analytics code

$analyticsPath = "d:\ACS\smart-queuing-system\admin\src\app\analytics"

# Get all TypeScript files in analytics directory
$files = Get-ChildItem -Path $analyticsPath -Recurse -Filter "*.ts" -Exclude "*.d.ts"
$files += Get-ChildItem -Path $analyticsPath -Recurse -Filter "*.tsx"

foreach ($file in $files) {
    Write-Host "Processing: $($file.FullName)"
    
    $content = Get-Content $file.FullName -Raw
    
    # Remove debug console.log statements (keep error logging)
    $content = $content -replace "console\.log\([^;]*console\.log.*?;\s*", ""
    $content = $content -replace "\s*console\.log\(.*?\);\s*", "`n"
    
    # Clean up multiple blank lines
    $content = $content -replace "`n`n`n+", "`n`n"
    
    Set-Content -Path $file.FullName -Value $content
}

Write-Host "✅ Production cleanup completed!"
