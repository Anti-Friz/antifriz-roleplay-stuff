# Build Release Archive for antifriz-roleplay-stuff
# This script creates a module.zip file for Foundry VTT module distribution
# Features:
# - Auto-increments patch version (0.0.x)
# - Creates Git commit, tag, and pushes to remote
# - Builds module.zip archive
# - Optionally creates GitHub release

param(
    [switch]$NoVersionBump,
    [switch]$CreateGitHubRelease,
    [string]$ReleaseNotes = "",
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

# ==========================================
# VERSION MANAGEMENT
# ==========================================

if (-not $NoVersionBump) {
    Write-Host "Reading module.json..." -ForegroundColor Cyan
    
    if (-not (Test-Path "module.json")) {
        Write-Host "Error: module.json not found!" -ForegroundColor Red
        exit 1
    }
    
    $moduleJson = Get-Content "module.json" -Raw | ConvertFrom-Json
    $currentVersion = $moduleJson.version
    
    Write-Host "Current version: $currentVersion" -ForegroundColor Yellow
    
    # Parse version (assumes semantic versioning: major.minor.patch)
    $versionParts = $currentVersion -split '\.'
    if ($versionParts.Count -ne 3) {
        Write-Host "Error: Version format should be X.Y.Z (e.g., 0.0.1)" -ForegroundColor Red
        exit 1
    }
    
    # Increment patch version
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2] + 1
    
    $newVersion = "$major.$minor.$patch"
    Write-Host "New version: $newVersion" -ForegroundColor Green
    
    # Update version in module.json
    $moduleJson.version = $newVersion
    
    # Update download URL if it uses version
    if ($moduleJson.download -match "\/v[\d\.]+\/") {
        $moduleJson.download = $moduleJson.download -replace "\/v[\d\.]+\/", "/v$newVersion/"
    }
    
    # Save updated module.json with proper formatting (2-space indent, UTF8 without BOM)
    $jsonFormatted = $moduleJson | ConvertTo-Json -Depth 10
    # Ensure Unix line endings and proper indentation
    $jsonFormatted = $jsonFormatted -replace '(?m)^  ', '  ' # Normalize to 2 spaces
    [System.IO.File]::WriteAllText("$PWD\module.json", $jsonFormatted + "`n", [System.Text.UTF8Encoding]::new($false))
    
    Write-Host "module.json updated!" -ForegroundColor Green
    
    # Store version for later use
    $version = $newVersion
} else {
    Write-Host "Skipping version bump..." -ForegroundColor Yellow
    $moduleJson = Get-Content "module.json" -Raw | ConvertFrom-Json
    $version = $moduleJson.version
}

Write-Host ""

# ==========================================
# GIT OPERATIONS (Commit, Tag, Push)
# ==========================================

if (-not $NoVersionBump) {
    Write-Host "Git operations..." -ForegroundColor Cyan
    
    # Check if git is available
    $gitAvailable = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitAvailable) {
        Write-Host "Error: Git not found!" -ForegroundColor Red
        Write-Host "Git is required for version management." -ForegroundColor Yellow
        exit 1
    }
    
    # Check for uncommitted changes (other than module.json)
    $status = git status --porcelain
    $otherChanges = $status | Where-Object { $_ -notmatch "^\s*[AM]\s+module\.json" }
    if ($otherChanges) {
        Write-Host "Warning: You have uncommitted changes:" -ForegroundColor Yellow
        $otherChanges | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Write-Host ""
        $response = Read-Host "Continue with release? [y/N]"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Host "Release cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
    
    # Add module.json changes
    Write-Host "Creating commit..." -ForegroundColor Cyan
    git add module.json
    git commit -m "Release v$version"
    
    # Create tag
    Write-Host "Creating tag v$version..." -ForegroundColor Cyan
    git tag -a "v$version" -m "Release v$version"
    
    Write-Host "Git commit and tag created!" -ForegroundColor Green
    
    # Push to remote
    if (-not $SkipPush) {
        Write-Host ""
        Write-Host "Pushing to remote..." -ForegroundColor Cyan
        
        try {
            git push
            git push --tags
            Write-Host "Changes pushed to remote!" -ForegroundColor Green
        } catch {
            Write-Host "Error pushing to remote: $_" -ForegroundColor Red
            Write-Host "You may need to push manually: git push && git push --tags" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "Skipping push (use -SkipPush to avoid this)" -ForegroundColor Yellow
        Write-Host "Don't forget to push: git push && git push --tags" -ForegroundColor Yellow
    }
}

Write-Host ""

# ==========================================
# BUILD ARCHIVE
# ==========================================

Write-Host "Building release v$version..." -ForegroundColor Cyan
Write-Host ""

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
Write-Host ""

# ==========================================
# GITHUB RELEASE (Optional)
# ==========================================

if ($CreateGitHubRelease) {
    Write-Host "Creating GitHub release..." -ForegroundColor Cyan
    
    # Check if GitHub CLI is installed
    $ghAvailable = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $ghAvailable) {
        Write-Host "Error: GitHub CLI (gh) not found!" -ForegroundColor Red
        Write-Host "Install it from: https://cli.github.com/" -ForegroundColor Yellow
        Write-Host "Or use: winget install GitHub.cli" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if authenticated
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Not authenticated with GitHub CLI" -ForegroundColor Red
        Write-Host "Run: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    
    # Prepare release notes
    if ([string]::IsNullOrWhiteSpace($ReleaseNotes)) {
        $ReleaseNotes = "Release v$version"
    }
    
    # Create release and upload module.zip
    try {
        Write-Host "Creating release v$version on GitHub..." -ForegroundColor Cyan
        gh release create "v$version" \
            "module.json#module.json" \
            "$outputFile#module.zip"
        
        Write-Host "GitHub release v$version created successfully!" -ForegroundColor Green
        Write-Host "Uploaded: module.zip" -ForegroundColor Green
        
        # Get release URL
        $repoUrl = git config --get remote.origin.url
        $repoUrl = $repoUrl -replace "\.git$", ""
        $repoUrl = $repoUrl -replace "git@github\.com:", "https://github.com/"
        Write-Host "Release URL: $repoUrl/releases/tag/v$version" -ForegroundColor Cyan
    } catch {
        Write-Host "Error creating GitHub release: $_" -ForegroundColor Red
        Write-Host "The tag was pushed, you can create the release manually on GitHub." -ForegroundColor Yellow
        exit 1
    }
}

# ==========================================
# SUMMARY
# ==========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Release Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Version: v$version" -ForegroundColor White
Write-Host "Archive: $outputFile ($fileSizeFormatted MB)" -ForegroundColor White
if (-not $NoVersionBump) {
    if ($SkipPush) {
        Write-Host "Git: Commit and tag created (not pushed)" -ForegroundColor Yellow
    } else {
        Write-Host "Git: Pushed to remote" -ForegroundColor Green
    }
}
if ($CreateGitHubRelease) {
    Write-Host "GitHub Release: Created" -ForegroundColor Green
} else {
    Write-Host "GitHub Release: Not created" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
if ($SkipPush) {
    Write-Host "  1. Push changes: git push && git push --tags" -ForegroundColor Gray
}
if (-not $CreateGitHubRelease) {
    Write-Host "  1. Create GitHub release: .\scripts\build-release.ps1 -NoVersionBump -CreateGitHubRelease" -ForegroundColor Gray
    Write-Host "     Or create manually at: https://github.com/Anti-Friz/antifriz-roleplay-stuff/releases/new" -ForegroundColor Gray
}
Write-Host "  2. Test the module in Foundry VTT" -ForegroundColor Gray
Write-Host ""


