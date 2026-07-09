$ErrorActionPreference = "Stop"

if (-not $env:RENDER_API_KEY) {
  Write-Host "RENDER_API_KEY がありません" -ForegroundColor Red
  exit 1
}

$headers = @{
  Authorization = "Bearer $env:RENDER_API_KEY"
  Accept = "application/json"
}

Write-Host "Render services を取得中..." -ForegroundColor Cyan

$servicesResponse = Invoke-RestMethod `
  -Uri "https://api.render.com/v1/services?limit=100" `
  -Headers $headers `
  -Method Get

$services = @()

foreach ($item in $servicesResponse) {
  if ($item.service) {
    $services += $item.service
  } else {
    $services += $item
  }
}

$result = @()

foreach ($svc in $services) {
  $id = $svc.id
  $name = $svc.name
  $type = $svc.type

  Write-Host "Checking: $name ($id)" -ForegroundColor Yellow

  try {
    $envVarsResponse = Invoke-RestMethod `
      -Uri "https://api.render.com/v1/services/$id/env-vars?limit=100" `
      -Headers $headers `
      -Method Get

    foreach ($envItem in $envVarsResponse) {
      $envVar = if ($envItem.envVar) { $envItem.envVar } else { $envItem }

      if ($envVar.key -match "DATABASE_URL|POSTGRES|DATABASE") {
        $value = $envVar.value

        $masked = $value
        if ($masked) {
          $masked = $masked -replace '://([^:]+):([^@]+)@', '://$1:****@'
        }

        $result += [pscustomobject]@{
          ServiceName = $name
          ServiceId   = $id
          ServiceType = $type
          Key         = $envVar.key
          ValueMasked = $masked
          Value       = $value
        }
      }
    }
  } catch {
    Write-Host "  env vars取得失敗: $($_.Exception.Message)" -ForegroundColor DarkYellow
  }
}

$result |
  Select-Object ServiceName, ServiceType, Key, ValueMasked |
  Format-Table -Wrap

$result |
  Export-Clixml .\render-database-urls.secret.xml

$result |
  Select-Object ServiceName, ServiceType, Key, ValueMasked |
  Export-Csv .\render-database-urls-masked.csv -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "保存しました:" -ForegroundColor Green
Write-Host ".\render-database-urls.secret.xml  実値あり。外に出さない"
Write-Host ".\render-database-urls-masked.csv  表示用"
