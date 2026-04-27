Set-Location -Path $PSScriptRoot
if (Test-Path .\venv\Scripts\python.exe) {
    .\venv\Scripts\python.exe app.py
} else {
    Write-Error "Nao foi possivel encontrar o Python do venv em $PWD\venv\Scripts\python.exe"
    Write-Output "Crie o ambiente virtual com: python -m venv venv"
}
