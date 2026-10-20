# Guida alle Carte Lenormand

PWA in italiano con le 36 carte Lenormand, combinazioni, 5 bonus esclusivi, strumento "Estrai una carta", diario delle letture e PDF scaricabili (per singola carta e guida completa).

## Struttura

```
index.html            App shell (routing via hash, lato client)
css/                   Stili (variabili di design + stylesheet principale)
js/app.js              Logica dell'app (router, rendering, diario localStorage)
data/                  Contenuti in JSON (36 carte + 5 bonus)
assets/icons/          Sprite SVG delle 36 carte + icone + icone PWA
assets/pdf/            36 PDF per carta + guida-completa.pdf
scripts/               Script Node/Playwright che generano i PDF da data/cards.json
manifest.json, sw.js   Configurazione PWA (installabile, funziona offline)
```

## Rigenerare i PDF

Se aggiorni i contenuti in `data/cards.json` o nei file `data/bonus-*.json`, rigenera i PDF con:

```
npm install playwright   # se non già installato
node scripts/generate-pdfs.js
```

## Pubblicare su GitHub Pages

Questo progetto è pronto per essere pubblicato così com'è, senza build.

```
git init
git add .
git commit -m "Prima versione della Guida alle Carte Lenormand"
git branch -M main
git remote add origin https://github.com/oleonardodocs-hub/guida-lenormand.git
git push -u origin main
```

Poi, su GitHub: Settings → Pages → Branch: `main`, cartella `/ (root)`. L'app sarà disponibile su:

```
https://oleonardodocs-hub.github.io/guida-lenormand/
```

## Note

- Nessuna dipendenza esterna lato app (JS vanilla, nessun framework).
- Il Diario delle Letture salva i dati solo nel browser del cliente (localStorage), in modo privato.
- Tutti i testi sono in italiano nativo.
