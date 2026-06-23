import { sql } from '@zyntel/db';
import type { QuarterlyReport, CaseStudy } from '@zyntel/db/schema';

// --- Row mappers ---

function rowToQuarterlyReport(row: Record<string, any>): QuarterlyReport {
  return {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    quarter: String(row.quarter) as 'Q1' | 'Q2' | 'Q3' | 'Q4',
    year: Number(row.year),
    title: String(row.title),
    markdownContent: String(row.markdown_content),
    generatedAt: new Date(row.generated_at),
    generatedBy: row.generated_by != null ? String(row.generated_by) : null,
    pdfUrl: row.pdf_url != null ? String(row.pdf_url) : null,
    status: String(row.status) as 'draft' | 'final',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToCaseStudy(row: Record<string, any>): CaseStudy {
  return {
    id: String(row.id),
    serviceClientId: String(row.service_client_id),
    title: String(row.title),
    markdownContent: String(row.markdown_content),
    summary: row.summary != null ? String(row.summary) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    status: String(row.status) as 'draft' | 'published',
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// --- Quarterly Reports ---

export async function getQuarterlyReports(serviceClientId: string): Promise<QuarterlyReport[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT * FROM quarterly_reports
    WHERE service_client_id = ${serviceClientId}
    ORDER BY year DESC, quarter DESC
  `;
  return (rows as Record<string, any>[]).map(rowToQuarterlyReport);
}

export async function getQuarterlyReportById(id: string): Promise<QuarterlyReport | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM quarterly_reports WHERE id = ${id}`;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToQuarterlyReport(row) : null;
}

export async function createQuarterlyReport(data: {
  serviceClientId: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  title: string;
  markdownContent: string;
  generatedBy?: string | null;
  pdfUrl?: string | null;
  status?: 'draft' | 'final';
}): Promise<QuarterlyReport> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO quarterly_reports (
      service_client_id, quarter, year, title, markdown_content, generated_by, pdf_url, status
    ) VALUES (
      ${data.serviceClientId},
      ${data.quarter},
      ${data.year},
      ${data.title},
      ${data.markdownContent},
      ${data.generatedBy ?? null},
      ${data.pdfUrl ?? null},
      ${data.status ?? 'draft'}
    )
    RETURNING *
  `;
  return rowToQuarterlyReport(rows[0] as Record<string, any>);
}

export async function updateQuarterlyReport(
  id: string,
  data: Partial<{
    title: string;
    markdownContent: string;
    pdfUrl: string | null;
    status: 'draft' | 'final';
  }>
): Promise<QuarterlyReport> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(data.title); }
  if (data.markdownContent !== undefined) { updates.push(`markdown_content = $${values.length + 1}`); values.push(data.markdownContent); }
  if (data.pdfUrl !== undefined) { updates.push(`pdf_url = $${values.length + 1}`); values.push(data.pdfUrl); }
  if (data.status !== undefined) { updates.push(`status = $${values.length + 1}`); values.push(data.status); }

  if (!updates.length) {
    const existing = await getQuarterlyReportById(id);
    if (!existing) throw new Error('Report not found');
    return existing;
  }

  values.push(id);
  const query = `UPDATE quarterly_reports SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Report not found');
  return rowToQuarterlyReport(row);
}

export async function deleteQuarterlyReport(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM quarterly_reports WHERE id = ${id}`;
}

// --- Case Studies ---

export async function getCaseStudies(serviceClientId: string): Promise<CaseStudy[]> {
  if (!import.meta.env.DATABASE_URL) return [];
  const rows = await sql`
    SELECT * FROM case_studies
    WHERE service_client_id = ${serviceClientId}
    ORDER BY created_at DESC
  `;
  return (rows as Record<string, any>[]).map(rowToCaseStudy);
}

export async function getCaseStudyById(id: string): Promise<CaseStudy | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`SELECT * FROM case_studies WHERE id = ${id}`;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToCaseStudy(row) : null;
}

export async function createCaseStudy(data: {
  serviceClientId: string;
  title: string;
  markdownContent: string;
  summary?: string | null;
  tags?: string[];
  status?: 'draft' | 'published';
}): Promise<CaseStudy> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const rows = await sql`
    INSERT INTO case_studies (
      service_client_id, title, markdown_content, summary, tags, status
    ) VALUES (
      ${data.serviceClientId},
      ${data.title},
      ${data.markdownContent},
      ${data.summary ?? null},
      ${JSON.stringify(data.tags ?? [])},
      ${data.status ?? 'draft'}
    )
    RETURNING *
  `;
  return rowToCaseStudy(rows[0] as Record<string, any>);
}

export async function updateCaseStudy(
  id: string,
  data: Partial<{
    title: string;
    markdownContent: string;
    summary: string | null;
    tags: string[];
    status: 'draft' | 'published';
    publishedAt: Date | null;
  }>
): Promise<CaseStudy> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(data.title); }
  if (data.markdownContent !== undefined) { updates.push(`markdown_content = $${values.length + 1}`); values.push(data.markdownContent); }
  if (data.summary !== undefined) { updates.push(`summary = $${values.length + 1}`); values.push(data.summary); }
  if (data.tags !== undefined) { updates.push(`tags = $${values.length + 1}`); values.push(JSON.stringify(data.tags)); }
  if (data.status !== undefined) { updates.push(`status = $${values.length + 1}`); values.push(data.status); }
  if (data.publishedAt !== undefined) { updates.push(`published_at = $${values.length + 1}`); values.push(data.publishedAt); }

  if (!updates.length) {
    const existing = await getCaseStudyById(id);
    if (!existing) throw new Error('Case study not found');
    return existing;
  }

  values.push(id);
  const query = `UPDATE case_studies SET ${updates.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Case study not found');
  return rowToCaseStudy(row);
}

export async function deleteCaseStudy(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM case_studies WHERE id = ${id}`;
}

// --- AI Report Generation ---

/**
 * Build a structured Markdown quarterly report from maintenance data.
 * This is a deterministic formatter — it does not call any LLM.
 * Pass the result to an LLM or save it directly as a draft.
 */
export function buildQuarterlyReportMarkdown(opts: {
  clientName: string;
  productName: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  periodStart: string;
  periodEnd: string;
  incidents: Array<{ logDate: string; area: string; summary: string; actionTaken?: string; outcome?: string }>;
  preventive: Array<{ logDate: string; area: string; summary: string }>;
  support: Array<{ logDate: string; area: string; summary: string }>;
  closedWOs: Array<{ woNumber: string; title: string; coverage: string; estimatedCost: number | null; currency: string }>;
  openWOs: Array<{ woNumber: string; title: string; coverage: string; status: string }>;
  commitSummaries?: Array<{ repo: string; commitCount: number; highlights: string[] }>;
}): string {
  const {
    clientName, productName, quarter, year, periodStart, periodEnd,
    incidents, preventive, support, closedWOs, openWOs, commitSummaries,
  } = opts;

  const totalLogs = incidents.length + preventive.length + support.length;
  const covLabel: Record<string, string> = {
    contract_included: 'contract',
    paid_extra: 'paid extra',
    goodwill_free: 'goodwill',
  };

  const lines: string[] = [];

  lines.push(`# Quarterly Maintenance Report — ${quarter} ${year}`);
  lines.push('');
  lines.push(`**Client:** ${clientName}  `);
  lines.push(`**Product:** ${productName}  `);
  lines.push(`**Period:** ${periodStart} to ${periodEnd}  `);
  lines.push(`**Generated:** ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Availability summary
  lines.push('## 1. System Availability Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Total maintenance activities | ${totalLogs} |`);
  lines.push(`| Incidents | ${incidents.length} |`);
  lines.push(`| Preventive maintenance | ${preventive.length} |`);
  lines.push(`| Support requests | ${support.length} |`);
  lines.push('');

  // 2. Incidents
  lines.push('## 2. Incidents');
  lines.push('');
  if (!incidents.length) {
    lines.push('> No incidents recorded this quarter. System operated without disruption.');
  } else {
    lines.push(`| Date | Area | Summary | Resolution |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const inc of incidents) {
      const resolution = inc.outcome || inc.actionTaken || '—';
      lines.push(`| ${inc.logDate} | ${inc.area} | ${inc.summary.replace(/\|/g, '\\|')} | ${resolution.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
    }
  }
  lines.push('');

  // 3. Preventive maintenance
  lines.push('## 3. Preventive Maintenance');
  lines.push('');
  lines.push(`${preventive.length} preventive maintenance activit${preventive.length === 1 ? 'y was' : 'ies were'} performed this quarter.`);
  lines.push('');
  if (preventive.length) {
    for (const p of preventive) {
      lines.push(`- **${p.logDate}** — *${p.area}*: ${p.summary}`);
    }
    lines.push('');
  }

  // 4. Support activity
  lines.push('## 4. Support Activity');
  lines.push('');
  lines.push(`${support.length} support request${support.length === 1 ? '' : 's'} handled this quarter.`);
  lines.push('');
  if (support.length) {
    for (const s of support) {
      lines.push(`- **${s.logDate}** — *${s.area}*: ${s.summary}`);
    }
    lines.push('');
  }

  // 5. Work orders
  lines.push('## 5. Work Orders');
  lines.push('');
  lines.push(`**Closed:** ${closedWOs.length}  **Open:** ${openWOs.length}`);
  lines.push('');
  if (closedWOs.length) {
    lines.push('### Completed');
    for (const wo of closedWOs) {
      const costStr = wo.estimatedCost ? ` — Est. ${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}` : '';
      lines.push(`- **${wo.woNumber}** ${wo.title} *(${covLabel[wo.coverage] ?? wo.coverage})${costStr}*`);
    }
    lines.push('');
  }
  if (openWOs.length) {
    lines.push('### In Progress / Pending');
    for (const wo of openWOs) {
      lines.push(`- **${wo.woNumber}** ${wo.title} *(${wo.status})*`);
    }
    lines.push('');
  }

  // 6. Code changes (optional)
  if (commitSummaries && commitSummaries.length) {
    lines.push('## 6. Code Changes');
    lines.push('');
    for (const cs of commitSummaries) {
      lines.push(`### \`${cs.repo}\``);
      lines.push(`**${cs.commitCount} commit${cs.commitCount === 1 ? '' : 's'}** merged this quarter.`);
      if (cs.highlights.length) {
        lines.push('');
        for (const h of cs.highlights) {
          lines.push(`- ${h}`);
        }
      }
      lines.push('');
    }
  }

  // Overall status
  const sectionNum = commitSummaries && commitSummaries.length ? '7' : '6';
  lines.push(`## ${sectionNum}. Overall Status`);
  lines.push('');
  if (incidents.length === 0) {
    lines.push(
      `${productName} operated without incidents this quarter. ` +
      `${preventive.length} preventive maintenance activit${preventive.length === 1 ? 'y was' : 'ies were'} completed as planned. ` +
      `Overall system health remains strong.`
    );
  } else {
    lines.push(
      `${productName} experienced **${incidents.length} incident${incidents.length === 1 ? '' : 's'}** this quarter, all of which were addressed promptly. ` +
      `${preventive.length} preventive maintenance activit${preventive.length === 1 ? 'y was' : 'ies were'} also completed. ` +
      `We continue to monitor the system closely.`
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Prepared by Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net*');

  return lines.join('\n');
}
