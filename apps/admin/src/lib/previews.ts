import { sql } from '@zyntel/db';
import type { PreviewClient, PreviewClientIntake } from '@zyntel/db/schema';

function rowToClient(row: Record<string, any>): PreviewClient {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    name: String(row.name),
    email: String(row.email),
    projectType: String(row.project_type) as PreviewClient['projectType'],
    clientFolder: String(row.client_folder),
    presentationFile: String(row.presentation_file),
    token: String(row.token),
    status: String(row.status) as PreviewClient['status'],
    expiryDate: new Date(row.expiry_date),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    intake: (row.intake ?? null) as PreviewClientIntake | null,
    choiceOption: (row.choice_option ?? null) as string | null,
    choiceComments: (row.choice_comments ?? null) as string | null,
    choiceSubmittedAt: row.choice_submitted_at ? new Date(row.choice_submitted_at) : null,
    choiceAnswers: (row.choice_answers ?? null) as PreviewClient['choiceAnswers'],
    decisionAnswers: (row.decision_answers ?? null) as PreviewClient['decisionAnswers'],
    decisionUpdatedAt: row.decision_updated_at ? new Date(row.decision_updated_at) : null,
    decisionSessionId: (row.decision_session_id ?? null) as string | null,
    stagingUrl: (row.staging_url ?? null) as string | null,
    stagingEnabled: (row.staging_enabled ?? null) as boolean | null,
    stagingSentAt: row.staging_sent_at ? new Date(row.staging_sent_at) : null,
    productionUrl: (row.production_url ?? null) as string | null,
    productionEnabled: (row.production_enabled ?? null) as boolean | null,
    productionSentAt: row.production_sent_at ? new Date(row.production_sent_at) : null,
  };
}

export async function patchPreviewDecisionByToken(data: {
  token: string;
  decisionAnswers: PreviewClient['decisionAnswers'];
  sessionId?: string | null;
}): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`
    UPDATE preview_clients
    SET
      decision_answers = ${data.decisionAnswers ? JSON.stringify(data.decisionAnswers) : null},
      decision_updated_at = now(),
      decision_session_id = ${data.sessionId ?? null},
      updated_at = now()
    WHERE token = ${data.token}
  `;
}

export async function getAllPreviewClients(): Promise<PreviewClient[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`SELECT * FROM preview_clients ORDER BY created_at DESC`;
  return (rows as Record<string, any>[]).map(rowToClient);
}

export async function getPreviewClientByToken(token: string): Promise<PreviewClient | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM preview_clients WHERE token = ${token}`;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToClient(row) : null;
}

export async function getPreviewClientById(clientId: string): Promise<PreviewClient | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM preview_clients WHERE client_id = ${clientId}`;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToClient(row) : null;
}

export async function createPreviewClient(data: {
  clientId: string;
  name: string;
  email: string;
  projectType: string;
  clientFolder: string;
  presentationFile: string;
  expiryDays: number;
  intake?: PreviewClientIntake;
}): Promise<PreviewClient> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO preview_clients (
      client_id, name, email, project_type, client_folder, presentation_file, expiry_date, intake
    )
    VALUES (
      ${data.clientId},
      ${data.name},
      ${data.email},
      ${data.projectType},
      ${data.clientFolder},
      ${data.presentationFile},
      now() + (${String(data.expiryDays)} || ' days')::interval,
      ${data.intake ? JSON.stringify(data.intake) : null}
    )
    RETURNING *
  `;
  return rowToClient(rows[0] as Record<string, any>);
}

export async function updatePreviewClient(
  clientId: string,
  data: Partial<{
    name: string;
    email: string;
    status: string;
    expiryDate: Date;
    intake: PreviewClientIntake;
    choiceOption: string | null;
    choiceComments: string | null;
    choiceSubmittedAt: Date | null;
    stagingUrl: string | null;
    stagingEnabled: boolean | null;
    stagingSentAt: Date | null;
    productionUrl: string | null;
    productionEnabled: boolean | null;
    productionSentAt: Date | null;
  }>
): Promise<PreviewClient> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const updates: string[] = [];
  const values: Array<string | Date | null> = [];

  if (data.name !== undefined) {
    updates.push(`name = $${values.length + 1}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${values.length + 1}`);
    values.push(data.email);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${values.length + 1}`);
    values.push(data.status);
  }
  if (data.expiryDate !== undefined) {
    updates.push(`expiry_date = $${values.length + 1}`);
    values.push(data.expiryDate);
  }
  if (data.intake !== undefined) {
    updates.push(`intake = $${values.length + 1}`);
    values.push(data.intake ? JSON.stringify(data.intake) : null);
  }
  if (data.choiceOption !== undefined) {
    updates.push(`choice_option = $${values.length + 1}`);
    values.push(data.choiceOption);
  }
  if (data.choiceComments !== undefined) {
    updates.push(`choice_comments = $${values.length + 1}`);
    values.push(data.choiceComments);
  }
  if (data.choiceSubmittedAt !== undefined) {
    updates.push(`choice_submitted_at = $${values.length + 1}`);
    values.push(data.choiceSubmittedAt);
  }
  if (data.stagingUrl !== undefined) {
    updates.push(`staging_url = $${values.length + 1}`);
    values.push(data.stagingUrl);
  }
  if (data.stagingEnabled !== undefined) {
    updates.push(`staging_enabled = $${values.length + 1}`);
    values.push(data.stagingEnabled as any);
  }
  if (data.stagingSentAt !== undefined) {
    updates.push(`staging_sent_at = $${values.length + 1}`);
    values.push(data.stagingSentAt);
  }
  if (data.productionUrl !== undefined) {
    updates.push(`production_url = $${values.length + 1}`);
    values.push(data.productionUrl);
  }
  if (data.productionEnabled !== undefined) {
    updates.push(`production_enabled = $${values.length + 1}`);
    values.push(data.productionEnabled as any);
  }
  if (data.productionSentAt !== undefined) {
    updates.push(`production_sent_at = $${values.length + 1}`);
    values.push(data.productionSentAt);
  }

  if (!updates.length) {
    const existing = await getPreviewClientById(clientId);
    if (!existing) throw new Error('Preview client not found');
    return existing;
  }

  values.push(clientId);
  const query = `
    UPDATE preview_clients
    SET ${updates.join(', ')}, updated_at = now()
    WHERE client_id = $${values.length}
    RETURNING *
  `;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Preview client not found');
  return rowToClient(row);
}

export async function submitPreviewChoiceByToken(data: {
  token: string;
  choiceOption: 'A' | 'B' | 'C';
  choiceComments: string;
  choiceAnswers?: PreviewClient['choiceAnswers'];
}): Promise<PreviewClient> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    UPDATE preview_clients
    SET
      choice_option = ${data.choiceOption},
      choice_comments = ${data.choiceComments},
      choice_answers = ${data.choiceAnswers ? JSON.stringify(data.choiceAnswers) : null},
      choice_submitted_at = now(),
      updated_at = now()
    WHERE token = ${data.token}
      AND status = 'active'
      AND choice_submitted_at IS NULL
    RETURNING *
  `;
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) {
    const existing = await sql`SELECT id, status, choice_submitted_at FROM preview_clients WHERE token = ${data.token}`;
    const ex = existing[0] as { status?: string; choice_submitted_at?: string | null } | undefined;
    if (!ex) throw new Error('Preview client not found');
    if (String(ex.status) !== 'active') throw new Error('Preview is not active');
    if (ex.choice_submitted_at) throw new Error('Choice already submitted');
    throw new Error('Could not submit choice');
  }
  return rowToClient(row);
}

export async function logPreviewEventByToken(data: {
  token: string;
  eventType: string;
  page?: string | null;
  userAgent?: string | null;
  durationSeconds?: number | null;
  sessionId?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const clientRows = await sql`SELECT id FROM preview_clients WHERE token = ${data.token}`;
  const clientRow = clientRows[0] as { id: string } | undefined;
  if (!clientRow?.id) throw new Error('Preview client not found');
  await sql`
    INSERT INTO preview_events (preview_client_id, event_type, page, user_agent, duration_seconds, session_id, data)
    VALUES (
      ${clientRow.id},
      ${data.eventType},
      ${data.page ?? null},
      ${data.userAgent ?? null},
      ${data.durationSeconds ?? null},
      ${data.sessionId ?? null},
      ${data.meta ? JSON.stringify(data.meta) : null}
    )
  `;
}

export async function getPreviewEventHistory(clientId: string): Promise<Array<{
  id: string;
  occurredAt: Date;
  eventType: string;
  page: string | null;
  userAgent: string | null;
  durationSeconds: number | null;
  sessionId: string | null;
  data: any;
}>> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT e.*
    FROM preview_events e
    JOIN preview_clients c ON c.id = e.preview_client_id
    WHERE c.client_id = ${clientId}
    ORDER BY e.occurred_at DESC
    LIMIT 200
  `;
  return (rows as Record<string, any>[]).map((r) => ({
    id: String(r.id),
    occurredAt: new Date(r.occurred_at),
    eventType: String(r.event_type),
    page: (r.page ?? null) as string | null,
    userAgent: (r.user_agent ?? null) as string | null,
    durationSeconds: (r.duration_seconds ?? null) as number | null,
    sessionId: (r.session_id ?? null) as string | null,
    data: (r.data ?? null) as any,
  }));
}

export async function refreshPreviewToken(clientId: string): Promise<PreviewClient> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    UPDATE preview_clients
    SET token = gen_random_uuid(), updated_at = now()
    WHERE client_id = ${clientId}
    RETURNING *
  `;
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Preview client not found');
  return rowToClient(row);
}

export async function deletePreviewClient(clientId: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM preview_clients WHERE client_id = ${clientId}`;
}

export function displayStatus(client: PreviewClient): 'active' | 'expired' | 'disabled' {
  if (client.status === 'disabled') return 'disabled';
  if (new Date(client.expiryDate) < new Date()) return 'expired';
  return 'active';
}
