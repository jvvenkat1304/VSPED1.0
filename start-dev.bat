@echo off
title V-SPED Dev Server
cd /d K:\V-SPED\VSPED1.0\mobile
echo Starting V-SPED development server...
echo.
echo Scan the QR code with Expo Go on your phone.
echo Press Ctrl+C to stop.
echo.
"C:\Program Files\nodejs\npx.cmd" expo start
pause
