param(
  [Parameter(Mandatory=$true)][string]$PackagePath,
  [Parameter(Mandatory=$true)][string]$ExpectedSha256,
  [Parameter(Mandatory=$true)][string]$InstallRoot,
  [ValidateSet('main','lite')][string]$RestartMode='main',
  [int]$WaitForPid=0
)

$ErrorActionPreference='Stop'
$managedItems=@('apps','packages','services','scripts','config','assets','package.json','README.md')
$storageLocation=$env:LOCALAPPDATA
if(-not $storageLocation){$storageLocation=$env:TEMP}
$stateRoot=Join-Path $storageLocation 'WOLFE Media Center'
$logFile=Join-Path $stateRoot 'update-install.log'
New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
function Write-UpdateLog([string]$Message){ Add-Content -LiteralPath $logFile -Value "$(Get-Date -Format o)  $Message" }

try {
  Write-UpdateLog 'Starting verified update installation.'
  if(-not (Test-Path -LiteralPath $InstallRoot)){ throw 'The W.O.L.F.E installation folder could not be found.' }
  if(-not (Test-Path -LiteralPath $PackagePath)){ throw 'The downloaded update package could not be found.' }
  $actual=(Get-FileHash -LiteralPath $PackagePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $ExpectedSha256.ToLowerInvariant()){ throw 'The update package failed its checksum verification.' }
  if($WaitForPid -gt 0){
    $limit=(Get-Date).AddMinutes(2)
    while((Get-Process -Id $WaitForPid -ErrorAction SilentlyContinue) -and (Get-Date) -lt $limit){ Start-Sleep -Milliseconds 300 }
  }
  $work=Join-Path $stateRoot ('update-'+[guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  Expand-Archive -LiteralPath $PackagePath -DestinationPath $work -Force
  $payload=Join-Path $work 'WOLFE Media Center'
  if(-not (Test-Path -LiteralPath (Join-Path $payload 'package.json'))){ throw 'The update archive has an unexpected layout.' }
  $backupRoot=Join-Path $InstallRoot 'backups'
  $backup=Join-Path $backupRoot ('update-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Force -Path $backup | Out-Null
  foreach($item in $managedItems){
    $source=Join-Path $InstallRoot $item
    if(Test-Path -LiteralPath $source){ Move-Item -LiteralPath $source -Destination $backup -Force }
  }
  try {
    foreach($item in $managedItems){
      $source=Join-Path $payload $item
      if(Test-Path -LiteralPath $source){ Copy-Item -LiteralPath $source -Destination $InstallRoot -Recurse -Force }
    }
    if(-not (Test-Path -LiteralPath (Join-Path $InstallRoot 'services\media-server\src\server.cjs'))){ throw 'The update did not install a working media server.' }
  } catch {
    Write-UpdateLog "Install failed; restoring backup. $($_.Exception.Message)"
    foreach($item in $managedItems){ $current=Join-Path $InstallRoot $item; if(Test-Path -LiteralPath $current){ Remove-Item -LiteralPath $current -Recurse -Force } }
    foreach($item in $managedItems){ $previous=Join-Path $backup $item; if(Test-Path -LiteralPath $previous){ Move-Item -LiteralPath $previous -Destination $InstallRoot -Force } }
    throw
  }
  Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  Write-UpdateLog 'Update installed successfully. Restarting W.O.L.F.E.'
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $InstallRoot 'scripts\Launch.ps1'),'-Mode',$RestartMode) -WindowStyle Hidden
} catch {
  Write-UpdateLog "Update failed. $($_.Exception.Message)"
}
