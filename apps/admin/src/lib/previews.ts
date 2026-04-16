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
  };
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
