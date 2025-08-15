# Console Log Cleanup Script for Admin App
# This script replaces console statements with logger calls

param(
    [string]$RootPath = "D:\ACS\smart-queuing-system\admin\src"
)

Write-Host "Starting console log cleanup for Admin app..."

# Files to process (excluding API routes which should keep console.error for server logging)
$filesToProcess = @(
    "$RootPath\lib\AuthContext.tsx",
    "$RootPath\lib\sessionRecovery.ts", 
    "$RootPath\lib\cacheDetection.ts",
    "$RootPath\lib\ticketCleanup.ts",
    "$RootPath\lib\ticketManagementStrategies.ts",
    "$RootPath\lib\notifications.ts",
    "$RootPath\lib\supabase.ts",
    "$RootPath\components\EditBranchModal.tsx",
    "$RootPath\components\EditDepartmentModal.tsx",
    "$RootPath\components\TicketCleanupManager.tsx",
    "$RootPath\components\ClientErrorBoundary.tsx",
    "$RootPath\app\dashboard\page.tsx",
    "$RootPath\app\organization\page.tsx",
    "$RootPath\app\manage\tree.tsx",
    "$RootPath\app\profile\page.tsx",
    "$RootPath\app\global-error.tsx"
)

# Add logger import to files that need it
$filesToAddImport = @(
    "$RootPath\lib\sessionRecovery.ts",
    "$RootPath\lib\cacheDetection.ts", 
    "$RootPath\lib\ticketCleanup.ts",
    "$RootPath\lib\ticketManagementStrategies.ts",
    "$RootPath\lib\notifications.ts",
    "$RootPath\lib\supabase.ts",
    "$RootPath\components\EditBranchModal.tsx",
    "$RootPath\components\EditDepartmentModal.tsx",
    "$RootPath\components\TicketCleanupManager.tsx",
    "$RootPath\components\ClientErrorBoundary.tsx",
    "$RootPath\app\organization\page.tsx",
    "$RootPath\app\manage\tree.tsx",
    "$RootPath\app\profile\page.tsx",
    "$RootPath\app\global-error.tsx"
)

foreach ($file in $filesToAddImport) {
    if (Test-Path $file) {
        $content = Get-Content $file
        if ($content -notmatch "import.*logger") {
            Write-Host "Adding logger import to $file"
            # Insert import after the first import statement or at the top
            $newContent = @()
            $importAdded = $false
            foreach ($line in $content) {
                $newContent += $line
                if ($line -match "^import" -and -not $importAdded) {
                    $newContent += "import { logger } from '@/lib/logger'"
                    $importAdded = $true
                }
            }
            if (-not $importAdded) {
                $newContent = @("import { logger } from '@/lib/logger'") + $newContent
            }
            $newContent | Set-Content $file
        }
    }
}

# Replace console statements
foreach ($file in $filesToProcess) {
    if (Test-Path $file) {
        Write-Host "Processing $file"
        
        $content = Get-Content $file
        $content = $content -replace 'console\.log\(', 'logger.log('
        $content = $content -replace 'console\.warn\(', 'logger.warn('
        $content = $content -replace 'console\.error\(', 'logger.error('
        $content = $content -replace 'console\.info\(', 'logger.info('
        $content | Set-Content $file
    }
}

Write-Host "Console log cleanup completed!"
