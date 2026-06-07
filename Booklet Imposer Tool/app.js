const { PDFDocument, rgb, StandardFonts } = PDFLib;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const els = {
  pdfFile: document.getElementById('pdfFile'),
  fileName: document.getElementById('fileName'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  generateBtn: document.getElementById('generateBtn'),
  status: document.getElementById('status'),
  bleedMm: document.getElementById('bleedMm'),
  markLenMm: document.getElementById('markLenMm'),
  markOffsetMm: document.getElementById('markOffsetMm'),
  markWeightPt: document.getElementById('markWeightPt'),
  paperGsm: document.getElementById('paperGsm'),
  bulk: document.getElementById('bulk'),
  manualThicknessMm: document.getElementById('manualThicknessMm'),
  creepScale: document.getElementById('creepScale'),
  creepMode: document.getElementById('creepMode'),
  addMarks: document.getElementById('addMarks'),
  drawFold: document.getElementById('drawFold'),
  mPages: document.getElementById('mPages'),
  mSheets: document.getElementById('mSheets'),
  mTrim: document.getElementById('mTrim'),
  mCreep: document.getElementById('mCreep'),
  sigTable: document.querySelector('#sigTable tbody'),
  canvas: document.getElementById('previewCanvas'),
};

let sourceBytes = null;
let sourceInfo = null;
let latestOutputBytes = null;

const mmToPt = mm => Number(mm || 0) * 72 / 25.4;
const ptToMm = pt => Number(pt || 0) * 25.4 / 72;
const fmt = (n, d = 2) => Number(n).toFixed(d).replace('.', ',');

function setStatus(msg, type = '') {
  els.status.className = `status ${type}`.trim();
  els.status.textContent = msg;
}

function getSettings() {
  const manual = parseFloat(els.manualThicknessMm.value);
  const gsm = parseFloat(els.paperGsm.value || 0);
  const bulk = parseFloat(els.bulk.value || 1);
  const estimatedThickness = gsm * bulk / 1000;
  return {
    bleedPt: mmToPt(els.bleedMm.value),
    bleedMm: parseFloat(els.bleedMm.value || 0),
    markLenPt: mmToPt(els.markLenMm.value),
    markOffsetPt: mmToPt(els.markOffsetMm.value),
    markWeightPt: parseFloat(els.markWeightPt.value || 0.3),
    sheetThicknessMm: Number.isFinite(manual) && manual > 0 ? manual : estimatedThickness,
    creepScale: parseFloat(els.creepScale.value || 1),
    creepMode: els.creepMode.value,
    addMarks: els.addMarks.checked,
    drawFold: els.drawFold.checked,
  };
}

function buildBookletPlan(pageCount) {
  const total = Math.ceil(pageCount / 4) * 4;
  const sheets = total / 4;
  const rows = [];
  for (let i = 0; i < sheets; i++) {
    rows.push({ sheet: i + 1, side: 'Fronte', left: total - (2 * i), right: 1 + (2 * i), depth: i });
    rows.push({ sheet: i + 1, side: 'Retro', left: 2 + (2 * i), right: total - 1 - (2 * i), depth: i });
  }
  return { total, sheets, rows };
}

function safePageNumber(n, originalCount) {
  return n >= 1 && n <= originalCount ? n : null;
}

function creepForDepth(depth, sheets, settings) {
  if (settings.creepMode === 'none') return 0;
  // Progressione corretta: il foglio esterno resta a 0; ogni foglio più interno
  // riceve uno scostamento crescente verso il dorso.
  const mm = Math.max(0, depth * settings.sheetThicknessMm * settings.creepScale);
  const pt = mmToPt(mm);
  return settings.creepMode === 'inward' ? pt : -pt;
}

async function analyzePdf() {
  if (!sourceBytes) return;
  try {
    setStatus('Analisi del PDF in corso…');
    const src = await PDFDocument.load(sourceBytes);
    const pages = src.getPages();
    if (!pages.length) throw new Error('Il PDF non contiene pagine.');
    const first = pages[0];
    const { width, height } = first.getSize();
    const settings = getSettings();
    const trimW = width - settings.bleedPt * 2;
    const trimH = height - settings.bleedPt * 2;
    if (trimW <= 0 || trimH <= 0) throw new Error('Il bleed indicato è troppo grande rispetto alla pagina PDF.');
    const plan = buildBookletPlan(pages.length);
    sourceInfo = { width, height, trimW, trimH, pageCount: pages.length, plan };
    updateMetrics();
    renderPlanTable();
    await drawSchematicPreview();
    els.generateBtn.disabled = false;
    setStatus('PDF analizzato. Puoi generare il booklet imposto.', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(`Errore analisi: ${err.message}`, 'err');
  }
}

function updateMetrics() {
  if (!sourceInfo) return;
  const settings = getSettings();
  const maxCreep = (sourceInfo.plan.sheets - 1) * settings.sheetThicknessMm * settings.creepScale;
  els.mPages.textContent = sourceInfo.pageCount;
  els.mSheets.textContent = sourceInfo.plan.sheets;
  els.mTrim.textContent = `${fmt(ptToMm(sourceInfo.trimW), 1)} × ${fmt(ptToMm(sourceInfo.trimH), 1)} mm`;
  els.mCreep.textContent = `${fmt(maxCreep, 3)} mm`;
}

function renderPlanTable() {
  if (!sourceInfo) return;
  const { rows, sheets } = sourceInfo.plan;
  const settings = getSettings();
  els.sigTable.innerHTML = rows.map(row => {
    const c = ptToMm(creepForDepth(row.depth, sheets, settings));
    const l = safePageNumber(row.left, sourceInfo.pageCount) || 'bianca';
    const r = safePageNumber(row.right, sourceInfo.pageCount) || 'bianca';
    return `<tr><td>${row.sheet}</td><td>${row.side}</td><td>${l}</td><td>${r}</td><td>${fmt(c, 3)} mm</td></tr>`;
  }).join('');
}

function drawCropMarks(page, x, y, w, h, settings, options = {}) {
  const len = settings.markLenPt;
  const off = settings.markOffsetPt;
  const lineWidth = settings.markWeightPt;
  const black = rgb(0,0,0);
  const draw = (x1, y1, x2, y2) => page.drawLine({ start: {x: x1, y: y1}, end: {x: x2, y: y2}, thickness: lineWidth, color: black });

  const left = x, right = x + w, bottom = y, top = y + h;
  const corners = [
    {x: left, y: bottom, sx: -1, sy: -1},
    {x: right, y: bottom, sx: 1, sy: -1},
    {x: left, y: top, sx: -1, sy: 1},
    {x: right, y: top, sx: 1, sy: 1},
  ];
  corners.forEach(c => {
    if (options.skipSpine && ((options.isLeft && c.x === right) || (!options.isLeft && c.x === left))) return;
    draw(c.x + c.sx * off, c.y, c.x + c.sx * (off + len), c.y);
    draw(c.x, c.y + c.sy * off, c.x, c.y + c.sy * (off + len));
  });
}

async function drawPdfPageOnSheet({ outDoc, outPage, srcDoc, srcPageIndex, isLeft, baseX, baseY, settings, font }) {
  const { width, height, trimW, trimH, pageCount } = sourceInfo;
  if (srcPageIndex == null || srcPageIndex < 0 || srcPageIndex >= pageCount) {
    outPage.drawRectangle({ x: baseX + (isLeft ? settings.bleedPt : 0), y: baseY + settings.bleedPt, width: trimW, height: trimH, borderWidth: 0.4, borderColor: rgb(.82,.82,.82), color: rgb(1,1,1) });
    outPage.drawText('Pagina bianca', { x: baseX + trimW / 2 - 28, y: baseY + trimH / 2, size: 8, font, color: rgb(.55,.55,.55) });
    return;
  }

  const srcPage = srcDoc.getPage(srcPageIndex);
  let clipX, clipY, clipW, clipH, destX;
  if (isLeft) {
    clipX = 0;
    clipY = 0;
    clipW = width - settings.bleedPt; // mantiene bleed sinistro, taglia bleed destro interno
    clipH = height;
    destX = baseX;
  } else {
    clipX = settings.bleedPt; // taglia bleed sinistro interno
    clipY = 0;
    clipW = width - settings.bleedPt;
    clipH = height;
    destX = baseX;
  }
  const embedded = await outDoc.embedPage(srcPage, { left: clipX, bottom: clipY, right: clipX + clipW, top: clipY + clipH });
  outPage.drawPage(embedded, { x: destX, y: baseY, width: clipW, height: clipH });
}

async function generateImposedPdf() {
  if (!sourceBytes || !sourceInfo) return;
  try {
    setStatus('Generazione PDF imposto in corso…');
    els.generateBtn.disabled = true;
    const settings = getSettings();
    const srcDoc = await PDFDocument.load(sourceBytes);
    const outDoc = await PDFDocument.create();
    const font = await outDoc.embedFont(StandardFonts.Helvetica);
    const { width, height, trimW, trimH, plan, pageCount } = sourceInfo;
    const sheetW = width * 2 - settings.bleedPt * 2; // due pagine meno i due bleed interni
    const sheetH = height;

    for (const row of plan.rows) {
      const outPage = outDoc.addPage([sheetW, sheetH]);
      const creep = creepForDepth(row.depth, plan.sheets, settings);
      const leftNum = safePageNumber(row.left, pageCount);
      const rightNum = safePageNumber(row.right, pageCount);

      // Creep corretto: i trim e i crocini restano fissi; si sposta solo il contenuto.
      // Compensazione standard verso il dorso: pagina sinistra a destra, pagina destra a sinistra.
      const leftFixedBaseX = 0;
      const rightFixedBaseX = width - settings.bleedPt;
      const leftContentX = leftFixedBaseX + creep;
      const rightContentX = rightFixedBaseX - creep;

      await drawPdfPageOnSheet({ outDoc, outPage, srcDoc, srcPageIndex: leftNum ? leftNum - 1 : null, isLeft: true, baseX: leftContentX, baseY: 0, settings, font });
      await drawPdfPageOnSheet({ outDoc, outPage, srcDoc, srcPageIndex: rightNum ? rightNum - 1 : null, isLeft: false, baseX: rightContentX, baseY: 0, settings, font });

      const leftTrimX = leftFixedBaseX + settings.bleedPt;
      const rightTrimX = rightFixedBaseX;
      const trimY = settings.bleedPt;

      if (settings.addMarks) {
        drawCropMarks(outPage, leftTrimX, trimY, trimW, trimH, settings, { isLeft: true, skipSpine: true });
        drawCropMarks(outPage, rightTrimX, trimY, trimW, trimH, settings, { isLeft: false, skipSpine: true });
      }
      if (settings.drawFold) {
        const foldX = width - settings.bleedPt;
        const len = settings.markLenPt;
        const off = settings.markOffsetPt;
        const lw = settings.markWeightPt;
        const black = rgb(0, 0, 0);
        // Segni di piega, non linea continua: due piccoli tratti verticali sopra e sotto il dorso.
        outPage.drawLine({ start: {x: foldX, y: settings.bleedPt - off}, end: {x: foldX, y: settings.bleedPt - off - len}, thickness: lw, color: black });
        outPage.drawLine({ start: {x: foldX, y: sheetH - settings.bleedPt + off}, end: {x: foldX, y: sheetH - settings.bleedPt + off + len}, thickness: lw, color: black });
      }
    }

    latestOutputBytes = await outDoc.save();
    const blob = new Blob([latestOutputBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = (els.pdfFile.files[0]?.name || 'booklet.pdf').replace(/\.pdf$/i, '');
    a.href = url;
    a.download = `${baseName}_booklet_imposed.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    await renderPdfPreview(blob);
    setStatus('PDF imposto generato e scaricato. Controlla sempre una prova stampata prima della produzione.', 'ok');
  } catch (err) {
    console.error(err);
    setStatus(`Errore generazione: ${err.message}`, 'err');
  } finally {
    els.generateBtn.disabled = false;
  }
}

async function renderPdfPreview(blob) {
  const array = await blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: array }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const wrapW = Math.min(900, document.querySelector('.preview-wrap').clientWidth - 48);
  const scale = Math.max(.1, wrapW / viewport.width);
  const vp = page.getViewport({ scale });
  const ctx = els.canvas.getContext('2d');
  els.canvas.width = vp.width;
  els.canvas.height = vp.height;
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
}

async function drawSchematicPreview() {
  const ctx = els.canvas.getContext('2d');
  const w = els.canvas.width = 900;
  const h = els.canvas.height = 560;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(70, 70, 760, 420);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(70, 70, 760, 420);
  ctx.strokeStyle = '#145cff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(450, 92); ctx.lineTo(450, 62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(450, 468); ctx.lineTo(450, 498); ctx.stroke();
  ctx.fillStyle = '#eef4ff';
  ctx.fillRect(95, 105, 355, 350);
  ctx.fillRect(450, 105, 355, 350);
  ctx.strokeStyle = '#ff4d00';
  ctx.lineWidth = 2;
  ctx.strokeRect(95,105,355,350);
  ctx.strokeRect(450,105,355,350);
  ctx.fillStyle = '#151923';
  ctx.font = '700 22px system-ui';
  ctx.fillText('Pagina sinistra', 190, 285);
  ctx.fillText('Pagina destra', 560, 285);
  ctx.font = '14px system-ui';
  ctx.fillStyle = '#667085';
  ctx.fillText('Bleed interno rimosso: i trim si toccano sulla piega', 278, 520);
  ctx.fillStyle = '#145cff';
  ctx.fillText('Dorso / piega', 462, 94);
}

els.pdfFile.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  els.fileName.textContent = file.name;
  sourceBytes = await file.arrayBuffer();
  sourceInfo = null;
  latestOutputBytes = null;
  els.analyzeBtn.disabled = false;
  els.generateBtn.disabled = true;
  setStatus('PDF caricato. Avvio analisi…');
  await analyzePdf();
});

els.analyzeBtn.addEventListener('click', analyzePdf);
els.generateBtn.addEventListener('click', generateImposedPdf);
['bleedMm','markLenMm','markOffsetMm','markWeightPt','paperGsm','bulk','manualThicknessMm','creepScale','creepMode','addMarks','drawFold'].forEach(id => {
  els[id].addEventListener('input', () => {
    if (sourceInfo) {
      updateMetrics();
      renderPlanTable();
      setStatus('Impostazioni aggiornate. Rigenera il PDF per applicarle.', 'ok');
    }
  });
});

drawSchematicPreview();
