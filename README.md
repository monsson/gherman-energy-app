# Gherman Energy — Fleet & Drivers (prototip)

Aplicație mobile-first pentru gestionarea unei flote și a șoferilor — React
Router 7 (SPA), Tailwind v4, date fictive.

## Rulare locală

```bash
npm install
npm run dev
```

App-ul se deschide la `http://localhost:5173/gherman-energy-app/`.

### Conturi demo (hardcodate)

| Utilizator | Parolă | Rol                                |
| ---------- | ------ | ---------------------------------- |
| `fleet`    | `fleet`| Fleet Manager                      |
| `sofer`    | `sofer`| Șofer (Andrei Popescu / mașina #1) |

## Build pentru GitHub Pages

```bash
npm run build
```

Rezultatul ajunge în `build/client/` — `index.html` plus un `404.html` identic
ca să meargă rutarea client-side pe căi profunde. Conținutul folderului se urcă
pe branch-ul `gh-pages` al repository-ului `gherman-energy-app`.

Calea de bază este `/gherman-energy-app/`. Dacă schimbi numele repo-ului,
actualizează în paralel `vite.config.ts` (`base`) și `react-router.config.ts`
(`basename`).

### Deploy rapid

```bash
npm run build
cd build/client
git init
git add .
git commit -m "deploy"
git push -f git@github.com:<user>/gherman-energy-app.git HEAD:gh-pages
```

## Date fictive

Generate cu un LCG cu seed (`app/lib/data.ts`), deci stabile între reload-uri:

- 10 mașini (5 mici + 5 utilitare)
- 10 stații GE în Constanța
- 6 luni de tranzacții, 1–3 alimentări/săptămână/mașină
- 40–60 L/alimentare, 8–9 lei/L benzină, 9–10 lei/L motorină
- numere CT-NN-AA, carduri 4 cifre, 10 șoferi
- 3 mașini cu documente expirate (apar cu roșu)

Documentele „Talon" și „Asigurare" se descarcă ca PDF generat la runtime
(`app/lib/pdf.ts`).
