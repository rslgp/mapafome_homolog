@echo off
REM update-version.bat — Windows wrapper for scripts/bump-version.mjs
REM
REM Usage:
REM   update-version.bat              ^(defaults to patch^)
REM   update-version.bat patch        0.1.0 -^> 0.1.1
REM   update-version.bat minor        0.1.0 -^> 0.2.0
REM   update-version.bat major        0.1.0 -^> 1.0.0
REM   update-version.bat 1.2.3        explicit set
REM
REM Bumps package.json then re-stamps public/sw.js + public/version.json.
REM On the next deploy every browser will detect the SW change and force-update.

setlocal
pushd "%~dp0"
node scripts\bump-version.mjs %*
set "EXITCODE=%ERRORLEVEL%"
popd
endlocal & exit /b %EXITCODE%
