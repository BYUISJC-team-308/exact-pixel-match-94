@echo off
REM Handshake Weekly Free Food Scraper Runner
REM Runs in the project directory, logs output to data\handshake\scheduler.log

cd /d "C:\Users\bryce\OneDrive\Documents\IS Social Credit\IS401 Website"

echo ======================================================== >> "data\handshake\scheduler.log"
echo Scraper started at: %DATE% %TIME% >> "data\handshake\scheduler.log"
echo ======================================================== >> "data\handshake\scheduler.log"

"C:\Users\bryce\AppData\Local\Programs\Python\Python313\python.exe" scripts\handshake_scraper.py --scrape --pages 3 >> "data\handshake\scheduler.log" 2>&1

echo Scraper finished at: %DATE% %TIME% >> "data\handshake\scheduler.log"
echo. >> "data\handshake\scheduler.log"
