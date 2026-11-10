import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TZ } from './util';
import { ARRIVAL_AREAS, BAD_STATES, stateLabel, areaLabel, stateInfo } from './arrival';

const A4 = [595.28, 841.89];
const M = 40;

export function fmtDateTime(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso));
}
export function fmtDate(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(iso + 'T00:00:00Z'));
}
function duration(a, b) {
  if (!a || !b) return '-';
  const min = Math.round((new Date(b) - new Date(a)) / 60000);
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}
// Les polices standard PDF ne connaissent que l'alphabet latin : on remplace le reste.
function clean(s) {
  return String(s ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E -ÿŒœ€]/g, '?');
}
function isPng(buf) { return buf[0] === 0x89 && buf[1] === 0x50; }

// photos : [{...row, buffer}]
export async function buildCleaningPdf(cleaning, photos, propertyName) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const grey = rgb(0.4, 0.4, 0.4);
  const blue = rgb(0.118, 0.243, 0.541);
  const gold = rgb(0.72, 0.48, 0.17);
  let page, y;

  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M; };
  const ensure = (h) => { if (y - h < M + 20) newPage(); };
  const text = (s, { size = 10, f = font, color = rgb(0, 0, 0), x = M } = {}) => {
    ensure(size + 4);
    page.drawText(clean(s), { x, y: y - size, size, font: f, color });
    y -= size + 5;
  };
  const wrap = (s, opts = {}) => {
    const size = opts.size || 10;
    const f = opts.f || font;
    const max = A4[0] - 2 * M - ((opts.x || M) - M);
    let line = '';
    for (const w of clean(s).split(/\s+/)) {
      const t = line ? line + ' ' + w : w;
      if (f.widthOfTextAtSize(t, size) > max && line) { text(line, opts); line = w; } else line = t;
    }
    if (line) text(line, opts);
  };

  // Grille de photos 2 par ligne, date et heure en bas à droite de chaque photo
  const drawPhotos = async (list, captionOf) => {
    const colW = (A4[0] - 2 * M - 15) / 2;
    const imgH = 170;
    let col = 0;
    for (const p of list) {
      if (col === 0) ensure(imgH + 50);
      let img;
      try { img = isPng(p.buffer) ? await pdf.embedPng(p.buffer) : await pdf.embedJpg(p.buffer); } catch { img = null; }
      const x = M + col * (colW + 15);
      const top = y;
      if (img) {
        const s = Math.min(colW / img.width, imgH / img.height);
        const w = img.width * s, h = img.height * s;
        page.drawImage(img, { x, y: top - h, width: w, height: h });
        const stamp = clean(fmtDateTime(p.received_at));
        const tw = bold.widthOfTextAtSize(stamp, 8);
        page.drawRectangle({ x: x + w - tw - 10, y: top - h + 4, width: tw + 6, height: 12, color: rgb(0, 0, 0), opacity: 0.6 });
        page.drawText(stamp, { x: x + w - tw - 7, y: top - h + 7.5, size: 8, font: bold, color: rgb(1, 1, 1) });
      } else {
        page.drawText('Photo illisible', { x, y: top - 20, size: 9, font, color: gold });
      }
      const caption = [captionOf(p), `Par : ${p.uploaded_by || '-'}  -  SHA-256 : ${String(p.sha256).slice(0, 20)}`];
      let cy = top - imgH - 10;
      caption.forEach((line, li) => {
        let t = clean(line);
        while (font.widthOfTextAtSize(t, 7.5) > colW && t.length > 4) t = t.slice(0, -2);
        page.drawText(t, { x, y: cy, size: li ? 7 : 8, font: li ? font : bold, color: li ? grey : rgb(0, 0, 0) });
        cy -= 10;
      });
      col = (col + 1) % 2;
      if (col === 0) y = top - imgH - 38;
    }
    if (col === 1) y -= imgH + 38;
  };
  // Les vidéos ne peuvent pas entrer dans un PDF : on indique si elles ont été faites, et quand
  const videoLine = (phase) => {
    const v = (cleaning.videos || []).filter((x) => x.phase === phase);
    if (v.length) text(`Vidéo globale : reçue le ${v.map((x) => fmtDateTime(x.received_at)).join(', ')} (à voir et télécharger dans l'application)`, { size: 9 });
    else text('Vidéo globale : non faite', { size: 9, color: grey });
  };
  const section = (title) => { ensure(60); y -= 8; text(title, { size: 14, f: bold, color: blue }); y -= 2; };

  const dateTitle = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(cleaning.date + 'T00:00:00Z'));
  pdf.setTitle(clean(`Rapport ménage - ${dateTitle}`));

  // ---------- En-tête ----------
  newPage();
  text(`Rapport ménage - ${dateTitle}`, { size: 20, f: bold });
  if (propertyName) text(`${propertyName} - ménage n° ${cleaning.number}`, { size: 11, color: grey });
  y -= 6;
  text(`Date du ménage : ${fmtDate(cleaning.date)}`);
  text(`Commencé par : ${cleaning.cleaner_name || '-'}    Terminé par : ${cleaning.completed_by || '-'}`);
  text(`Début : ${fmtDateTime(cleaning.started_at)}    Fin : ${fmtDateTime(cleaning.completed_at)}    Durée : ${duration(cleaning.started_at, cleaning.completed_at)}`);
  const nbDone = cleaning.checks.filter((k) => k.checked).length;
  const notDone = cleaning.checks.filter((k) => !k.checked && k.required !== false).length;
  text(`Statut : ${cleaning.status === 'done' ? 'Terminé' : cleaning.status}    Tâches cochées : ${nbDone} / ${cleaning.checks.length}    Photos : ${photos.length}`);
  if (notDone) text(`${notDone} tâche(s) à vérifier non cochée(s), signalées « NON FAIT » dans la checklist.`, { color: gold, f: bold });
  if (cleaning.host_note) { y -= 4; text("Consigne de l'hôte :", { f: bold }); wrap(cleaning.host_note); }
  if (cleaning.notes) { y -= 4; text('Commentaire du personnel en fin de ménage :', { f: bold }); wrap(cleaning.notes); }

  // ---------- 1. État à l'arrivée ----------
  const arrival = photos.filter((p) => p.phase === 'arrivee');
  section("1. État du logement à l'arrivée");
  if (cleaning.arrival_done_at) {
    const si = stateInfo(cleaning.arrival_state);
    if (si) {
      const hex = si.color.slice(1);
      ensure(16);
      page.drawCircle({ x: M + 6, y: y - 7, size: 6, color: rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255) });
    }
    text(`État constaté : ${stateLabel(cleaning.arrival_state)}`, { x: M + 18, f: bold, size: 11, color: BAD_STATES.includes(cleaning.arrival_state) ? gold : rgb(0, 0, 0) });
    text(`Constaté le ${fmtDateTime(cleaning.arrival_done_at)}`, { color: grey, size: 9 });
    if (cleaning.arrival_note) { text('Problèmes constatés :', { f: bold }); wrap(cleaning.arrival_note); }
    videoLine('arrivee');
    y -= 6;
    const order = ARRIVAL_AREAS.map((a) => a.key);
    await drawPhotos([...arrival].sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area)), (p) => areaLabel(p.area));
  } else {
    text("Pas d'état des lieux d'arrivée pour ce ménage.", { color: grey });
  }

  // ---------- 2. Checklist ----------
  section('2. Checklist');
  let room = null;
  for (const k of cleaning.checks) {
    if (k.room !== room) { room = k.room; y -= 4; text(room, { f: bold, size: 11, color: blue }); }
    const n = photos.filter((p) => p.check_id === k.id).length;
    ensure(16);
    const bx = M + 8, by = y - 10;
    page.drawRectangle({ x: bx, y: by, width: 9, height: 9, borderColor: k.checked ? blue : gold, borderWidth: 1, color: k.checked ? blue : undefined });
    if (k.checked) {
      page.drawLine({ start: { x: bx + 2, y: by + 4.5 }, end: { x: bx + 4, y: by + 2.2 }, thickness: 1.3, color: rgb(1, 1, 1) });
      page.drawLine({ start: { x: bx + 4, y: by + 2.2 }, end: { x: bx + 7.5, y: by + 7 }, thickness: 1.3, color: rgb(1, 1, 1) });
    }
    const suffix = k.checked ? `${k.checked_at ? '  (' + fmtDateTime(k.checked_at) + ')' : ''}${n ? '  - ' + n + ' photo(s)' : ''}` : '';
    wrap(`${k.label}${suffix}`, { x: M + 24, color: k.checked ? rgb(0, 0, 0) : rgb(0.25, 0.25, 0.25) });
    if (!k.checked) { y += 1; text(k.required !== false ? 'NON FAIT' : 'non cochée (tâche sans alerte)', { x: M + 24, size: 8, f: bold, color: k.required !== false ? gold : grey }); }
  }

  // ---------- 3. Photos après ménage ----------
  const after = photos.filter((p) => (p.phase || 'menage') === 'menage');
  section('3. Photos après le ménage');
  videoLine('menage');
  if (!after.length) text('Aucune photo.', { color: grey });
  await drawPhotos(after, (p) => {
    const k = cleaning.checks.find((c) => c.id === p.check_id);
    return k ? `${k.room} - ${k.label}` : 'Autre photo (problème signalé)';
  });

  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(clean(`Rapport ménage - ${dateTitle} - page ${i + 1}/${pages.length} - dates et heures enregistrées par le serveur à la réception des photos, empreinte SHA-256 du fichier reçu.`), {
      x: M, y: 22, size: 6.5, font, color: grey,
    });
  });
  return Buffer.from(await pdf.save());
}
