# Booklet Imposer

Uno strumento browser per l'imposizione di opuscoli (booklet) in PDF, con aggiunta automatica di crocini di taglio e compensazione del creep.

Funziona interamente nel browser: nessun file viene caricato su server.

---

## Funzionalità

- **Imposizione a booklet** — riordina le pagine di un PDF a pagine singole in segnature pronte per la stampa fronte/retro
- **Crocini di taglio** — aggiunge segni di taglio calibrati sul valore di bleed indicato
- **Compensazione creep** — calcola lo scostamento progressivo dei fogli interni in base alla grammatura carta, al bulk o allo spessore manuale
- **Taglio bleed al dorso** — rimuove automaticamente l'abbondanza interna al centro foglio, facendo incontrare i due trim al vivo sulla linea di piega
- **Anteprima e segnatura** — mostra la disposizione delle pagine per foglio prima di generare il file

---

## Come si usa

### 1. Esporta il PDF dal programma di impaginazione
Esporta a **pagine singole** con le abbondanze (bleed) incluse, ma **senza crocini di taglio**: verranno aggiunti dal tool in fase di imposizione.

> ⚠️ Non applicare crocini in fase di esportazione. Il tool li calcola e li posiziona correttamente in base al bleed dichiarato.

### 2. Apri il tool nel browser
Scarica i file e apri `index.html` direttamente nel browser (Chrome o Firefox consigliati). Nessuna installazione richiesta.

### 3. Carica il PDF e configura i parametri

| Parametro | Descrizione |
|---|---|
| **Bleed per lato (mm)** | Abbondanza applicata in esportazione |
| **Lunghezza crocini (mm)** | Lunghezza dei segni di taglio |
| **Distanza crocini dal trim** | Gap tra il bordo trim e l'inizio del crocino |
| **Spessore crocini (pt)** | Peso in punti tipografici |
| **Grammatura (g/m²)** | Usata per stimare lo spessore foglio |
| **Bulk carta** | Coefficiente di spessore (default 1.0) |
| **Spessore manuale foglio** | Se noto, sovrascrive il calcolo automatico |
| **Fattore creep** | Moltiplicatore per correggere su macchina |

### 4. Analizza e genera
Clicca **Analizza PDF** per verificare la segnatura e l'anteprima, poi **Genera PDF imposto** per scaricare il file pronto per la stampa.

---

## Requisiti

Nessuno. Basta un browser moderno con JavaScript abilitato.

Dipendenze caricate via CDN:
- [pdf-lib](https://github.com/Hopding/pdf-lib) — manipolazione PDF
- [PDF.js](https://mozilla.github.io/pdf.js/) — rendering anteprima

---

## Installazione (per sviluppatori)

```bash
git clone https://github.com/TUO_USERNAME/booklet-imposer.git
cd booklet-imposer
# Apri index.html nel browser — nessun build step richiesto
```

---

## Licenza

MIT © Gabriele Falcinelli

Uso libero, anche commerciale. Vedi [LICENSE](LICENSE) per i dettagli.

---

*Tool realizzato per uso personale e condiviso liberamente con la comunità della prestampa.*
