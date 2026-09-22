param([ValidateSet('main','lite')][string]$Mode='main')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$expectedVersion='0.9.20'
try {
  $nodePath=(Get-Command node.exe -ErrorAction Stop).Source
  $edgeCandidates=@("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe")
  $edgePath=$edgeCandidates | Where-Object {Test-Path -LiteralPath $_} | Select-Object -First 1
  if(-not $edgePath){throw 'Microsoft Edge is required. Install it and try again.'}

  $baseUrl=$null
  $health=$null
  $startPort=$null
  foreach($port in 47831..47869){
    $candidate="http://127.0.0.1:$port"
    $candidateHealth=$null
    try{$candidateHealth=Invoke-RestMethod "$candidate/api/health" -TimeoutSec 1}catch{}
    if($candidateHealth -and $candidateHealth.app -eq 'wolfe-media-center' -and $candidateHealth.version -eq $expectedVersion -and $candidateHealth.root -eq $projectRoot){
      $baseUrl=$candidate
      $health=$candidateHealth
      break
    }
    if(-not $candidateHealth -and -not $startPort){$startPort=$port}
  }

  if(-not $baseUrl){
    if(-not $startPort){throw 'No free W.O.L.F.E local port is available between 47831 and 47869.'}
    $baseUrl="http://127.0.0.1:$startPort"
    $previousPort=$env:WOLFE_PORT
    $env:WOLFE_PORT=[string]$startPort
    Start-Process -FilePath $nodePath -ArgumentList @('"'+(Join-Path $projectRoot 'services\media-server\src\server.cjs')+'"') -WorkingDirectory $projectRoot -WindowStyle Hidden
    if($null -eq $previousPort){Remove-Item Env:WOLFE_PORT -ErrorAction SilentlyContinue}else{$env:WOLFE_PORT=$previousPort}
    for($attempt=0;$attempt -lt 30;$attempt++){
      Start-Sleep -Milliseconds 200
      try{$health=Invoke-RestMethod "$baseUrl/api/health" -TimeoutSec 1;if($health.app -eq 'wolfe-media-center' -and $health.version -eq $expectedVersion -and $health.root -eq $projectRoot){break}}catch{}
    }
    if(-not $health -or $health.app -ne 'wolfe-media-center' -or $health.version -ne $expectedVersion -or $health.root -ne $projectRoot){throw 'The current W.O.L.F.E build did not start.'}
  }
  Start-Process -FilePath $edgePath -ArgumentList @("--app=$baseUrl/?mode=$Mode",'--start-fullscreen')
}catch{
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($_.Exception.Message,'W.O.L.F.E launch error') | Out-Null
  exit 1
}

