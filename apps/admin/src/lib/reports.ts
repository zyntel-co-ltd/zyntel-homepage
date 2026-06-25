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
    dataCursorDate: row.data_cursor_date != null ? String(row.data_cursor_date).slice(0, 10) : null,
    lastRefreshedAt: row.last_refreshed_at ? new Date(row.last_refreshed_at) : null,
    sourceData: row.source_data != null
      ? (typeof row.source_data === 'string' ? JSON.parse(row.source_data) : row.source_data)
      : null,
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

export async function getQuarterlyReportByPeriod(
  serviceClientId: string,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  year: number,
): Promise<QuarterlyReport | null> {
  if (!import.meta.env.DATABASE_URL) return null;
  const rows = await sql`
    SELECT * FROM quarterly_reports
    WHERE service_client_id = ${serviceClientId}
      AND quarter = ${quarter}
      AND year = ${year}
  `;
  const row = rows[0] as Record<string, any> | undefined;
  return row ? rowToQuarterlyReport(row) : null;
}

/**
 * Upserts a quarterly report — creates on first call, refreshes on subsequent calls.
 * Throws 'REPORT_FINALIZED' if the existing report is already marked final.
 */
export async function upsertQuarterlyReport(data: {
  serviceClientId: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  title: string;
  markdownContent: string;
  dataCursorDate: string;
  sourceData: ReportInput;
  generatedBy?: string | null;
  status?: 'draft' | 'final';
}): Promise<{ report: QuarterlyReport; wasUpdated: boolean }> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');

  const existing = await sql`
    SELECT id, status FROM quarterly_reports
    WHERE service_client_id = ${data.serviceClientId}
      AND quarter = ${data.quarter}
      AND year = ${data.year}
  `;
  if (existing.length > 0 && (existing[0] as any).status === 'final') {
    throw new Error('REPORT_FINALIZED');
  }
  const wasUpdated = existing.length > 0;
  const sourceDataJson = JSON.stringify(data.sourceData);

  const rows = await sql`
    INSERT INTO quarterly_reports (
      service_client_id, quarter, year, title, markdown_content,
      data_cursor_date, last_refreshed_at, source_data, generated_by, status
    ) VALUES (
      ${data.serviceClientId},
      ${data.quarter},
      ${data.year},
      ${data.title},
      ${data.markdownContent},
      ${data.dataCursorDate},
      now(),
      ${sourceDataJson},
      ${data.generatedBy ?? null},
      ${data.status ?? 'draft'}
    )
    ON CONFLICT (service_client_id, quarter, year) DO UPDATE SET
      title             = EXCLUDED.title,
      markdown_content  = EXCLUDED.markdown_content,
      data_cursor_date  = EXCLUDED.data_cursor_date,
      last_refreshed_at = now(),
      source_data       = EXCLUDED.source_data,
      updated_at        = now()
    RETURNING *
  `;
  return { report: rowToQuarterlyReport(rows[0] as Record<string, any>), wasUpdated };
}

export async function updateQuarterlyReport(
  id: string,
  data: Partial<{
    title: string;
    markdownContent: string;
    pdfUrl: string | null;
    status: 'draft' | 'final';
  }>,
): Promise<QuarterlyReport> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');

  if (!Object.keys(data).length) {
    const existing = await getQuarterlyReportById(id);
    if (!existing) throw new Error('Report not found');
    return existing;
  }

  const setClauses: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined)           { setClauses.push(`title = $${values.length + 1}`);            values.push(data.title); }
  if (data.markdownContent !== undefined) { setClauses.push(`markdown_content = $${values.length + 1}`); values.push(data.markdownContent); }
  if (data.pdfUrl !== undefined)          { setClauses.push(`pdf_url = $${values.length + 1}`);          values.push(data.pdfUrl); }
  if (data.status !== undefined)          { setClauses.push(`status = $${values.length + 1}`);           values.push(data.status); }

  values.push(id);
  const query = `UPDATE quarterly_reports SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`;
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
    INSERT INTO case_studies (service_client_id, title, markdown_content, summary, tags, status)
    VALUES (
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
  }>,
): Promise<CaseStudy> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');

  if (!Object.keys(data).length) {
    const existing = await getCaseStudyById(id);
    if (!existing) throw new Error('Case study not found');
    return existing;
  }

  const setClauses: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined)          { setClauses.push(`title = $${values.length + 1}`);             values.push(data.title); }
  if (data.markdownContent !== undefined){ setClauses.push(`markdown_content = $${values.length + 1}`);  values.push(data.markdownContent); }
  if (data.summary !== undefined)        { setClauses.push(`summary = $${values.length + 1}`);           values.push(data.summary); }
  if (data.tags !== undefined)           { setClauses.push(`tags = $${values.length + 1}`);              values.push(JSON.stringify(data.tags)); }
  if (data.status !== undefined)         { setClauses.push(`status = $${values.length + 1}`);            values.push(data.status); }
  if (data.publishedAt !== undefined)    { setClauses.push(`published_at = $${values.length + 1}`);      values.push(data.publishedAt); }

  values.push(id);
  const query = `UPDATE case_studies SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`;
  const rows = await sql(query, values);
  const row = rows[0] as Record<string, any> | undefined;
  if (!row) throw new Error('Case study not found');
  return rowToCaseStudy(row);
}

export async function deleteCaseStudy(id: string): Promise<void> {
  if (!import.meta.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  await sql`DELETE FROM case_studies WHERE id = ${id}`;
}

// --- Report input types ---

export interface ReportInput {
  clientName: string;
  productName: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
  periodStart: string;
  periodEnd: string;
  dataCursorDate: string;
  isCurrentQuarter: boolean;
  incidents: Array<{ logDate: string; area: string; summary: string; actionTaken?: string; outcome?: string }>;
  preventive: Array<{ logDate: string; area: string; summary: string }>;
  support: Array<{ logDate: string; area: string; summary: string }>;
  closedWOs: Array<{ woNumber: string; title: string; coverage: string; estimatedCost: number | null; currency: string }>;
  openWOs: Array<{ woNumber: string; title: string; coverage: string; status: string }>;
  commits?: Array<{ sha: string; message: string; author: string; date: string }>;
  sentryIssues?: Array<{ title: string; count: number; firstSeen: string; lastSeen: string }>;
  roiSnapshots?: Array<{ metricKey: string; metricValue: number; snapshotDate: string }>;
  commitSummaries?: Array<{ repo: string; commitCount: number; highlights: string[] }>;
}

// --- AI report generator ---

export async function buildQuarterlyReportMarkdownAI(
  opts: ReportInput,
  apiKey: string,
): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const covLabel: Record<string, string> = {
    contract_included: 'contract-included',
    paid_extra: 'paid extra',
    goodwill_free: 'goodwill/free',
  };

  const contextBlocks: string[] = [];

  contextBlocks.push(
    `CLIENT: ${opts.clientName}\nPRODUCT: ${opts.productName}\nPERIOD: ${opts.quarter} ${opts.year} (${opts.periodStart} to ${opts.dataCursorDate})${opts.isCurrentQuarter ? '\nNOTE: This quarter is still in progress — report covers activity to date.' : ''}`,
  );

  if (opts.commits && opts.commits.length) {
    contextBlocks.push(
      `## GitHub Commits (${opts.commits.length} total)\n` +
      opts.commits.map((c) => `- ${c.date} [${c.sha}] ${c.message} (${c.author})`).join('\n'),
    );
  }

  if (opts.incidents.length) {
    contextBlocks.push(
      `## Incidents (${opts.incidents.length})\n` +
      opts.incidents.map((i) =>
        `- ${i.logDate} | ${i.area} | ${i.summary}${i.actionTaken ? ' | Action: ' + i.actionTaken : ''}${i.outcome ? ' | Outcome: ' + i.outcome : ''}`,
      ).join('\n'),
    );
  } else {
    contextBlocks.push('## Incidents: None — system operated without incidents this period.');
  }

  if (opts.preventive.length) {
    contextBlocks.push(
      `## Preventive Maintenance (${opts.preventive.length})\n` +
      opts.preventive.map((p) => `- ${p.logDate} | ${p.area} | ${p.summary}`).join('\n'),
    );
  }

  if (opts.support.length) {
    contextBlocks.push(
      `## Support Requests (${opts.support.length})\n` +
      opts.support.map((s) => `- ${s.logDate} | ${s.area} | ${s.summary}`).join('\n'),
    );
  }

  if (opts.closedWOs.length || opts.openWOs.length) {
    const closedLines = opts.closedWOs.map(
      (w) => `- ${w.woNumber}: ${w.title} [${covLabel[w.coverage] ?? w.coverage}]${w.estimatedCost ? ' — ' + w.currency + ' ' + w.estimatedCost.toLocaleString() : ''}`,
    );
    const openLines = opts.openWOs.map((w) => `- ${w.woNumber}: ${w.title} [${w.status}]`);
    contextBlocks.push(
      `## Work Orders\nClosed (${opts.closedWOs.length}):\n${closedLines.join('\n') || '(none)'}\nOpen/In-progress (${opts.openWOs.length}):\n${openLines.join('\n') || '(none)'}`,
    );
  }

  if (opts.sentryIssues && opts.sentryIssues.length) {
    contextBlocks.push(
      `## Sentry Error Tracking (${opts.sentryIssues.length} issues this period)\n` +
      opts.sentryIssues.map((i) => `- "${i.title}" — ${i.count} occurrences (first: ${i.firstSeen}, last: ${i.lastSeen})`).join('\n'),
    );
  }

  if (opts.roiSnapshots && opts.roiSnapshots.length) {
    const grouped: Record<string, Array<{ value: number; date: string }>> = {};
    for (const s of opts.roiSnapshots) {
      if (!grouped[s.metricKey]) grouped[s.metricKey] = [];
      grouped[s.metricKey].push({ value: s.metricValue, date: s.snapshotDate });
    }
    const metricLines = Object.entries(grouped).map(([k, vals]) => {
      const sorted = [...vals].sort((a, b) => a.date.localeCompare(b.date));
      const earliest = sorted[0];
      const latest = sorted[sorted.length - 1];
      if (sorted.length > 1 && earliest.value !== latest.value) {
        const pct = ((latest.value - earliest.value) / Math.abs(earliest.value) * 100).toFixed(1);
        return `${k}: ${latest.value.toLocaleString()} (was ${earliest.value.toLocaleString()} on ${earliest.date}, ${Number(pct) >= 0 ? '+' : ''}${pct}%)`;
      }
      return `${k}: ${latest.value.toLocaleString()} (as of ${latest.date})`;
    });
    contextBlocks.push(`## Key Metrics / ROI Snapshots\n${metricLines.join('\n')}`);
  }

  const dataContext = contextBlocks.join('\n\n');

  const systemPrompt = `You are a senior technical writer at Zyntel Co. Limited, a Ugandan software development and maintenance company. You write quarterly activity and maintenance reports for clients about their custom software products.

Report principles:
- Professional, confident, and client-facing — written to demonstrate value and build trust
- Comprehensive and detailed — this is a full internal record, not a summary
- Group git commits into meaningful feature/fix themes (Phase 1, Phase 2, etc.) — don't list raw commit SHAs in the narrative, but DO include a raw commit table at the end
- For incidents: describe what happened, what was done, and the outcome with full context
- For preventive maintenance: frame as proactive stewardship
- For support: show responsiveness and resolution quality
- If ROI metrics show growth, highlight it clearly in the executive summary
- Tone: honest and direct. If it was a quiet period, say so. If there were incidents, own them and show resolution.
- Always end with "Prepared by Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net"
- Use markdown: h1 for title, h2 for sections, h3 for subsections, tables where they add clarity, --- dividers between major sections
- No emojis`;

  const nextQ = { Q1: 'Q2', Q2: 'Q3', Q3: 'Q4', Q4: 'Q1' }[opts.quarter];
  const inProgressNote = opts.isCurrentQuarter
    ? `\n\nNOTE: This quarter is still in progress. Write the report to cover activity to date (through ${opts.dataCursorDate}), and phrase the outlook section accordingly.`
    : '';

  const userPrompt = `Write a comprehensive ${opts.quarter} ${opts.year} quarterly activity and maintenance report for ${opts.clientName} — ${opts.productName}.${inProgressNote}

${dataContext}

The report must include ALL of these sections:

1. **Executive Summary** (3–5 sentences — key achievements, system health, and standout metrics)
2. **System Health Overview** (uptime indicators, incident count, what this means for the client)
3. **Development Activity** (if commits exist: group by theme into phases with dates, explain what was built and why it matters to the business — not a raw commit list in this section)
4. **Feature & Activity Count Summary** (a markdown table: category | count — e.g. Features shipped, Bug fixes, Preventive checks, Support requests, Incidents, Work orders closed, Commits)
5. **Maintenance Activities**
   - 5a. Incidents (table with date, area, summary, resolution — or "None" callout)
   - 5b. Preventive Maintenance (bulleted list with dates)
   - 5c. Support Activity (bulleted list with dates)
6. **Work Orders** (closed with cost if known, open with status)
7. **Error Tracking** (if Sentry data provided — issue count, most frequent errors, trend)
8. **Key Metrics** (if ROI snapshots provided — table showing metric, value, change)
9. **Commit Log** (markdown table: Date | SHA | Message — only if commits exist)
10. **Overall Assessment & ${nextQ} Outlook** (2–3 sentences on system health rating and what's coming next)

Generate the full markdown report now.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });
    const content = message.content[0];
    if (content.type === 'text') return content.text;
  } catch (err) {
    console.error('[buildQuarterlyReportMarkdownAI] Claude call failed, falling back:', err);
  }

  return buildQuarterlyReportMarkdown(opts);
}

// --- Deterministic formatter (fallback) ---

export function buildQuarterlyReportMarkdown(opts: ReportInput): string {
  const {
    clientName, productName, quarter, year, periodStart, dataCursorDate,
    incidents, preventive, support, closedWOs, openWOs, commits,
    sentryIssues, roiSnapshots, isCurrentQuarter,
  } = opts;

  const totalLogs = incidents.length + preventive.length + support.length;
  const covLabel: Record<string, string> = {
    contract_included: 'contract',
    paid_extra: 'paid extra',
    goodwill_free: 'goodwill',
  };
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines: string[] = [];

  lines.push(`# Quarterly Activity Report — ${quarter} ${year}${isCurrentQuarter ? ' (In Progress)' : ''}`);
  lines.push('');
  lines.push(`**Client:** ${clientName}  `);
  lines.push(`**Product:** ${productName}  `);
  lines.push(`**Period:** ${periodStart} to ${dataCursorDate}${isCurrentQuarter ? ' *(quarter in progress)*' : ''}  `);
  lines.push(`**Generated:** ${today}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Executive summary
  lines.push('## 1. Executive Summary');
  lines.push('');
  const incidentNote = incidents.length === 0
    ? `${productName} operated without incidents this period.`
    : `${productName} experienced ${incidents.length} incident${incidents.length === 1 ? '' : 's'} this period, all of which were resolved.`;
  lines.push(
    `${incidentNote} ${preventive.length} preventive maintenance activit${preventive.length === 1 ? 'y was' : 'ies were'} completed. ` +
    `${support.length} support request${support.length === 1 ? '' : 's'} ${support.length === 1 ? 'was' : 'were'} handled. ` +
    (commits && commits.length ? `${commits.length} code commit${commits.length === 1 ? '' : 's'} ${commits.length === 1 ? 'was' : 'were'} delivered. ` : '') +
    `Overall system health remains ${incidents.length === 0 ? 'strong' : 'stable'}.`,
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // 2. Feature & activity count summary
  lines.push('## 2. Activity Count Summary');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('| --- | --- |');
  lines.push(`| Total maintenance activities | ${totalLogs} |`);
  lines.push(`| Incidents | ${incidents.length} |`);
  lines.push(`| Preventive maintenance | ${preventive.length} |`);
  lines.push(`| Support requests | ${support.length} |`);
  lines.push(`| Work orders closed | ${closedWOs.length} |`);
  lines.push(`| Work orders open | ${openWOs.length} |`);
  if (commits && commits.length) lines.push(`| Commits delivered | ${commits.length} |`);
  if (sentryIssues && sentryIssues.length) lines.push(`| Sentry issues tracked | ${sentryIssues.length} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 3. Incidents
  lines.push('## 3. Incidents');
  lines.push('');
  if (!incidents.length) {
    lines.push('> No incidents recorded this period. System operated without disruption.');
  } else {
    lines.push('| Date | Area | Summary | Resolution |');
    lines.push('| --- | --- | --- | --- |');
    for (const inc of incidents) {
      const res = inc.outcome || inc.actionTaken || '—';
      lines.push(`| ${inc.logDate} | ${inc.area} | ${inc.summary.replace(/\|/g, '\\|')} | ${res.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // 4. Preventive maintenance
  lines.push('## 4. Preventive Maintenance');
  lines.push('');
  lines.push(`${preventive.length} preventive maintenance activit${preventive.length === 1 ? 'y was' : 'ies were'} performed this period.`);
  if (preventive.length) {
    lines.push('');
    for (const p of preventive) lines.push(`- **${p.logDate}** — *${p.area}*: ${p.summary}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // 5. Support activity
  lines.push('## 5. Support Activity');
  lines.push('');
  lines.push(`${support.length} support request${support.length === 1 ? '' : 's'} handled this period.`);
  if (support.length) {
    lines.push('');
    for (const s of support) lines.push(`- **${s.logDate}** — *${s.area}*: ${s.summary}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // 6. Work orders
  lines.push('## 6. Work Orders');
  lines.push('');
  lines.push(`**Closed:** ${closedWOs.length}  **Open/In-Progress:** ${openWOs.length}`);
  if (closedWOs.length) {
    lines.push('');
    lines.push('### Completed');
    for (const wo of closedWOs) {
      const costStr = wo.estimatedCost ? ` — Est. ${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}` : '';
      lines.push(`- **${wo.woNumber}** ${wo.title} *(${covLabel[wo.coverage] ?? wo.coverage})${costStr}*`);
    }
  }
  if (openWOs.length) {
    lines.push('');
    lines.push('### In Progress / Pending');
    for (const wo of openWOs) lines.push(`- **${wo.woNumber}** ${wo.title} *(${wo.status})*`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // 7. Development activity
  if (commits && commits.length) {
    lines.push('## 7. Development Activity');
    lines.push('');
    lines.push(`**${commits.length} commit${commits.length === 1 ? '' : 's'}** delivered this period.`);
    lines.push('');
    lines.push('### Commit Log');
    lines.push('');
    lines.push('| Date | SHA | Message |');
    lines.push('| --- | --- | --- |');
    for (const c of commits) {
      lines.push(`| ${c.date} | \`${c.sha}\` | ${c.message.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // 8. Error tracking
  if (sentryIssues && sentryIssues.length) {
    const sectionNum = commits && commits.length ? '8' : '7';
    lines.push(`## ${sectionNum}. Error Tracking (Sentry)`);
    lines.push('');
    lines.push(`${sentryIssues.length} error${sentryIssues.length === 1 ? '' : 's'} tracked this period.`);
    lines.push('');
    lines.push('| Issue | Occurrences | First Seen | Last Seen |');
    lines.push('| --- | --- | --- | --- |');
    for (const issue of sentryIssues) {
      lines.push(`| ${issue.title.replace(/\|/g, '\\|')} | ${issue.count} | ${issue.firstSeen} | ${issue.lastSeen} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // 9. Key metrics / ROI
  if (roiSnapshots && roiSnapshots.length) {
    const sNum = [commits?.length, sentryIssues?.length].filter(Boolean).length +
      (commits && commits.length ? 8 : 7);
    lines.push(`## ${sNum}. Key Metrics`);
    lines.push('');
    const grouped: Record<string, Array<{ value: number; date: string }>> = {};
    for (const s of roiSnapshots) {
      if (!grouped[s.metricKey]) grouped[s.metricKey] = [];
      grouped[s.metricKey].push({ value: s.metricValue, date: s.snapshotDate });
    }
    lines.push('| Metric | Latest Value | As Of |');
    lines.push('| --- | --- | --- |');
    for (const [key, vals] of Object.entries(grouped)) {
      const sorted = [...vals].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      lines.push(`| ${key} | ${latest.value.toLocaleString()} | ${latest.date} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // 10. Overall assessment
  lines.push('## Overall Assessment');
  lines.push('');
  if (incidents.length === 0) {
    lines.push(
      `${productName} had a stable period with zero incidents. ` +
      `${preventive.length} preventive checks were completed as planned. ` +
      `System health is strong.`,
    );
  } else {
    lines.push(
      `${productName} experienced **${incidents.length} incident${incidents.length === 1 ? '' : 's'}** this period, all resolved promptly. ` +
      `${preventive.length} preventive maintenance activit${preventive.length === 1 ? 'y was' : 'ies were'} also completed. ` +
      `We continue to monitor the system closely.`,
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Prepared by Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net*');

  return lines.join('\n');
}

// --- Client-facing summary (used for PDF) ---

export function buildClientSummaryMarkdown(opts: ReportInput): string {
  const { clientName, productName, quarter, year, periodStart, dataCursorDate,
    incidents, preventive, support, closedWOs, openWOs, commits, roiSnapshots, isCurrentQuarter } = opts;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const covLabel: Record<string, string> = {
    contract_included: 'Contract', paid_extra: 'Billable', goodwill_free: 'Complimentary',
  };
  const lines: string[] = [];

  lines.push(`# ${quarter} ${year} Activity Summary`);
  lines.push('');
  lines.push(`**Prepared for:** ${clientName}  `);
  lines.push(`**Product:** ${productName}  `);
  lines.push(`**Period:** ${periodStart} — ${dataCursorDate}${isCurrentQuarter ? ' *(in progress)*' : ''}  `);
  lines.push(`**Prepared by:** Zyntel Co. Limited  `);
  lines.push(`**Date:** ${today}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // System health snapshot
  lines.push('## System Health');
  lines.push('');
  lines.push('| | Count |');
  lines.push('| --- | --- |');
  lines.push(`| Incidents | ${incidents.length} |`);
  lines.push(`| Preventive maintenance | ${preventive.length} |`);
  lines.push(`| Support requests handled | ${support.length} |`);
  lines.push(`| Work orders completed | ${closedWOs.length} |`);
  if (commits && commits.length) lines.push(`| Code commits delivered | ${commits.length} |`);
  lines.push('');

  // Key metrics
  if (roiSnapshots && roiSnapshots.length) {
    const grouped: Record<string, Array<{ value: number; date: string }>> = {};
    for (const s of roiSnapshots) {
      if (!grouped[s.metricKey]) grouped[s.metricKey] = [];
      grouped[s.metricKey].push({ value: s.metricValue, date: s.snapshotDate });
    }
    lines.push('## Key Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('| --- | --- |');
    for (const [key, vals] of Object.entries(grouped)) {
      const sorted = [...vals].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      lines.push(`| ${key} | ${latest.value.toLocaleString()} |`);
    }
    lines.push('');
  }

  // Work orders completed
  if (closedWOs.length) {
    lines.push('## Completed Work');
    lines.push('');
    for (const wo of closedWOs) {
      const cov = covLabel[wo.coverage] ?? wo.coverage;
      const costStr = wo.estimatedCost ? ` · ${wo.currency} ${Number(wo.estimatedCost).toLocaleString()}` : '';
      lines.push(`- **${wo.woNumber}** — ${wo.title} *(${cov}${costStr})*`);
    }
    lines.push('');
  }

  // Incidents summary
  if (incidents.length) {
    lines.push('## Incidents');
    lines.push('');
    for (const inc of incidents) {
      const res = inc.outcome || inc.actionTaken || 'Resolved';
      lines.push(`- **${inc.logDate}** | ${inc.area}: ${inc.summary} → *${res}*`);
    }
    lines.push('');
  } else {
    lines.push('## Incidents');
    lines.push('');
    lines.push('> No incidents this period. System operated without disruption.');
    lines.push('');
  }

  // Development summary (no raw SHAs)
  if (commits && commits.length) {
    lines.push('## Development Activity');
    lines.push('');
    lines.push(`**${commits.length} update${commits.length === 1 ? '' : 's'}** delivered to ${productName} this period.`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Zyntel Co. Limited · P.O Box 860954 · zyntel.net · info@zyntel.net · 0786421061*');

  return lines.join('\n');
}
