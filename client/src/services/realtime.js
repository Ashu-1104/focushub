// Identifies this browser tab, so the server can skip echoing our own changes back to us.
export const CLIENT_ID = (globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Server-Sent Events stream of changes made in the user's other tabs and devices.
export const openEventStream = () =>
  new EventSource(`${API_URL}/events?clientId=${encodeURIComponent(CLIENT_ID)}`, { withCredentials: true });
