# Instalace Dockeru — návod krok za krokem

Pro: vývojový počítač (Lenovo, Windows 11 Home, 16 GB RAM).
Zabere asi **30–45 minut**, z toho většinu čekání. Počítač se během toho **2× restartuje**.

## Než začnete

- Počítač připojte do zásuvky a k internetu.
- Budete potřebovat **heslo k účtu Windows** (pro potvrzení „Spustit jako správce“).
- Na disku C: má být aspoň **10 GB volného místa**.
- Uložte a zavřete rozdělanou práci (bude restart).
- Pokud cokoli vypadá jinak než v návodu, **vyfoťte obrazovku telefonem** a pošlete ji — nic
  nezkoušejte naslepo.

---

## Krok 1 — Zapnout „Subsystém Windows pro Linux“ (WSL)

1. Klikněte na tlačítko **Start** (logo Windows dole uprostřed).
2. Napište **terminál**.
3. U výsledku **Terminál** klikněte **pravým tlačítkem** → **Spustit jako správce**.
4. Okno „Chcete této aplikaci povolit provádět změny…?“ → klikněte **Ano**.
5. Do černého/modrého okna napište přesně tento příkaz a stiskněte **Enter**:

   ```
   wsl --install --no-distribution
   ```

6. Počkejte, až doběhne (několik minut). Na konci se objeví text, že požadovaná operace byla
   úspěšná a změny se projeví po restartu.
   - Pokud se objeví **chyba**, vyfoťte ji a pošlete; dál nepokračujte.
7. Zavřete okno a **restartujte počítač**: Start → ikona napájení → **Restartovat**.

## Krok 2 — Instalační soubor (už je stažený)

Soubor **Docker Desktop Installer.exe** (624 MB) je už stažený ve složce **Stažené soubory**
(`C:\Users\pavel.schejbal\Downloads`) — tento krok **přeskočte** a pokračujte krokem 3.

Jen kdyby tam soubor nebyl:

1. Otevřete prohlížeč (Edge nebo Chrome).
2. Jděte na adresu: **https://www.docker.com/products/docker-desktop/**
3. Klikněte na **Download Docker Desktop** a vyberte **Download for Windows – AMD64**.
   (Ne „ARM64“.)
4. Stáhne se soubor **Docker Desktop Installer.exe** do složky **Stažené soubory**.

## Krok 3 — Nainstalovat Docker Desktop

1. Ve složce **Stažené soubory** dvakrát klikněte na **Docker Desktop Installer.exe**.
2. Okno „Chcete této aplikaci povolit provádět změny…?“ → **Ano**.
3. Objeví se okno **Configuration**. Nechte zaškrtnuté:
   - ✅ **Use WSL 2 instead of Hyper-V (recommended)**
   - ✅ **Add shortcut to desktop**

   Klikněte **OK**.

4. Počkejte, než instalace doběhne (5–10 minut).
5. Na konci klikněte **Close and restart** (pokud tam je jen **Close**, klikněte na něj a počítač
   restartujte ručně: Start → napájení → Restartovat).

## Krok 4 — První spuštění

1. Po restartu se Docker Desktop může spustit sám. Pokud ne: na ploše dvakrát klikněte na
   ikonu **Docker Desktop** (modrá velryba).
2. Okno **Docker Subscription Service Agreement** → klikněte **Accept**.
3. Pokud chce **přihlášení / Sign in** → klikněte **Skip** (nebo „Continue without signing in“).
4. Pokud se ptá na **průzkum / survey** (role, k čemu Docker používáte) → klikněte **Skip**.
5. Počkejte, až v okně Docker Desktop **vlevo dole** svítí zeleně **Engine running**.
   - První start může trvat i několik minut.
   - Pokud se objeví hláška o **WSL update** nebo **„WSL needs updating“**: otevřete Terminál
     jako správce (Krok 1, body 1–4), napište `wsl --update`, Enter, počkejte, zavřete
     a Docker Desktop spusťte znovu.

## Krok 5 — Ověřit, že všechno funguje

1. Otevřete **Terminál** obyčejně (Start → napište „terminál“ → klikněte, **ne** jako správce).
2. Napište a stiskněte **Enter**:

   ```
   docker run hello-world
   ```

3. Po chvíli se má objevit text, který obsahuje **Hello from Docker!**
4. Ještě napište:

   ```
   docker compose version
   ```

   Má se vypsat **Docker Compose version v2…** (nebo vyšší).

5. **Vyfoťte obrazovku** s oběma výsledky a pošlete ji. Tím je hotovo.

## Co nechat, jak je

- Docker Desktop **můžete zavřít** křížkem — dál běží v pozadí (ikona velryby vedle hodin).
  Úplně ho ukončíte pravým kliknutím na velrybu → **Quit Docker Desktop**.
- Nastavení „spouštět Docker po přihlášení do Windows“ nechte, jak je; vývojář si ho upraví.
- Nic dalšího v Dockeru neklikejte (nepřihlašujte se, nic nestahujte).

## Když něco nejde

| Co se stalo                                                           | Co udělat                                                                                |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hláška o **virtualizaci** („Virtualization support not detected“)     | Vyfotit a poslat — nastavuje se v BIOSu, to udělá vývojář.                               |
| Docker Desktop se **nespustí** nebo visí na „Starting…“ přes 10 minut | Restartovat počítač a spustit Docker Desktop znovu. Pokud to nepomůže, vyfotit a poslat. |
| `docker` v Terminálu hlásí, že **příkaz neexistuje**                  | Zavřít Terminál, otevřít nový. Pokud pořád, restartovat počítač.                         |
| Cokoli jiného                                                         | Vyfotit obrazovku a poslat. Nic nemazat ani neodinstalovávat.                            |
