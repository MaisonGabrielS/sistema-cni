$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "public" | Out-Null

foreach ($name in @("index.html", "app.js", "styles.css")) {
    if (Test-Path $name) {
        Move-Item -Path $name -Destination (Join-Path "public" $name) -Force
        Write-Host "Movido: $name -> public\$name"
    } elseif (Test-Path (Join-Path "public" $name)) {
        Write-Host "Já está em public: $name"
    } else {
        Write-Warning "Não encontrei $name na raiz nem em public."
    }
}

Write-Host ""
Write-Host "Estrutura preparada. Confirme que public contém index.html, app.js e styles.css."
