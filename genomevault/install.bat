@echo off
:: GenomeVault Windows Installer
:: Run: install.bat

echo.
echo  ================================================
echo   GenomeVault - Dependency Installer (Windows)
echo  ================================================
echo.

:: Check Node.js
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo [ERR] Node.js not found. Install from https://nodejs.org
  pause && exit /b 1
)
echo [OK] Node.js found

:: Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo [ERR] Python not found. Install from https://python.org
  pause && exit /b 1
)
echo [OK] Python found

echo.
echo [1/4] Installing contracts dependencies...
cd contracts
call npm install
IF %ERRORLEVEL% NEQ 0 ( echo [ERR] contracts npm install failed && pause && exit /b 1 )
cd ..

echo [2/4] Installing backend dependencies...
cd backend
call npm install
IF %ERRORLEVEL% NEQ 0 ( echo [ERR] backend npm install failed && pause && exit /b 1 )
cd ..

echo [3/4] Installing genomic service...
cd genomic-service
pip install -r requirements.txt -q
IF %ERRORLEVEL% NEQ 0 ( echo [ERR] pip install failed && pause && exit /b 1 )
cd ..

echo [4/4] Installing frontend dependencies...
cd frontend
call npm install
IF %ERRORLEVEL% NEQ 0 ( echo [ERR] frontend npm install failed && pause && exit /b 1 )
cd ..

:: Create env files
IF NOT EXIST backend\.env (
  copy backend\.env.example backend\.env
  echo [OK] backend/.env created - fill in your keys
)
IF NOT EXIST frontend\.env.local (
  copy frontend\.env.local.example frontend\.env.local
  echo [OK] frontend/.env.local created
)

echo.
echo  ================================================
echo   Installation complete!
echo  ================================================
echo.
echo  Start in this order (separate terminals):
echo.
echo  1. cd contracts  ^&^& npx hardhat node
echo  2. cd contracts  ^&^& npx hardhat run scripts/deploy.js --network localhost
echo  3. cd backend    ^&^& npm run dev
echo  4. cd genomic-service ^&^& uvicorn main:app --reload --port 8000
echo  5. cd frontend   ^&^& npm run dev
echo.
echo  Then open: http://localhost:3000
echo.
pause
