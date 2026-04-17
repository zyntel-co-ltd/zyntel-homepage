import { sql } from '@zyntel/db';

export type PitchSessionStatus = 'active' | 'disabled';

export interface PitchSession {
  id: string;
  token: string;
  label: string;
  audienceName: string;
  eventContext: string;
  deckFolder: string;
  deckFile: string;
  status: PitchSessionStatus;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PitchView {
  id: string;
  sessionId: string;
  viewedAt: Date;
  userAgent: string | null;
  durationSeconds: number | null;
}

function rowToSession(row: Record<string, any>): PitchSession {
  return {
    id: String(row.id),
    token: String(row.token),
    label: String(row.label),
    audienceName: String(row.audience_name),
    eventContext: String(row.event_context),
    deckFolder: String(row.deck_folder),
    deckFile: String(row.deck_file),
    status: String(row.status) as PitchSessionStatus,
    expiryDate: row.expiry_date ? new Date(row.expiry_date) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToView(row: Record<string, any>): PitchView {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    viewedAt: new Date(row.viewed_at),
    userAgent: (row.user_agent ?? null) as string | null,
    durationSeconds: (row.duration_seconds ?? null) as number | null,
  };
}

export async function getAllPitchSessions(): Promise<PitchSession[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM pitch_sessions ORDER BY created_at DESC`;
  return (rows as Record<string, any>[]).map(rowToSession);
}

export async function getPitchSessionByToken(token: string): Promise<PitchSession | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM pitch_sessions WHERE token = ${token}`;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToSession(row) : null;
}

export async function createPitchSession(data: {
  label: string;
  audienceName: string;
  eventContext: string;
  deckFolder: string;
  deckFile?: string;
  status?: PitchSessionStatus;
  expiryDate?: Date | null;
}): Promise<PitchSession> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');

  const deckFile = String(data.deckFile ?? 'pitch-deck.html').trim() || 'pitch-deck.html';
  const status = (data.status ?? 'active') as PitchSessionStatus;
  const expiryDate = data.expiryDate === undefined ? null : data.expiryDate;

  const rows = await sql`
    INSERT INTO pitch_sessions (
      label,
      audience_name,
      event_context,
      deck_folder,
      deck_file,
      status,
      expiry_date
    )
    VALUES (
      ${data.label},
      ${data.audienceName},
      ${data.eventContext},
      ${data.deckFolder},
      ${deckFile},
      ${status},
      ${expiryDate}
    )
    RETURNING *
  `;
  return rowToSession(rows[0] as Record<string, any>);
}

export async function updatePitchSession(
  id: string,
  data: Partial<{
    label: string;
    audienceName: string;
    eventContext: string;
    deckFolder: string;
    deckFile: string;
    status: PitchSessionStatus;
    expiryDate: Date | null;
  }>
): Promise<PitchSession> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');

  const updates: string[] = [];
  const values: Array<string | Date | null> = [];

  if (data.label !== undefined) {
    updates.push(`label = $${values.length + 1}`);
    values.push(data.label);
  }
  if (data.audienceName !== undefined) {
    updates.push(`audience_name = $${values.length + 1}`);
    values.push(data.audienceName);
  }
  if (data.eventContext !== undefined) {
    updates.push(`event_context = $${values.length + 1}`);
    values.push(data.eventContext);
  }
  if (data.deckFolder !== undefined) {
    updates.push(`deck_folder = $${values.length + 1}`);
    values.push(data.deckFolder);
  }
  if (data.deckFile !== undefined) {
    updates.push(`deck_file = $${values.length + 1}`);
    values.push(data.deckFile);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${values.length + 1}`);
    values.push(data.status);
  }
  if (data.expiryDate !== undefined) {
    updates.push(`expiry_date = $${values.length + 1}`);
    values.push(data.expiryDate);
  }

  if (!updates.length) {
    const existing = await sql`SELECT * FROM pitch_sessions WHERE id = ${id}`;
    const row = existing[0] as Record<string, any> | undefined;
    if (!row) throw new Error('Pitch session not found');
    return rowToSession(row);
  }

  values.push(id);
  const query = `
    UPDATE pitch_sessions
    SET ${updates.join(', ')}, updated_at = now()
    WHERE id = $${values.length}
    RETURNING *
  `;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Pitch session not found');
  return rowToSession(row);
}

export async function deletePitchSession(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM pitch_sessions WHERE id = ${id}`;
}

export async function logPitchView(
  sessionId: string,
  userAgent?: string | null,
  durationSeconds?: number | null
): Promise<PitchView> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO pitch_views (session_id, user_agent, duration_seconds)
    VALUES (${sessionId}, ${userAgent ?? null}, ${durationSeconds ?? null})
    RETURNING *
  `;
  return rowToView(rows[0] as Record<string, any>);
}

export async function getPitchViewHistory(sessionId: string): Promise<PitchView[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT * FROM pitch_views
    WHERE session_id = ${sessionId}
    ORDER BY viewed_at DESC
  `;
  return (rows as Record<string, any>[]).map(rowToView);
}

