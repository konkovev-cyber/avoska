# APK Build Script

Write-Host "Searching for Java..." -ForegroundColor Cyan

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
    Write-Host "Java found: $javaHome" -ForegroundColor Green
    $env:JAVA_HOME = $javaHome
    $env:PATH = "$javaHome\bin;" + $env:PATH
    
    Write-Host "Checking Java version:" -ForegroundColor Cyan
    java -version
    
    Write-Host "=== Starting APK build ===" -ForegroundColor Yellow
    
    Set-Location android
    
    if (Test-Path ".\gradlew.bat") {
        Write-Host "Running Gradle..." -ForegroundColor Cyan
        ./gradlew.bat assembleDebug
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "APK build successful!" -ForegroundColor Green
            $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
            if (Test-Path $apkPath) {
                $fullPath = (Resolve-Path $apkPath).Path
                Write-Host "File location: $fullPath" -ForegroundColor White
            }
        }
        else {
            Write-Host "Error during APK build" -ForegroundColor Red
        }
    }
    else {
        Write-Host "gradlew.bat not found" -ForegroundColor Red
    }
    
    Set-Location ..
}
else {
    Write-Host "Java (JDK) not found!" -ForegroundColor Red
}
