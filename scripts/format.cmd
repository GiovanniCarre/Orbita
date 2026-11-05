@echo off
pushd "%~dp0.."
python scripts\tasks.py format
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
