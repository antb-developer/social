import webpush from "web-push";
import { env } from "../config/env";
import {
  deleteSubscriptionByEndpoint,
  findSubscriptionsForUsers,
} from "../repositories/pushSubscriptionRepository";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    // VAPID keys not set (e.g. local dev without them) — skip push silently
    // rather than crash the request that triggered it.
    return false;
  }
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0 || !ensureConfigured()) {
    return;
  }

  const subscriptions = await findSubscriptionsForUsers(uniqueUserIds);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as unknown as { p256dh: string; auth: string } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
        }
        // Any other failure is swallowed — a bad push shouldn't fail the
        // request (order creation, message send, etc.) that triggered it.
      }
    })
  );
}
