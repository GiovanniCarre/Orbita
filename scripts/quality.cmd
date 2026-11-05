@echo off
pushd "%~dp0.."
python scripts\tasks.py quality
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
