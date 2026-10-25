@echo off
setlocal
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 goto docker_missing

docker info >nul 2>&1
if errorlevel 1 goto docker_not_running

echo Construction et demarrage d'Orbita...
docker compose up --build -d
if errorlevel 1 goto startup_failed

set "orbita_port=8080"
for /f "tokens=2 delims=:" %%P in ('docker compose port app 8080 2^>nul') do set "orbita_port=%%P"

echo Attente du demarrage de l'application...
set "attempt=0"
:wait_for_app
curl.exe --fail --silent "http://127.0.0.1:%orbita_port%/api/health" >nul 2>&1
if not errorlevel 1 goto ready
set /a attempt+=1
if %attempt% geq 60 goto startup_timeout
timeout /t 2 /nobreak >nul
goto wait_for_app

:ready
echo Orbita est prete : http://127.0.0.1:%orbita_port%/
start "" "http://127.0.0.1:%orbita_port%/"
exit /b 0

:docker_missing
echo Docker Desktop est requis. Installez-le puis relancez run.cmd.
exit /b 1

:docker_not_running
echo Demarrez Docker Desktop puis relancez run.cmd.
exit /b 1

:startup_failed
echo Le demarrage a echoue. Consultez les journaux avec : docker compose logs --tail 80 app
exit /b 1

:startup_timeout
echo Orbita ne repond pas apres 120 secondes. Journaux de l'application :
docker compose logs --tail 80 app
exit /b 1
