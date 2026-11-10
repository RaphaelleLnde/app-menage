import webpush from 'web-push';
import { db } from './db';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hote@example.com', pub, priv);
  configured = true;
  return true;
}

// Envoie une notification aux appareils qui l'ont activée.
// to : rôles destinataires ('host' = l'hôte, 'concierge' = la conciergerie). Par défaut : tout le monde.
export async function notifyHost({ title, body, url, to = ['host', 'concierge'] }) {
  if (!configure()) return { sent: 0, reason: 'clés VAPID manquantes' };
  const subs = (await db.listPushSubscriptions()).filter((s) => to.includes(s.role || 'host'));
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(s.subscription, JSON.stringify({ title, body, url }));
      sent++;
    } catch (e) {
      // 404/410 : l'appareil a retiré l'autorisation, on l'oublie
      if (e.statusCode === 404 || e.statusCode === 410) await db.deletePushSubscription(s.endpoint);
      else console.error('Notification :', e.statusCode, e.body);
    }
  }));
  return { sent };
}
