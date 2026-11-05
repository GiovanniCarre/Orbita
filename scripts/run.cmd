@echo off
pushd "%~dp0.."
python scripts\tasks.py run
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
