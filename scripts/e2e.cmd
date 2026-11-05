@echo off
pushd "%~dp0.."
python scripts\tasks.py e2e
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
