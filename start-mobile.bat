@echo off
echo Starting Cooperative Gathering Registration System for Mobile Access...
echo.
echo Your computer's IP address: 192.168.1.6
echo.
echo Backend will run on: http://192.168.1.6:8000
echo Frontend will run on: http://192.168.1.6:3000
echo.
echo Mobile access URLs:
echo - Frontend: http://192.168.1.6:3000
echo - Backend API: http://192.168.1.6:8000
echo.
echo Starting backend server...
start "Backend Server" cmd /k "cd backend && node index.js"
echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul
echo.
echo Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run start-mobile"
echo.
echo Both servers are starting...
echo.
echo Once both are running, you can access the app from your mobile phone at:
echo http://192.168.1.6:3000
echo.
echo Default login credentials:
echo - Admin: admin / admin123
echo - Staff: staff / staff123
echo.
pause
