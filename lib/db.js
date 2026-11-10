// Accès aux données. Deux modes :
//  - Supabase (production) : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//  - Mémoire (démo / tests) : DEMO_MODE=1, rien n'est conservé au redémarrage
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const BUCKET = 'photos';
const isDemo = () => process.env.DEMO_MODE === '1';

// ---------- Supabase ----------
let _sb = null;
function sb() {
  if (!_sb) {
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      // Important : Next.js garde en cache les lectures faites avec fetch. Sans « no-store »,
      // l'application relisait d'anciennes données (checklist non mise à jour, PDF vide…).
      global: { fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }) },
    });
  }
  return _sb;
}
function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// Les vidéos sont rangées dans la même table que les photos (kind = 'video') : on les sépare ici
function splitMedia(cleaning, media) {
  const all = JSON.parse(JSON.stringify(media));
  return { ...cleaning, photos: all.filter((p) => p.kind !== 'video'), videos: all.filter((p) => p.kind === 'video') };
}

const supa = {
  async getState(key) {
    const rows = check(await sb().from('app_state').select('value').eq('key', key));
    return rows[0]?.value ?? null;
  },
  async setState(key, value) {
    check(await sb().from('app_state').upsert({ key, value }));
  },
  async listCleanings({ from, to, statuses } = {}) {
    let q = sb().from('cleanings').select('*');
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    if (statuses) q = q.in('status', statuses);
    return check(await q.order('date', { ascending: true }));
  },
  async listHistory(limit = 50) {
    return check(
      await sb().from('cleanings').select('*').in('status', ['done', 'in_progress'])
        .order('date', { ascending: false }).limit(limit)
    );
  },
  async getCleaning(id) {
    // Les trois lectures partent en même temps
    const [r1, r2, r3] = await Promise.all([
      sb().from('cleanings').select('*').eq('id', id),
      sb().from('cleaning_checks').select('*').eq('cleaning_id', id).order('position'),
      sb().from('photos').select('*').eq('cleaning_id', id).order('received_at'),
    ]);
    const rows = check(r1);
    if (!rows[0]) return null;
    return splitMedia({ ...rows[0], checks: check(r2) }, check(r3));
  },
  async getMedia(id) {
    return check(await sb().from('photos').select('*').eq('id', id))[0] || null;
  },
  async listOldVideos(before) {
    return check(await sb().from('photos').select('id,storage_path').eq('kind', 'video').lt('received_at', before));
  },
  async videoBytes() {
    const rows = check(await sb().from('photos').select('size_bytes').eq('kind', 'video'));
    return rows.reduce((n, r) => n + (r.size_bytes || 0), 0);
  },
  // Supprime fichiers et lignes (vidéos anciennes)
  async deleteMedia(rows) {
    if (!rows.length) return;
    check(await sb().storage.from(BUCKET).remove(rows.map((r) => r.storage_path)));
    check(await sb().from('photos').delete().in('id', rows.map((r) => r.id)));
  },
  // Adresse d'envoi directe vers le stockage : la vidéo ne passe pas par Vercel (limite 4,5 Mo)
  async createUploadUrl(path) {
    return check(await sb().storage.from(BUCKET).createSignedUploadUrl(path)).signedUrl;
  },
  async fileExists(path) {
    const { data } = await sb().storage.from(BUCKET).exists(path);
    return !!data;
  },
  // Lien de téléchargement : le fichier est enregistré sous un nom lisible
  async downloadUrl(path, filename) {
    const d = check(await sb().storage.from(BUCKET).createSignedUrl(path, 600, { download: filename }));
    return d.signedUrl;
  },
  async getCleaningLite(id) {
    return check(await sb().from('cleanings').select('id,status').eq('id', id))[0] || null;
  },
  async getCheck(cleaningId, checkId) {
    return check(await sb().from('cleaning_checks').select('id').eq('id', checkId).eq('cleaning_id', cleaningId))[0] || null;
  },
  async getIcalCleanings(since) {
    return check(await sb().from('cleanings').select('*').not('ical_uid', 'is', null).gte('date', since));
  },
  async insertCleaning(row) {
    return check(await sb().from('cleanings').insert(row).select())[0];
  },
  async updateCleaning(id, patch) {
    return check(await sb().from('cleanings').update(patch).eq('id', id).select())[0];
  },
  async insertChecks(rows) {
    check(await sb().from('cleaning_checks').insert(rows));
  },
  async setCheck(cleaningId, checkId, checked) {
    return check(
      await sb().from('cleaning_checks')
        .update({ checked, checked_at: checked ? new Date().toISOString() : null })
        .eq('id', checkId).eq('cleaning_id', cleaningId).select()
    )[0];
  },
  async insertPhoto(row) {
    // received_at est rempli par la base (now()) : l'heure vient du serveur, pas du téléphone.
    return check(await sb().from('photos').insert(row).select())[0];
  },
  async listChecklistItems() {
    return check(await sb().from('checklist_items').select('*').order('position'));
  },
  // On ajoute la nouvelle liste avant de supprimer l'ancienne : en cas d'erreur, rien n'est perdu
  async replaceChecklistItems(items) {
    const old = check(await sb().from('checklist_items').select('id'));
    if (items.length) check(await sb().from('checklist_items').insert(items));
    if (old.length) check(await sb().from('checklist_items').delete().in('id', old.map((o) => o.id)));
  },
  async addPushSubscription(sub) {
    const { role = 'host', ...subscription } = sub;
    check(await sb().from('push_subscriptions').upsert({ endpoint: sub.endpoint, subscription, role }));
  },
  async listPushSubscriptions() {
    return check(await sb().from('push_subscriptions').select('*'));
  },
  async deletePushSubscription(endpoint) {
    check(await sb().from('push_subscriptions').delete().eq('endpoint', endpoint));
  },
  async uploadFile(path, buffer, contentType) {
    check(await sb().storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false }));
  },
  async signedUrl(path) {
    const d = check(await sb().storage.from(BUCKET).createSignedUrl(path, 3600));
    return d.signedUrl;
  },
  // Une seule requête pour toutes les photos d'un ménage
  async signedUrls(paths) {
    if (!paths.length) return [];
    const d = check(await sb().storage.from(BUCKET).createSignedUrls(paths, 3600));
    return d.map((x) => x.signedUrl);
  },
  async downloadFile(path) {
    const blob = check(await sb().storage.from(BUCKET).download(path));
    return Buffer.from(await blob.arrayBuffer());
  },
};

// ---------- Mémoire (démo) ----------
function mem() {
  if (!globalThis.__menageMem) {
    globalThis.__menageMem = {
      state: {}, cleanings: [], checks: [], photos: [], items: [], subs: [], files: {},
      seqCleaning: 0, seqCheck: 0,
    };
  }
  return globalThis.__menageMem;
}
const clone = (x) => JSON.parse(JSON.stringify(x));

const memory = {
  async getState(key) { return mem().state[key] ?? null; },
  async setState(key, value) { mem().state[key] = value; },
  async listCleanings({ from, to, statuses } = {}) {
    return clone(mem().cleanings.filter((c) =>
      (!from || c.date >= from) && (!to || c.date <= to) && (!statuses || statuses.includes(c.status))
    ).sort((a, b) => a.date.localeCompare(b.date)));
  },
  async listHistory(limit = 50) {
    return clone(mem().cleanings.filter((c) => ['done', 'in_progress'].includes(c.status))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit));
  },
  async getCleaning(id) {
    const c = mem().cleanings.find((x) => x.id === id);
    if (!c) return null;
    return splitMedia({
      ...clone(c),
      checks: clone(mem().checks.filter((k) => k.cleaning_id === id).sort((a, b) => a.position - b.position)),
    }, mem().photos.filter((p) => p.cleaning_id === id));
  },
  async getMedia(id) { const p = mem().photos.find((x) => x.id === id); return p ? clone(p) : null; },
  async listOldVideos(before) { return clone(mem().photos.filter((p) => p.kind === 'video' && p.received_at < before)); },
  async videoBytes() { return mem().photos.filter((p) => p.kind === 'video').reduce((n, p) => n + (p.size_bytes || 0), 0); },
  async deleteMedia(rows) {
    const ids = rows.map((r) => r.id);
    for (const r of rows) delete mem().files[r.storage_path];
    mem().photos = mem().photos.filter((p) => !ids.includes(p.id));
  },
  async createUploadUrl(path) { return `/api/demo-file?path=${encodeURIComponent(path)}`; },
  async fileExists(path) { return !!mem().files[path]; },
  async downloadUrl(path, filename) { return `/api/demo-file?path=${encodeURIComponent(path)}&dl=${encodeURIComponent(filename)}`; },
  async getIcalCleanings(since) {
    return clone(mem().cleanings.filter((c) => c.ical_uid && c.date >= since));
  },
  async insertCleaning(row) {
    const m = mem();
    const c = {
      id: crypto.randomUUID(), number: ++m.seqCleaning, status: 'planned', cleaner_name: null,
      completed_by: null, started_at: null, completed_at: null, notes: null, ical_uid: null,
      checkin_date: null, next_checkin: null, checkin_time: null, checkout_time: null, host_memo: null, source: 'manual', host_note: null, extra_tasks: [], guest_name: null, resa_code: null, guest_phone4: null, resa_gone: false, has_remarks: false, remarks_seen: false, created_at: new Date().toISOString(), ...row,
    };
    m.cleanings.push(c);
    return clone(c);
  },
  async updateCleaning(id, patch) {
    const c = mem().cleanings.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    return clone(c);
  },
  async insertChecks(rows) {
    const m = mem();
    for (const r of rows) m.checks.push({ id: ++m.seqCheck, checked: false, checked_at: null, ...r });
  },
  async setCheck(cleaningId, checkId, checked) {
    const k = mem().checks.find((x) => x.id === Number(checkId) && x.cleaning_id === cleaningId);
    if (!k) return null;
    k.checked = checked;
    k.checked_at = checked ? new Date().toISOString() : null;
    return clone(k);
  },
  async insertPhoto(row) {
    const p = { id: crypto.randomUUID(), kind: 'photo', received_at: new Date().toISOString(), ...row };
    mem().photos.push(p);
    return clone(p);
  },
  async listChecklistItems() { return clone(mem().items.sort((a, b) => a.position - b.position)); },
  async replaceChecklistItems(items) { mem().items = clone(items).map((it, i) => ({ id: i + 1, ...it })); },
  async addPushSubscription(sub) {
    const m = mem();
    m.subs = m.subs.filter((s) => s.endpoint !== sub.endpoint);
    const { role = 'host', ...subscription } = sub;
    m.subs.push({ endpoint: sub.endpoint, subscription, role });
  },
  async listPushSubscriptions() { return clone(mem().subs); },
  async deletePushSubscription(endpoint) { mem().subs = mem().subs.filter((s) => s.endpoint !== endpoint); },
  async uploadFile(path, buffer) { mem().files[path] = buffer; },
  async signedUrl(path) { return `/api/demo-file?path=${encodeURIComponent(path)}`; },
  async signedUrls(paths) { return paths.map((p) => `/api/demo-file?path=${encodeURIComponent(p)}`); },
  async getCleaningLite(id) { const c = mem().cleanings.find((x) => x.id === id); return c ? { id: c.id, status: c.status } : null; },
  async getCheck(cleaningId, checkId) { const k = mem().checks.find((x) => x.id === Number(checkId) && x.cleaning_id === cleaningId); return k ? { id: k.id } : null; },
  async downloadFile(path) { return mem().files[path]; },
};

export const db = new Proxy({}, { get: (_, k) => (isDemo() ? memory : supa)[k] });
