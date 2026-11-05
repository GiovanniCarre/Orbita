@echo off
pushd "%~dp0.."
python scripts\tasks.py agent
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
