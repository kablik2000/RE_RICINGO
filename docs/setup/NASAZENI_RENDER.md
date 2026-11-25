# Nasazení na Render — návod krok za krokem

Co vznikne: **Teacher Studio**, **API** (pro Studio i mobilní aplikaci) a **databáze**, všechno
v regionu **Frankfurt** (EU). Popis je v souboru [`render.yaml`](../../render.yaml) v kořeni repa
(ADR-0014). Zabere asi **20–30 minut**, většinu času se čeká na build.

## Než začnete

- Účet na [render.com](https://render.com) propojený s GitHubem (repo `RE_RICINGO`).
- `render.yaml` je pushnutý na větvi `main`.
- Platební karta v Renderu: databáze a obě služby jsou na placených plánech (zhruba 20 USD
  měsíčně, aktuální ceny ověřte v Renderu). Zdarma to nejde: free databázi Render po 30 dnech
  smaže a free služby usínají a nemají Shell.
- Rozpracovaný formulář **New Static Site** zavřete. Studio není statický web.

## 1. Vytvořit všechno z Blueprintu

1. V Renderu **New → Blueprint**.
2. Vyberte repo `RE_RICINGO`, větev `main`. Render najde `render.yaml`.
3. Pojmenujte Blueprint (např. `RICI`). Render ukáže tři položky: `rici-db`, `rici-api`,
   `rici-studio`.
4. **Deploy Blueprint** (Apply).

Render založí databázi, postaví API (Docker), spustí migrace databáze a postaví Studio.
Hotovo je, když jsou obě služby **Live** (zelené). Když něco selže, otevřete službu → **Logs**
a pošlete screenshot.

Další commity na `main` se nasadí samy, ale až když na GitHubu projde CI.

## 2. Založit první účet lektorky

1. Otevřete službu **rici-api** → záložka **Shell**.
2. Spusťte (e-mail a jméno upravte, heslo se zeptá samo, aspoň 15 znaků):

   ```sh
   flask --app rici_api.wsgi create-teacher vas@email.cz --name "Vaše jméno" --organization RICI
   ```

3. Otevřete službu **rici-studio**; nahoře je její adresa `https://rici-studio-….onrender.com`.
   Přihlaste se.

Produkční databáze je prázdná: lekce z vývojového počítače se nepřenáší. Lekce se vytvoří
a zveřejní ve Studiu.

Další užitečné příkazy ve stejném Shellu: `set-password <e-mail>` (nové heslo),
`disable-teacher <e-mail>` / `enable-teacher <e-mail>`.

## 3. E-maily s pozvánkami

Bez nich se pozvánky studentům neodešlou (Studio ukáže chybu). Až bude vybraný poskytovatel
(např. Brevo, Mailgun, nebo SMTP vaší domény):

**rici-api → Environment → Add Environment Variable**:

| Klíč            | Hodnota (příklad)                         |
| --------------- | ----------------------------------------- |
| `SMTP_HOST`     | `smtp-relay.brevo.com`                    |
| `SMTP_PORT`     | `587`                                     |
| `SMTP_USERNAME` | přihlašovací jméno od poskytovatele       |
| `SMTP_PASSWORD` | heslo / klíč od poskytovatele             |
| `SMTP_STARTTLS` | `true`                                    |
| `MAIL_FROM`     | `Italština RICI <noreply@vase-domena.cz>` |

Uložit → Render službu restartuje.

## 4. Vlastní doména (volitelné)

**rici-studio → Settings → Custom Domains → Add**, např. `studio.vase-domena.cz`. Render ukáže
DNS záznam (CNAME), který nastavíte u registrátora domény. HTTPS certifikát zařídí Render sám.
Pro API stejně (`api.vase-domena.cz`), adresu pak dostane mobilní aplikace.

## 5. Kontrola po prvním nasazení (udělá vývojář)

- `https://<rici-api>/api/v1/health` vrací `{"status": "ok", "database": "ok"}`.
- **Adresy klientů:** API bere adresu, kterou do `X-Forwarded-For` přidal load balancer Renderu
  (`TRUSTED_PROXY_HOPS=1`). Ověřit: z vlastního počítače poslat přihlášení se špatným heslem
  a s vymyšlenou hlavičkou, pak v Shellu `rici-api` podívat do `login_attempts`:

  ```sh
  curl -s -X POST https://<rici-api>/api/v1/auth/login -H 'Content-Type: application/json' \
    -H 'X-Forwarded-For: 1.2.3.4' -d '{"email":"test@example.test","password":"spatne-heslo-123"}'
  ```

  V Shellu `rici-api` (obraz nemá `psql`):

  ```sh
  python -c "from rici_api.config import load_settings; import sqlalchemy as s; print(s.create_engine(load_settings().database_url).connect().execute(s.text('SELECT address, created_at FROM login_attempts ORDER BY created_at DESC LIMIT 3')).all())"
  ```

  Uložená adresa musí být **veřejná IP vašeho počítače**, ne `1.2.3.4` ani adresa Renderu.
  Jinak upravit `TRUSTED_PROXY_HOPS` a zapsat výsledek do ADR-0014.

- Přihlašovací cookie Studia má prefix `__Host-` a příznak `Secure` (DevTools → Application).
