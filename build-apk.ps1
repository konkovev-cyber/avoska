# Скрипт для сборки APK с автоматическим поиском Java

Write-Host "Поиск установленной Java..." -ForegroundColor Cyan

# Возможные пути установки JDK
$possiblePaths = @(
    "C:\Program Files\Java\jdk-*",
    "C:\Program Files\Eclipse Adoptium\jdk-*",
    "C:\Program Files\Microsoft\jdk-*",
    "C:\Program Files (x86)\Java\jdk-*",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-*"
)

$javaHome = $null

foreach ($pattern in $possiblePaths) {
    $found = Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $javaHome = $found.FullName
        break
    }
}

if ($javaHome) {
    Write-Host "✓ Java найдена: $javaHome" -ForegroundColor Green
    $env:JAVA_HOME = $javaHome
    $env:PATH = "$javaHome\bin;$env:PATH"
    
    Write-Host "`nПроверка версии Java:" -ForegroundColor Cyan
    & java -version
    
    Write-Host "`n=== Начинаем сборку APK ===" -ForegroundColor Yellow
    Write-Host "Это может занять несколько минут при первом запуске...`n" -ForegroundColor Gray
    
    Set-Location android
    
    # Даем права на выполнение gradlew (если нужно)
    if (Test-Path ".\gradlew.bat") {
        Write-Host "Запуск Gradle..." -ForegroundColor Cyan
        & .\gradlew.bat assembleDebug
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✓ APK успешно собран!" -ForegroundColor Green
            Write-Host "`nФайл находится здесь:" -ForegroundColor Cyan
            $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
            if (Test-Path $apkPath) {
                $fullPath = (Resolve-Path $apkPath).Path
                Write-Host $fullPath -ForegroundColor White
                Write-Host "`nРазмер файла: $((Get-Item $apkPath).Length / 1MB) MB" -ForegroundColor Gray
            }
        }
        else {
            Write-Host "`n✗ Ошибка при сборке APK" -ForegroundColor Red
            Write-Host "Попробуйте открыть проект в Android Studio" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "✗ Файл gradlew.bat не найден" -ForegroundColor Red
    }
    
    Set-Location ..
}
else {
    Write-Host "✗ Java (JDK) не найдена!" -ForegroundColor Red
    Write-Host "`nУстановите JDK 17 или новее:" -ForegroundColor Yellow
    Write-Host "1. Скачайте: https://adoptium.net/" -ForegroundColor Cyan
    Write-Host "2. Установите с опцией 'Add to PATH'" -ForegroundColor Cyan
    Write-Host "3. Перезапустите PowerShell" -ForegroundColor Cyan
    Write-Host "4. Запустите этот скрипт снова`n" -ForegroundColor Cyan
    
    Write-Host "Альтернатива - используйте Android Studio:" -ForegroundColor Yellow
    Write-Host "npx cap open android" -ForegroundColor Cyan
}
