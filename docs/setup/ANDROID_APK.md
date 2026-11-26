# Android aplikace ke stažení (APK) — návod

Dokud aplikace není v Google Play, studenti si ji stahují ze stránky
**https://rici.esprog.eu/app** a instalují přímo (soubor `italstina-rici.apk`). Pro iPhone to
nejde: Apple instalaci z webu nedovolí, verze pro iPhone půjde přes TestFlight nebo App Store
(Apple Developer účet).

## Podpisový klíč — nejdůležitější

Každé APK je podepsané klíčem RICI. **Aktualizace se nainstaluje jen přes verzi podepsanou
stejným klíčem.** Když se klíč ztratí, studenti musí aplikaci odinstalovat (přijdou o data
v telefonu) a nainstalovat znovu.

- Klíč: `%USERPROFILE%\.android-keys\rici-release.jks` (vytvořen 2026-11-26, alias `rici`,
  RSA 4096, platnost 100 let; otisk SHA-256 začíná `42:33:8A:C5`).
- Hesla: `%USERPROFILE%\.gradle\gradle.properties` (`RICI_RELEASE_*`).
- **Zálohujte oba soubory** (správce hesel / šifrované úložiště), nikdy do gitu.
- Při převodu do Google Play se tento klíč nahraje jako „upload key“ / app signing key.

ID aplikace je `eu.esprog.rici` a už se nesmí měnit (`apps/mobile/app.config.ts`).

## Nová verze APK

1. Zvýšit `version` v `apps/mobile/app.config.ts` (a `android.versionCode`, až bude přidán)
   — jinak Android novou verzi přes starou nenainstaluje.
2. V PowerShellu (spouštět ve vlastním terminálu, ne v sandboxu — Gradle potřebuje lokální
   spojení):

   ```powershell
   & C:\dev\ricingo\apps\mobile\scripts\build-release-apk.ps1
   ```

   Výsledek: `apps/mobile/dist-apk/italstina-rici.apk` (produkční API
   `https://api.rici.esprog.eu`).

3. Nahrát na server a upravit verzi a velikost na stránce
   (`deploy/www/app/index.html`, text „Soubor APK · …“):

   ```powershell
   scp apps\mobile\dist-apk\italstina-rici.apk esprog-vps:/srv/www/rici-app/italstina-rici.apk
   scp deploy\www\app\index.html esprog-vps:/srv/www/rici-app/index.html
   ```

## Stránka /app na serveru

- Soubory stránky: `deploy/www/app/` → `/srv/www/rici-app/` (ručně, `scp -r`).
- Caddy ji obsluhuje přímo (`deploy/ricingo.caddy`, `handle_path /app/*`); `/srv/www` je
  připojený do kontejneru Caddy (`deploy/proxy/compose.yaml`).
- APK se posílá s typem `application/vnd.android.package-archive` a jako příloha.
