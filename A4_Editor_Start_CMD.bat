@echo off
echo Starting A4 Editor...
echo.
echo Starting server...
cd "C:\Users\su.ray\OneDrive - Reply\Suddha\Personal Projects\a4-editor"

REM Start npm server (no browser window)
start /min cmd /c "set BROWSER=none&&npm start"

REM Check if port 3001 is listening
echo Waiting for server to be ready...
:WAIT
timeout /t 1 /nobreak > nul
netstat -an | find ":3001" | find "LISTENING" > nul
if errorlevel 1 (
    echo Still waiting...
    goto WAIT
)

REM Server is ready, open browser
echo Server ready! Opening browser...
REM start ["title"] [command/program] [parameters]
start "" http://localhost:3001/

echo.
echo Server is running. You can close this window.
pause