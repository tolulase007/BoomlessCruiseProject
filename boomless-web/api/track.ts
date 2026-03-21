type TrackEvent = 'session_start' | 'session_end';

type TrackPayload = {
  event?: unknown;
  session_id?: unknown;
  source?: unknown;
  path?: unknown;
  timezone?: unknown;
};

function asTrimmedString(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function readPayload(body: unknown): TrackPayload | null {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as unknown;
      if (parsed && typeof parsed === 'object') return parsed as TrackPayload;
      return null;
    } catch {
      return null;
    }
  }
  if (body && typeof body === 'object') return body as TrackPayload;
  return null;
}

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const payload = readPayload(req.body);
  if (!payload) {
    res.status(400).json({ ok: false });
    return;
  }

  const eventValue = asTrimmedString(payload.event, 32);
  const sessionId = asTrimmedString(payload.session_id, 128);
  const source = asTrimmedString(payload.source, 64);
  const path = asTrimmedString(payload.path, 255);
  const timezone = asTrimmedString(payload.timezone, 64);
  const event = eventValue as TrackEvent | null;

  if ((event !== 'session_start' && event !== 'session_end') || !sessionId || !source) {
    res.status(400).json({ ok: false });
    return;
  }

  const country = asTrimmedString(req.headers?.['x-vercel-ip-country'], 8);
  const region = asTrimmedString(req.headers?.['x-vercel-ip-country-region'], 32);

  console.log(
    JSON.stringify({
      timestamp_utc: new Date().toISOString(),
      event,
      session_id: sessionId,
      source,
      path,
      timezone,
      country,
      region,
    })
  );

  res.status(200).json({ ok: true });
}
