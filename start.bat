@echo off
chcp 65001 >nul
echo ========================================
echo    签签通 V28 启动脚本
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未安装 Node.js，请先安装 https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] 安装后端依赖...
cd /d "%~dp0backend"
if not exist node_modules (
    call npm install
)
echo.

echo [2/4] 启动后端服务...
start "签签通后端" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 3 /nobreak >nul

echo [3/4] 安装前端依赖...
cd /d "%~dp0frontend"
if not exist node_modules (
    call npm install
)
echo.

echo [4/4] 启动前端服务...
start "签签通前端" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    启动完成！
echo ========================================
echo.
echo   后端: http://localhost:3000
echo   前端: http://localhost:5173
echo.
echo   按任意键打开浏览器...
pause >nul

start http://localhost:5173
