@echo off
rem Usage: update.bat "C:\path\to\Dashboard_Kontrak_FY27.xlsm"   (run it daily with Windows Task Scheduler)
cd /d "%~dp0.."
python scripts\excel_to_json.py %1 data\data.json || exit /b 1
git add data/data.json
git commit -m "daily data update"
git push
