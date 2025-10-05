Write-Host "Starting Cooperative Gathering Registration System for Mobile Access..." -ForegroundColor Green
Write-Host ""
Write-Host "Your computer's IP address: 192.168.1.6" -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend will run on: http://192.168.1.6:8000" -ForegroundColor Cyan
Write-Host "Frontend will run on: http://192.168.1.6:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mobile access URLs:" -ForegroundColor Yellow
Write-Host "- Frontend: http://192.168.1.6:3000" -ForegroundColor White
Write-Host "- Backend API: http://192.168.1.6:8000" -ForegroundColor White
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd backend && node index.js" -WindowStyle Normal
Write-Host ""
Write-Host "Waiting 3 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "Starting frontend server..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd frontend && npm start" -WindowStyle Normal
Write-Host ""
Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Once both are running, you can access the app from your mobile phone at:" -ForegroundColor Yellow
Write-Host "http://192.168.1.6:3000" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "- Admin: admin / admin123" -ForegroundColor White
Write-Host "- Staff: staff / staff123" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
