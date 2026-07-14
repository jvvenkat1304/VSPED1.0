@echo off
title V-SPED Dev Server
set PATH=C:\Program Files\nodejs;%PATH%
cd /d K:\V-SPED\VSPED1.0\mobile
echo Starting V-SPED development server...
echo.
echo Scan the QR code with Expo Go on your phone.
echo Press Ctrl+C to stop.
echo.
npx expo start
pause
