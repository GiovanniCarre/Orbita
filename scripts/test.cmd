@echo off
pushd "%~dp0.."
python scripts\tasks.py test
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
