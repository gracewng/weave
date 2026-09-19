import 'server-only';

export class GoogleAuthError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = 'GoogleAuthError'; }
}

/** Exchange the stored Gmail refresh token for a short-lived access token. */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!client_id || !client_secret) throw new GoogleAuthError('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id, client_secret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(10000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new GoogleAuthError(`token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim(), res.status);
  }
  return json.access_token;
}
