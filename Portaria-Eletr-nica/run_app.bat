@echo off
cd /d %~dp0
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe app.py
) else (
    echo Nao foi possivel encontrar o Python do venv em %CD%\venv\Scripts\python.exe
    echo Crie o ambiente virtual com: python -m venv venv
)
