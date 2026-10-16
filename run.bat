@echo off
title UzLang Transliteration Server
echo ========================================================
echo   UzLang Transliteration Infrastructure Platform
echo   Server ishga tushirilmoqda: http://localhost:8000
echo ========================================================
echo.

cd /d "%~dp0"

if exist "venv\Scripts\python.exe" (
    start http://localhost:8000
    venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo [XATOLIK] 'venv' virtual muhiti topilmadi!
    echo Iltimos, avval quyidagi buyruqlar orqali venv yarating va kutubxonalarni o'rnating:
    echo   python -m venv venv
    echo   venv\Scripts\pip install -r requirements.txt
    pause
)
