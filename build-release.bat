@echo off
REM Build Release Archive for antifriz-roleplay-stuff
REM This script creates a module.zip file for Foundry VTT module distribution

echo Building release archive...

REM Remove old archive if exists
if exist module.zip (
    echo Removing old module.zip...
    del /F /Q module.zip
)

REM Use PowerShell to create the archive
echo Compressing files...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { Compress-Archive -Path 'module.json', 'assets', 'dist', 'lang', 'packs', 'LICENSE' -DestinationPath 'module.zip' -Force -ErrorAction SilentlyContinue }"

if exist module.zip (
    echo.
    echo ✓ Release archive created: module.zip
    echo.
    for %%A in (module.zip) do echo File size: %%~zA bytes
    echo.
    echo ✓ Build complete!
) else (
    echo.
    echo × Error: Failed to create archive
    echo Make sure all required files exist: module.json, dist/, lang/, LICENSE
    exit /b 1
)
