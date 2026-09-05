const { PDFDocument, rgb, cmyk, StandardFonts, decodePDFRawStream, PDFRawStream } = PDFLib;

// Disabilitiamo il worker per garantire la compatibilità se aperto come file locale in browser come Chrome
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
pdfjsLib.GlobalWorkerOptions.disableWorker = true;

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
  coverType: document.getElementById('coverType'),
  coverSettings: document.getElementById('coverSettings'),
  coverSpreads: document.getElementById('coverSpreads'),
  coverGsm: document.getElementById('coverGsm'),
  coverBulk: document.getElementById('coverBulk'),
  coverManualThicknessMm: document.getElementById('coverManualThicknessMm'),
  creepScale: document.getElementById('creepScale'),
  creepMode: document.getElementById('creepMode'),
  addMarks: document.getElementById('addMarks'),
  drawFold: document.getElementById('drawFold'),
  colorMode: document.getElementById('colorMode'),
  colorModeDetected: document.getElementById('colorModeDetected'),
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

function extractStreamText(streamObj) {
  if (!streamObj) return '';
  try {
    if (streamObj instanceof PDFRawStream) {
      const decoded = decodePDFRawStream(streamObj).getBytes();
      return new TextDecoder('latin1').decode(decoded);
    }
    if (typeof streamObj.getContentsString === 'function') {
      return streamObj.getContentsString();
    }
  } catch (err) {
    console.warn('Lettura di un content stream non riuscita, lo ignoro.', err);
  }
  return '';
}

function detectColorSpace(srcDoc) {
  try {
    const page = srcDoc.getPages()[0];
    if (!page) return 'unknown';
    const contents = page.node.Contents(); // PDFStream | PDFArray | undefined
    if (!contents) return 'unknown';

    const context = page.node.context;
    const streamObjs = [];
    if (Array.isArray(contents.array)) {
      for (const ref of contents.array) {
        const resolved = context.lookup(ref);
        if (resolved) streamObjs.push(resolved);
      }
    } else {
      streamObjs.push(contents);
    }

    let raw = '';
    for (const obj of streamObjs) raw += extractStreamText(obj);
    if (!raw) return 'unknown';

    const rgbMatches = (raw.match(/[\d.]+\s+[\d.]+\s+[\d.]+\s+(rg|RG)\b/g) || []).length;
    const cmykMatches = (raw.match(/[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+(k|K)\b/g) || []).length;
    const cmykCsMatches = (raw.match(/\/DeviceCMYK/g) || []).length;
    const rgbCsMatches = (raw.match(/\/DeviceRGB/g) || []).length;

    const cmykScore = cmykMatches + cmykCsMatches;
    const rgbScore = rgbMatches + rgbCsMatches;

    if (cmykScore === 0 && rgbScore === 0) return 'unknown';
    return cmykScore >= rgbScore ? 'cmyk' : 'rgb';
  } catch (err) {
    console.warn('Rilevamento colorspace non riuscito, uso fallback unknown.', err);
    return 'unknown';
  }
}

function resolveMarkColor(colorMode, detected) {
  const effective = colorMode === 'auto' ? detected : colorMode;
  if (effective === 'cmyk') {
    return { color: cmyk(1, 1, 1, 1), space: 'cmyk' };
  }
  return { color: rgb(0, 0, 0), space: 'rgb' };
}

function getSettings() {
  const manual = parseFloat(els.manualThicknessMm.value);
  const gsm = parseFloat(els.paperGsm.value || 0);
  const bulk = parseFloat(els.bulk.value || 1);
  const estimatedThickness = gsm * bulk / 1000;
  
  const coverManual = parseFloat(els.coverManualThicknessMm ? els.coverManualThicknessMm.value : NaN);
  const coverGsm = parseFloat(els.coverGsm ? els.coverGsm.value : 0);
  const coverBulk = parseFloat(els.coverBulk ? els.coverBulk.value : 1);
  const coverEstimatedThickness = coverGsm * coverBulk / 1000;
  const coverType = els.coverType ? els.coverType.value : 'auto';
  const coverSpreads = parseInt(els.coverSpreads ? els.coverSpreads.value : 1, 10);

  return {
    bleedPt: mmToPt(els.bleedMm.value),
    bleedMm: parseFloat(els.bleedMm.value || 0),
    markLenPt: mmToPt(els.markLenMm.value),
    markOffsetPt: mmToPt(els.markOffsetMm.value),
    markWeightPt: parseFloat(els.markWeightPt.value || 0.3),
    sheetThicknessMm: Number.isFinite(manual) && manual > 0 ? manual : estimatedThickness,
    coverType: coverType,
    coverSpreads: Number.isFinite(coverSpreads) && coverSpreads > 0 ? coverSpreads : 1,
    coverThicknessMm: Number.isFinite(coverManual) && coverManual > 0 ? coverManual : coverEstimatedThickness,
    creepScale: parseFloat(els.creepScale.value || 1),
    creepMode: els.creepMode.value,
    addMarks: els.addMarks.checked,
    drawFold: els.drawFold.checked,
    colorMode: els.colorMode ? els.colorMode.value : 'auto',
  };
}

function buildBookletPlan(pageCount) {
  const total = Math.ceil(pageCount / 4) * 4;
  const sheets = total / 4;
  const rows = [];
  for (let i = 0; i < sheets; i++) {
    rows.push({ sheet: i + 1, side: i18n[currentLang].jsSideFront, left: total - (2 * i), right: 1 + (2 * i), depth: i });
    rows.push({ sheet: i + 1, side: i18n[currentLang].jsSideBack, left: 2 + (2 * i), right: total - 1 - (2 * i), depth: i });
  }
  return { total, sheets, rows };
}

function safePageNumber(n, originalCount) {
  return n >= 1 && n <= originalCount ? n : null;
}

function creepForDepth(depth, sheets, settings) {
  if (settings.creepMode === 'none') return 0;
  
  let baseCreepMm = 0;
  if (settings.coverType === 'separate') {
    baseCreepMm = settings.coverThicknessMm * settings.coverSpreads;
  }
  
  const mm = Math.max(0, (baseCreepMm + depth * settings.sheetThicknessMm) * settings.creepScale);
  const pt = mmToPt(mm);
  return settings.creepMode === 'inward' ? pt : -pt;
}

async function analyzePdf() {
  if (!sourceBytes) return;
  try {
    setStatus(i18n[currentLang].jsStatusLoading);
    const src = await PDFDocument.load(sourceBytes);
    const pages = src.getPages();
    if (!pages.length) throw new Error(i18n[currentLang].jsErrNoPages);
    const first = pages[0];
    const { width, height } = first.getSize();
    const settings = getSettings();
    const trimW = width - settings.bleedPt * 2;
    const trimH = height - settings.bleedPt * 2;
    if (trimW <= 0 || trimH <= 0) throw new Error(i18n[currentLang].jsErrBleedLarge);
    const plan = buildBookletPlan(pages.length);
    const detectedColorSpace = detectColorSpace(src);
    sourceInfo = { width, height, trimW, trimH, pageCount: pages.length, plan, detectedColorSpace };
    updateColorModeBadge();
    updateMetrics();
    renderPlanTable();
    await drawSchematicPreview();
    els.generateBtn.disabled = false;
    setStatus(i18n[currentLang].jsStatusAnalyzed, 'ok');
  } catch (err) {
    console.error(err);
    setStatus(i18n[currentLang].jsErrAnalyze + err.message, 'err');
  }
}

function updateColorModeBadge() {
  if (!els.colorModeDetected || !sourceInfo) return;
  const labels = { cmyk: 'CMYK', rgb: 'RGB', unknown: i18n[currentLang].jsColorUndetermined };
  const detectedLabel = labels[sourceInfo.detectedColorSpace] || i18n[currentLang].jsColorUndetermined;
  const settings = getSettings();
  if (settings.colorMode === 'auto') {
    els.colorModeDetected.textContent = i18n[currentLang].jsColorDetected + detectedLabel + i18n[currentLang].jsColorUseProfile;
  } else {
    const forcedLabel = labels[settings.colorMode] || settings.colorMode;
    els.colorModeDetected.textContent = i18n[currentLang].jsColorDetected + detectedLabel + i18n[currentLang].jsColorForced + forcedLabel;
  }
}

function updateMetrics() {
  if (!sourceInfo) return;
  const settings = getSettings();
  
  let baseCreepMm = 0;
  if (settings.coverType === 'separate') {
    baseCreepMm = settings.coverThicknessMm * settings.coverSpreads;
  }
  const maxCreep = (baseCreepMm + (sourceInfo.plan.sheets - 1) * settings.sheetThicknessMm) * settings.creepScale;
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
    const l = safePageNumber(row.left, sourceInfo.pageCount) || i18n[currentLang].jsBlank;
    const r = safePageNumber(row.right, sourceInfo.pageCount) || i18n[currentLang].jsBlank;
    return `<tr><td>${row.sheet}</td><td>${row.side}</td><td>${l}</td><td>${r}</td><td>${fmt(c, 3)} mm</td></tr>`;
  }).join('');
}

function drawCropMarks(page, x, y, w, h, settings, markColor, options = {}) {
  const len = settings.markLenPt;
  const off = settings.markOffsetPt;
  const lineWidth = settings.markWeightPt;
  const draw = (x1, y1, x2, y2) => page.drawLine({ start: {x: x1, y: y1}, end: {x: x2, y: y2}, thickness: lineWidth, color: markColor });

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

async function drawPdfPageOnSheet({ outDoc, outPage, srcDoc, srcPageIndex, isLeft, baseX, baseY, settings, font, creep = 0 }) {
  const { width, height, trimW, trimH, pageCount } = sourceInfo;
  if (srcPageIndex == null || srcPageIndex < 0 || srcPageIndex >= pageCount) {
    outPage.drawRectangle({ x: baseX + (isLeft ? settings.bleedPt : 0), y: baseY + settings.bleedPt, width: trimW, height: trimH, borderWidth: 0.4, borderColor: rgb(.82,.82,.82), color: rgb(1,1,1) });
    outPage.drawText(i18n[currentLang].jsBlankPage, { x: baseX + trimW / 2 - 28, y: baseY + trimH / 2, size: 8, font, color: rgb(.55,.55,.55) });
    return;
  }

  const srcPage = srcDoc.getPage(srcPageIndex);
  let clipX, clipY, clipW, clipH, destX;
  if (isLeft) {
    clipX = 0 - creep;
    clipY = 0;
    clipW = width - settings.bleedPt; // mantiene bleed sinistro, taglia bleed destro interno
    clipH = height;
    destX = baseX;
  } else {
    clipX = settings.bleedPt + creep; // taglia bleed sinistro interno
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
    setStatus(i18n[currentLang].jsStatusGenerating);
    els.generateBtn.disabled = true;
    const settings = getSettings();
    const { color: markColor } = resolveMarkColor(settings.colorMode, sourceInfo.detectedColorSpace);
    const srcDoc = await PDFDocument.load(sourceBytes);
    const outDoc = await PDFDocument.create();
    const font = await outDoc.embedFont(StandardFonts.Helvetica);
    const { width, height, trimW, trimH, plan, pageCount } = sourceInfo;
    const baseSheetW = width * 2 - settings.bleedPt * 2; // due pagine meno i due bleed interni
    const baseSheetH = height;
    
    // Calcoliamo lo spazio extra necessario per i crocini (lunghezza + offset)
    const extraMargin = settings.addMarks || settings.drawFold ? (settings.markLenPt + settings.markOffsetPt) : 0;
    
    const finalSheetW = baseSheetW + extraMargin * 2;
    const finalSheetH = baseSheetH + extraMargin * 2;

    for (const row of plan.rows) {
      const outPage = outDoc.addPage([finalSheetW, finalSheetH]);
      const creep = creepForDepth(row.depth, plan.sheets, settings);
      const leftNum = safePageNumber(row.left, pageCount);
      const rightNum = safePageNumber(row.right, pageCount);

      // Creep corretto: i trim e i crocini restano fissi, modifichiamo il clipX della pagina sorgente
      // Aggiungiamo extraMargin per centrare il contenuto nel nuovo foglio ingrandito
      const leftFixedBaseX = extraMargin;
      const rightFixedBaseX = extraMargin + width - settings.bleedPt;
      const baseY = extraMargin;

      await drawPdfPageOnSheet({ outDoc, outPage, srcDoc, srcPageIndex: leftNum ? leftNum - 1 : null, isLeft: true, baseX: leftFixedBaseX, baseY: baseY, settings, font, creep });
      await drawPdfPageOnSheet({ outDoc, outPage, srcDoc, srcPageIndex: rightNum ? rightNum - 1 : null, isLeft: false, baseX: rightFixedBaseX, baseY: baseY, settings, font, creep });

      const leftTrimX = leftFixedBaseX + settings.bleedPt;
      const rightTrimX = rightFixedBaseX;
      const trimY = baseY + settings.bleedPt;

      if (settings.addMarks) {
        drawCropMarks(outPage, leftTrimX, trimY, trimW, trimH, settings, markColor, { isLeft: true, skipSpine: true });
        drawCropMarks(outPage, rightTrimX, trimY, trimW, trimH, settings, markColor, { isLeft: false, skipSpine: true });
      }
      if (settings.drawFold) {
        const foldX = rightFixedBaseX;
        const len = settings.markLenPt;
        const off = settings.markOffsetPt;
        const lw = settings.markWeightPt;
        outPage.drawLine({ start: {x: foldX, y: trimY - off}, end: {x: foldX, y: trimY - off - len}, thickness: lw, color: markColor });
        outPage.drawLine({ start: {x: foldX, y: trimY + trimH + off}, end: {x: foldX, y: trimY + trimH + off + len}, thickness: lw, color: markColor });
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
    setStatus(i18n[currentLang].jsStatusGenerated, 'ok');
  } catch (err) {
    console.error(err);
    setStatus(i18n[currentLang].jsErrGenerate + err.message, 'err');
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
  ctx.fillText(i18n[currentLang].jsPreviewLeft, 190, 285);
  ctx.fillText(i18n[currentLang].jsPreviewRight, 560, 285);
  ctx.font = '14px system-ui';
  ctx.fillStyle = '#667085';
  ctx.fillText(i18n[currentLang].jsPreviewNote1, 278, 520);
  ctx.fillStyle = '#145cff';
  ctx.fillText(i18n[currentLang].jsPreviewNote2, 462, 94);
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
  setStatus(i18n[currentLang].jsStatusPdfLoaded);
  await analyzePdf();
});

els.analyzeBtn.addEventListener('click', analyzePdf);
els.generateBtn.addEventListener('click', generateImposedPdf);

els.coverType.addEventListener('change', () => {
  els.coverSettings.style.display = els.coverType.value === 'separate' ? 'block' : 'none';
});

['bleedMm','markLenMm','markOffsetMm','markWeightPt','paperGsm','bulk','manualThicknessMm','creepScale','creepMode','addMarks','drawFold','colorMode','coverType','coverSpreads','coverGsm','coverBulk','coverManualThicknessMm'].forEach(id => {
  if (!els[id]) return;
  els[id].addEventListener('input', () => {
    if (sourceInfo) {
      updateColorModeBadge();
      updateMetrics();
      renderPlanTable();
      setStatus(i18n[currentLang].jsStatusUpdated, 'ok');
    }
  });
});

drawSchematicPreview();

window.addEventListener('languageChanged', () => {
  drawSchematicPreview();
  if (sourceInfo) {
    updateColorModeBadge();
    renderPlanTable();
  } else {
    els.status.textContent = i18n[currentLang].statusWait;
    document.getElementById('sigTableEmpty').textContent = i18n[currentLang].tbEmpty;
  }
});
