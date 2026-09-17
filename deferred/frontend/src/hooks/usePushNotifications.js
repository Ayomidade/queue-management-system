import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "../features/auth/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const usePushNotifications = () => {
  const { auth } = useAuth();
  const registrationRef = useRef(null);

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      registrationRef.current = reg;
      return reg;
    } catch {
      return null;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!auth?.token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = registrationRef.current || (await registerServiceWorker());
      if (!reg) return;

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await sendSubscriptionToServer(existing);
        return;
      }

      const res = await fetch(`${API_URL}/push/vapid-public-key`);
      const { data } = await res.json();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      await sendSubscriptionToServer(subscription);
    } catch {
      // push not supported or blocked
    }
  }, [auth?.token, registerServiceWorker]);

  const sendSubscriptionToServer = async (subscription) => {
    if (!auth?.token) return;

    const body = subscription.toJSON();
    await fetch(`${API_URL}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        endpoint: body.endpoint,
        keys: body.keys,
      }),
    });
  };

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    const reg = registrationRef.current || (await navigator.serviceWorker.getRegistration());
    if (!reg) return;

    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await fetch(`${API_URL}/push/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });

    await sub.unsubscribe();
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token) return;

    registerServiceWorker().then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) sendSubscriptionToServer(sub);
        });
      }
    });
  }, [auth?.token, registerServiceWorker]);

  return { subscribe, unsubscribe };
};
