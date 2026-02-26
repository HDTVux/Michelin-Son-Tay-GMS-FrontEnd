@echo off
echo Stopping all Node processes...
taskkill /F /IM node.exe 2>nul

echo Clearing Vite cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
if exist "dist" rmdir /s /q "dist"

echo Starting dev server...
npm run dev
