@echo off
setlocal

cd /d "%~dp0"
set "REMOTE_URL=https://github.com/wms365com-dev/dispatcher365.git"

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed or not on PATH.
  exit /b 1
)

if not exist ".git" (
  echo Initializing Git repository...
  git -c safe.directory="%CD%" init -b main
  if errorlevel 1 exit /b 1
)

git -c safe.directory="%CD%" config --get user.name >nul 2>nul
if errorlevel 1 (
  echo Git user.name is not set.
  echo Run: git config --global user.name "Your Name"
  exit /b 1
)

git -c safe.directory="%CD%" config --get user.email >nul 2>nul
if errorlevel 1 (
  echo Git user.email is not set.
  echo Run: git config --global user.email "you@example.com"
  exit /b 1
)

for /f "delims=" %%i in ('git -c safe.directory^="%CD%" remote get-url origin 2^>nul') do set "CURRENT_REMOTE=%%i"
if not defined CURRENT_REMOTE (
  git -c safe.directory="%CD%" remote add origin %REMOTE_URL%
  if errorlevel 1 exit /b 1
  echo Added origin: %REMOTE_URL%
) else (
  if /I not "%CURRENT_REMOTE%"=="%REMOTE_URL%" (
    git -c safe.directory="%CD%" remote set-url origin %REMOTE_URL%
    if errorlevel 1 exit /b 1
    echo Updated origin to: %REMOTE_URL%
  )
)

git -c safe.directory="%CD%" add .
if errorlevel 1 exit /b 1

if "%~1"=="" (
  set /p COMMIT_MSG=Enter commit message:
) else (
  set COMMIT_MSG=%~1
)

if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update WMS 365 Dispatch

git -c safe.directory="%CD%" diff --cached --quiet
if errorlevel 1 (
  git -c safe.directory="%CD%" commit -m "%COMMIT_MSG%"
  if errorlevel 1 exit /b 1
) else (
  echo No staged changes to commit.
  set /p EMPTY_COMMIT=Create an empty commit to trigger redeploy? (Y/N):
  if /I "%EMPTY_COMMIT%"=="Y" (
    git -c safe.directory="%CD%" commit --allow-empty -m "%COMMIT_MSG%"
    if errorlevel 1 exit /b 1
  ) else (
    exit /b 0
  )
)

git -c safe.directory="%CD%" push -u origin main
if errorlevel 1 (
  echo.
  echo Normal push was rejected. The remote main branch already has different history.
  set /p FORCE_PUSH=Replace remote main with this local app using force-with-lease? (Y/N):
  if /I "%FORCE_PUSH%"=="Y" (
    git -c safe.directory="%CD%" push --force-with-lease -u origin main
    exit /b %errorlevel%
  ) else (
    echo Push canceled without overwriting remote history.
    exit /b 1
  )
)

exit /b 0
