# Builds the production Android APK for direct download (rici.esprog.eu/app).
# Needs the RICI release key in ~/.gradle/gradle.properties (docs/setup/ANDROID_APK.md); without
# it the APK would be signed with the debug key and this script stops.
# Run from anywhere:  & C:\dev\ricingo\apps\mobile\scripts\build-release-apk.ps1
$ErrorActionPreference = 'Stop'

$mobile = Split-Path -Parent $PSScriptRoot
$gradleProps = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
if (-not (Select-String -Path $gradleProps -Pattern '^RICI_RELEASE_STORE_FILE=' -Quiet)) {
    throw "RICI release key is not configured in $gradleProps (see docs/setup/ANDROID_APK.md)."
}

$env:APP_ENV = 'production'
$env:RICI_API_URL = 'https://api.rici.esprog.eu'

Push-Location $mobile
try {
    npx expo prebuild --platform android --clean --no-install
    if ($LASTEXITCODE -ne 0) { throw 'expo prebuild failed' }
    Push-Location android
    try {
        # Phones only (ARM): x86 is for emulators and would double the size and the build time.
        .\gradlew.bat assembleRelease '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a'
        if ($LASTEXITCODE -ne 0) { throw 'gradle assembleRelease failed' }
    } finally { Pop-Location }

    $apk = Join-Path $mobile 'android\app\build\outputs\apk\release\app-release.apk'
    $out = Join-Path $mobile 'dist-apk'
    New-Item -ItemType Directory -Force $out | Out-Null
    Copy-Item $apk (Join-Path $out 'italstina-rici.apk') -Force
    Write-Host "APK: $(Join-Path $out 'italstina-rici.apk')"
} finally { Pop-Location }
