export function isPublicSupabaseConfig(url: string, key: string): boolean {
  try {
    const parsed = new URL(url);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) || parsed.username || parsed.password) return false;
    if (key.startsWith('sb_publishable_') && key.length > 20) return true;
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // This is a guard against accidentally configuring a privileged key, not JWT validation.
    return payload.role === 'anon';
  } catch { return false; }
}
