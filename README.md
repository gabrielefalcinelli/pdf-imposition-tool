# Booklet Imposer 🇬🇧 / 🇮🇹

*(Italian version below)*

A web-based, standalone tool for typographic imposition of PDF booklets.
Created by Gabriele Falcinelli, this tool allows you to impose single-page PDFs into print-ready spreads (front/back), automatically calculating the creep shift and adding the necessary crop marks.

Since it runs entirely in your browser, it is **100% cross-platform** and guarantees maximum privacy: **no files are ever uploaded to external servers**.

---

## 🚀 How to start the tool (For Dummies)

This tool doesn't require any installation! Here is how to open it based on your operating system:

* **🍏 For Mac Users:**
  Simply double-click on the **`Booklet Imposer.app`** file (the one with the Jolly Roger skull icon). It will automatically launch the tool in your default browser.
* **🪟 For Windows & Linux Users:**
  Just double-click on the **`index.html`** file. It will instantly open in your default web browser (Chrome, Edge, Firefox, etc.) and is immediately ready to use.

---

## 🎯 Main Features
- **Automatic Imposition**: Transforms single-page PDFs into a booklet layout ready for saddle stitching.
- **Bleed Support**: Perfectly handles bleed, automatically removing the inner bleed at the spine so that pages join seamlessly on the central fold without overlapping.
- **Dynamic Creep Calculation**: In a saddle-stitched booklet, inner pages stick out. The tool calculates the "creep" and pushes the inner pages towards the spine to compensate for paper thickness.
- **Crop and Fold Marks**: Generates crop marks outside the finished format, plus discreet fold indicators at the spine.
- **Smart Color Profiles**: Analyzes the uploaded PDF to detect the prevalent color space and draws marks in Registration Black (CMYK) or Solid Black (RGB), with manual override.
- **Multilingual UI (ENG/ITA)**: Easily switch between English and Italian directly from the interface. Every option has an informative tooltip ("?").

## 🛠️ How to use
1. Export your document from your layout software (e.g. InDesign) as **single pages** including **bleed**, but **WITHOUT crop marks**.
2. Open the tool following the instructions above.
3. Upload the PDF file.
4. Set the necessary parameters (bleed, paper weight, thickness, etc.).
5. Click *Analyze PDF* and then *Generate imposed PDF* to download the print-ready file.

---

# 🇮🇹 Versione Italiana

Un tool web-based e stand-alone per l'imposizione tipografica di opuscoli in formato PDF.
Creato da Gabriele Falcinelli, questo strumento permette di impaginare PDF a pagine singole in plance pronte per la stampa fronte/retro, calcolando automaticamente lo scostamento del creep e aggiungendo i crocini di taglio necessari.

Essendo un'applicazione eseguita interamente nel browser, è **compatibile al 100% con tutti i sistemi operativi** e garantisce la massima privacy: **nessun file viene caricato su server esterni**.

---

## 🚀 Come avviare il tool (Per Principianti)

Questo strumento non richiede alcuna installazione! Ecco come aprirlo in base al tuo sistema operativo:

* **🍏 Per utenti Mac:**
  Fai un semplice doppio clic sul file **`Booklet Imposer.app`** (quello con l'icona del teschio Jolly Roger). Aprirà automaticamente il tool nel tuo browser predefinito.
* **🪟 Per utenti Windows e Linux:**
  Fai un semplice doppio clic sul file **`index.html`**. Si aprirà all'istante nel tuo browser internet (Chrome, Edge, Firefox, ecc.) e sarà subito pronto all'uso.

---

## 🎯 Funzionalità Principali
- **Imposizione Automatica**: Trasforma PDF a pagine singole in un layout a quartini (booklet) pronto per la piega a sella.
- **Supporto Bleed (Abbondanza)**: Gestisce perfettamente il bleed, rimuovendo automaticamente le abbondanze interne al dorso in modo che le pagine si uniscano perfettamente sulla piega centrale senza sovrapposizioni.
- **Calcolo Dinamico del Creep**: In un opuscolo cucito a sella, le pagine interne sporgono verso l'esterno. Il tool calcola il "creep" e spinge le pagine interne verso il dorso per compensare lo spessore della carta.
- **Crocini di Rifilo e Piega**: Genera crocini di taglio all'esterno del formato finito, oltre a discreti indicatori di piega in corrispondenza del dorso.
- **Profili Colore Intelligenti**: Analizza il PDF caricato per rilevare lo spazio colore prevalente e traccia i crocini in Nero di Registro (CMYK) o Nero Assoluto (RGB), con possibilità di forzatura manuale.
- **Interfaccia Multilingua (ITA/ENG)**: Passa istantaneamente dall'italiano all'inglese. Ogni voce è accompagnata da un tooltip esplicativo (l'icona `?`).

## 🛠️ Come si usa
1. Esporta il tuo documento dal programma di impaginazione (es. InDesign) a **pagine singole** e includendo l'**abbondanza (bleed)**, ma **SENZA crocini**.
2. Apri il tool seguendo le istruzioni qui sopra.
3. Carica il file PDF.
4. Imposta i parametri necessari (bleed, grammatura carta, spessore, etc.).
5. Clicca su *Analizza PDF* e poi su *Genera PDF imposto* per scaricare il file pronto per la stampa.

---

## 🔄 Changelog

### Version 1.5.0
- **Multilingual Support (ENG/ITA)**: Added a language switcher in the header. The entire UI, tooltips, and dynamic JavaScript alerts are now fully translated.
- **Bilingual Documentation**: README.md updated to include both English and Italian documentation, with cross-platform startup instructions.

### Version 1.4.0
- **Separate Cover Support**: Added the ability to specify if the cover is integrated into the PDF (Self-cover) or if it will be wrapped externally (Separate cover). In the latter case, the tool opens new fields to calculate the cover thickness (e.g., 300g) and applies an initial offset to the inner block, drastically improving creep accuracy for complex booklets.
- **Informative Tooltips ("?")**: Inserted a help icon next to each setting.
- **Archivo Font**: UI updated with the Google *Archivo* font.
- **Mac App (Launcher)**: Included a native Mac launcher (`Booklet Imposer.app`) featuring the custom "Jolly Roger" icon.
