# Nasazení na VPS — návod

Teacher Studio, API a databáze běží na VPS `esprog-vps` (Forpsi, 80.211.213.195) v Dockeru
(ADR-0015). Image se staví na GitHubu, server jen stahuje a spouští hotové verze.

| Adresa                       | Co to je                            |
| ---------------------------- | ----------------------------------- |
| `https://rici.esprog.eu`     | Teacher Studio                      |
| `https://api.rici.esprog.eu` | API (pro Studio i mobilní aplikaci) |

## Jak to funguje

```
git tag v1.2.0 → GitHub Actions: CI → postaví image → ghcr.io
                                   → SSH na server (uživatel deploy) → /srv/ricingo/deploy.sh 1.2.0
                                        stáhne image, migrace DB, spustí, ověří zdraví, Caddy
```

Na serveru:

| Složka         | Obsah                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| `/srv/ricingo` | `compose.yaml` (z `deploy/compose.yaml`), `.env` (hesla, verze), `deploy.sh` |
| `/srv/proxy`   | Caddy pro všechny weby na serveru; `sites/*.caddy` = jeden soubor na web     |

## Vydání nové verze

```sh
git tag v1.2.0
git push origin v1.2.0
```

Průběh: GitHub → **Actions → Release**. Když nová verze nenaběhne (health check), server
spustí znovu předchozí verzi a workflow skončí chybou.

**Návrat ke starší verzi:** Actions → **Release** → **Run workflow** → verze (např. `1.1.0`).
Nic se nestaví, nasadí se existující image. Migrace databáze se nevrací.

## Jednorázové nastavení (hotovo 2026-11-26)

1. **DNS (Wedos, doména `esprog.eu`):** záznamy `rici` a `api.rici`, každý typu A
   `80.211.213.195` a AAAA `2001:15e8:110:54c3::1`.
2. **Deploy klíč do GitHubu:** soukromý klíč je v `%USERPROFILE%\.ssh\rici_github_deploy`.
   - Zkopírovat do schránky (PowerShell): `Get-Content $env:USERPROFILE\.ssh\rici_github_deploy | Set-Clipboard`
   - GitHub → repo → **Settings → Environments → New environment** `production` →
     **Add environment secret**: název `DEPLOY_SSH_KEY`, hodnota ze schránky.
   - Doporučeno: v prostředí `production` → **Deployment branches and tags** → jen tagy `v*`.
   - Pak soubor `rici_github_deploy` z počítače smazat (veřejná půlka je na serveru).
3. Server (udělal Claude přes SSH): uživatel `deploy` ve skupině `docker`, jeho klíč smí spustit
   jen `/srv/ricingo/deploy.sh`; složky `/srv/ricingo` a `/srv/proxy`; `.env` s náhodným heslem
   databáze; Caddy spuštěný (`cd /srv/proxy && docker compose up -d`).

## Po prvním nasazení

**První účet lektorky** (heslo se zeptá samo, aspoň 15 znaků):

```sh
ssh -t esprog-vps "cd /srv/ricingo && docker compose exec api flask --app rici_api.wsgi create-teacher vas@email.cz --name 'Vaše jméno' --organization RICI"
```

Stejně `set-password <e-mail>`, `disable-teacher <e-mail>`, `enable-teacher <e-mail>`.

**Kontroly:**

- `https://api.rici.esprog.eu/api/v1/health` vrací `{"database":"ok","status":"ok"}`.
- Přihlašovací cookie Studia má prefix `__Host-` a příznak `Secure` (DevTools → Application).
- Adresa klienta: přihlásit se špatným heslem s vymyšlenou hlavičkou
  `X-Forwarded-For: 1.2.3.4` a v tabulce `login_attempts` musí být veřejná IP počítače, ne
  `1.2.3.4`:

  ```sh
  ssh esprog-vps "cd /srv/ricingo && docker compose exec db psql -U rici -c 'SELECT address, created_at FROM login_attempts ORDER BY created_at DESC LIMIT 3'"
  ```

Na mobilu (Termius) stačí `rici-ucet <e-mail>` (zeptá se na jméno a heslo).

## Nahrání lekce ze souboru (jako koncept)

Lekce (JSON ve formátu `packages/domain/schema/`) se nahraje nezveřejněná; ve Studiu se
zkontroluje a zveřejní. Neúplná lekce projde taky, příkaz vypíše, co je třeba doplnit.

```sh
scp lekce.json esprog-vps:/tmp/lekce.json
ssh esprog-vps "cd /srv/ricingo && docker compose cp /tmp/lekce.json api:/tmp/lekce.json && docker compose exec api flask --app rici_api.wsgi import-lesson /tmp/lekce.json --organization RICI --draft && rm /tmp/lekce.json"
```

`--public`: po zveřejnění ji uvidí všichni (jinak jen doporučeným studentům). Bez `--draft`
se lekce rovnou zveřejní.

## E-maily s pozvánkami

Až bude vybraný poskytovatel (Q-10): na serveru v `/srv/ricingo/.env` odkomentovat a vyplnit
`SMTP_*` a `MAIL_FROM`, pak `cd /srv/ricingo && docker compose up -d api`.

## Údržba

- Stav: `ssh esprog-vps "cd /srv/ricingo && docker compose ps"`; logy: `docker compose logs -f api`.
- `deploy/compose.yaml` a `deploy/ricingo.caddy` se na server dostanou s další verzí.
- `deploy/deploy.sh` a `deploy/proxy/*` se instalují ručně (root):
  `install -m 755 deploy.sh /srv/ricingo/deploy.sh`, Caddy: `docker compose -f /srv/proxy/compose.yaml exec caddy caddy reload --config /etc/caddy/Caddyfile`.
- Firewall (`ufw`) pouští dovnitř jen 22, 80 a 443.
- Zálohy databáze zatím **nejsou** (DEVELOPMENT_PLAN, hosting).
