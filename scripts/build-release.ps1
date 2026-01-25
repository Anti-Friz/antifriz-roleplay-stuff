# Build Release Archive for antifriz-roleplay-stuff
# This script creates a module.zip file for Foundry VTT module distribution

$ErrorActionPreference = "Stop"

Write-Host "Building release archive..." -ForegroundColor Cyan

# Define files and folders to include
$items = @(
    "module.json",
    "assets",
    "dist",
    "lang",
    "packs",
    "LICENSE"
)

# Output file
$outputFile = "module.zip"

# Remove old archive if exists
if (Test-Path $outputFile) {
    Write-Host "Removing old $outputFile..." -ForegroundColor Yellow
    Remove-Item $outputFile -Force
}

# Check if all required items exist
$missingItems = @()
foreach ($item in $items) {
    if (-not (Test-Path $item)) {
        $missingItems += $item
    }
}

if ($missingItems.Count -gt 0) {
    Write-Host "Warning: The following items are missing:" -ForegroundColor Yellow
    foreach ($missing in $missingItems) {
        Write-Host "  - $missing" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Get only existing items
$existingItems = $items | Where-Object { Test-Path $_ }

if ($existingItems.Count -eq 0) {
    Write-Host "Error: No files found to archive!" -ForegroundColor Red
    exit 1
}

# Create the archive
Write-Host "Compressing files..." -ForegroundColor Green
Compress-Archive -Path $existingItems -DestinationPath $outputFile -Force

# Get file size
$fileSize = (Get-Item $outputFile).Length / 1MB
$fileSizeFormatted = [string]::Format("{0:0.00}", $fileSize)
Write-Host "Release archive created: $outputFile ($fileSizeFormatted MB)" -ForegroundColor Green

# List contents
Write-Host ""
Write-Host "Archive contents:" -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $outputFile))
$zip.Entries | ForEach-Object {
    Write-Host "  $($_.FullName)" -ForegroundColor Gray
}
$zip.Dispose()

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
