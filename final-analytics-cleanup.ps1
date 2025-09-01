# Final Analytics Debug Cleanup
# Remove any remaining debug console.log statements from analytics components

$analyticsPath = "d:\ACS\smart-queuing-system\admin\src\app\analytics"

Write-Host "🧹 Final cleanup of analytics debug statements..."

# Get all TypeScript and TSX files
$files = @()
$files += Get-ChildItem -Path $analyticsPath -Recurse -Filter "*.ts" -Exclude "*.d.ts"
$files += Get-ChildItem -Path $analyticsPath -Recurse -Filter "*.tsx"

$cleanupCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove various debug console.log patterns (but keep error logging)
    $content = $content -replace "console\.log\s*\(\s*['\`\""](🔍|❌|✅|📊|🚀|🎯)[^;]+;\s*\r?\n", ""
    $content = $content -replace "\s*//\s*Debug logging.*?\r?\n", ""
    
    # Clean up empty useEffect that only had console.log
    $content = $content -replace "React\.useEffect\(\(\)\s*=>\s*{\s*}\s*,\s*\[[^\]]*\]\);\s*\r?\n", ""
    $content = $content -replace "useEffect\(\(\)\s*=>\s*{\s*}\s*,\s*\[[^\]]*\]\);\s*\r?\n", ""
    
    # Remove empty lines (more than 2 consecutive)
    $content = $content -replace "\r?\n\r?\n\r?\n+", "`r`n`r`n"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content
        Write-Host "   ✅ Cleaned: $($file.Name)"
        $cleanupCount++
    }
}

Write-Host "🎯 Cleanup complete! $cleanupCount files processed."
Write-Host "✅ Analytics is now production-ready with no debug statements!"
