import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TZ } from './util';

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

  newPage();
  text(`Dossier de ménage n° ${cleaning.number}`, { size: 18, f: bold });
  if (propertyName) text(propertyName, { size: 12, color: grey });
  y -= 6;
  text(`Date du ménage : ${fmtDate(cleaning.date)}`);
  text(`Commencé par : ${cleaning.cleaner_name || '-'}    Terminé par : ${cleaning.completed_by || '-'}`);
  text(`Début : ${fmtDateTime(cleaning.started_at)}    Fin : ${fmtDateTime(cleaning.completed_at)}    Durée : ${duration(cleaning.started_at, cleaning.completed_at)}`);
  text(`Statut : ${cleaning.status === 'done' ? 'Terminé' : cleaning.status}    Photos : ${photos.length}`);
  if (cleaning.host_note) { y -= 4; text("Consigne de l'hôte :", { f: bold }); wrap(cleaning.host_note); }
  if (cleaning.notes) { y -= 4; text('Commentaire du personnel :', { f: bold }); wrap(cleaning.notes); }

  y -= 10;
  text('Checklist', { size: 14, f: bold });
  let room = null;
  for (const k of cleaning.checks) {
    if (k.room !== room) { room = k.room; y -= 4; text(room, { f: bold, size: 11 }); }
    const n = photos.filter((p) => p.check_id === k.id).length;
    wrap(`${k.checked ? '[x]' : '[ ]'} ${k.label}${k.checked_at ? '  (' + fmtDateTime(k.checked_at) + ')' : ''}${n ? '  - ' + n + ' photo(s)' : ''}`, { x: M + 10 });
  }

  if (photos.length) {
    newPage();
    text('Photos', { size: 14, f: bold });
    const colW = (A4[0] - 2 * M - 15) / 2;
    const imgH = 170;
    let col = 0;
    for (const p of photos) {
      if (col === 0) ensure(imgH + 50);
      let img;
      try { img = isPng(p.buffer) ? await pdf.embedPng(p.buffer) : await pdf.embedJpg(p.buffer); } catch { img = null; }
      const x = M + col * (colW + 15);
      const top = y;
      if (img) {
        const s = Math.min(colW / img.width, imgH / img.height);
        page.drawImage(img, { x, y: top - img.height * s, width: img.width * s, height: img.height * s });
      }
      const k = cleaning.checks.find((c) => c.id === p.check_id);
      const caption = [
        k ? `${k.room} - ${k.label}` : 'Photo générale',
        `Reçue le ${fmtDateTime(p.received_at)} (heure serveur)`,
        `Par : ${p.uploaded_by || '-'}`,
        `SHA-256 : ${String(p.sha256).slice(0, 32)}`,
      ];
      let cy = top - imgH - 10;
      for (const line of caption) {
        let t = clean(line);
        while (font.widthOfTextAtSize(t, 7.5) > colW && t.length > 4) t = t.slice(0, -2);
        page.drawText(t, { x, y: cy, size: 7.5, font, color: grey });
        cy -= 10;
      }
      col = (col + 1) % 2;
      if (col === 0) y = top - imgH - 55;
    }
  }

  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawText(clean(`Dossier n° ${cleaning.number} - page ${i + 1}/${pages.length} - horodatages enregistrés par le serveur à la réception, empreinte SHA-256 du fichier reçu.`), {
      x: M, y: 22, size: 7, font, color: grey,
    });
  });
  return Buffer.from(await pdf.save());
}
