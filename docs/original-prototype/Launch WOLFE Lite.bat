@echo off
cd /d "%~dp0"
set "PAGE=file:///%CD:\=/%/index.html?mode=lite"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --start-fullscreen "%PAGE%" & exit /b
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --start-fullscreen "%PAGE%" & exit /b
start "" "index.html?mode=lite"
