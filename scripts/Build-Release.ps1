param(
  [Parameter(Mandatory=$true)][string]$Version,
  [string]$Notes='Release notes are available in W.O.L.F.E Settings.'
)
$ErrorActionPreference='Stop'
if($Version -notmatch '^\d+\.\d+\.\d+$'){ throw 'Version must use major.minor.patch, for example 1.4.0.' }
$root=Split-Path -Parent $PSScriptRoot
$installedVersion=(Get-Content -Raw (Join-Path $root 'package.json') | ConvertFrom-Json).version
if($installedVersion -ne $Version){ throw "Package version is $installedVersion; update package.json before building release $Version." }
$output=Join-Path $root 'releases'
$work=Join-Path $env:TEMP ('wolfe-release-'+[guid]::NewGuid().ToString())
$payload=Join-Path $work 'WOLFE Media Center'
New-Item -ItemType Directory -Force -Path $payload,$output | Out-Null
$items=@('apps','packages','services','scripts','config','assets','package.json','README.md')
foreach($item in $items){ $source=Join-Path $root $item; if(Test-Path -LiteralPath $source){ Copy-Item -LiteralPath $source -Destination $payload -Recurse -Force } }
$zipName="wolfe-media-$Version-windows.zip"
$zipPath=Join-Path $output $zipName
if(Test-Path -LiteralPath $zipPath){ Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -LiteralPath $payload -DestinationPath $zipPath -Force
$hash=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest=[ordered]@{schemaVersion=1;channel='stable';version=$Version;publishedAt=(Get-Date).ToUniversalTime().ToString('o');notes=$Notes;package=[ordered]@{name=$zipName;sha256=$hash;size=(Get-Item -LiteralPath $zipPath).Length};signature=[ordered]@{algorithm='reserved';value=''}}
$manifestPath=Join-Path $output 'release-manifest.json'
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Remove-Item -LiteralPath $work -Recurse -Force
Write-Output "Created $zipPath"
Write-Output "Created $manifestPath"
