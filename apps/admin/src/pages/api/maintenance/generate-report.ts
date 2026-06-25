import type { APIRoute } from 'astro';
import { getServiceClientById, getMaintenanceLogs, getWorkOrders } from '../../../lib/maintenance.ts';
import {
  buildQuarterlyReportMarkdown,
  buildQuarterlyReportMarkdownAI,
  createQuarterlyReport,
} from '../../../lib/reports.ts';
import { fetchCommitsForPeriod, fetchSentryIssues } from '../../../lib/github.ts';
import { getSnapshots } from '../../../lib/roi.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { serviceClientId, quarter, year } = body as {
      serviceClientId?: string;
      quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
      year?: number;
    };

    if (!serviceClientId || !quarter || !year) {
      return new Response(JSON.stringify({ error: 'serviceClientId, quarter, and year are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return new Response(JSON.stringify({ error: 'quarter must be Q1–Q4' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = await getServiceClientById(serviceClientId);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Service client not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const qMap: Record<string, [number, number]> = {
      Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
    };
    const [qStartMonth, qEndMonth] = qMap[quarter];
    const qStart = new Date(year, qStartMonth, 1);
    const qEnd = new Date(year, qEndMonth + 1, 0);
    const periodStart = qStart.toISOString().slice(0, 10);
    const periodEnd = qEnd.toISOString().slice(0, 10);

    // ── Fetch all data in parallel ───────────────────────────────────────────
    const githubToken = import.meta.env.GITHUB_TOKEN as string | undefined;
    const sentryToken = import.meta.env.SENTRY_AUTH_TOKEN as string | undefined;
    const anthropicKey = import.meta.env.ANTHROPIC_API_KEY as string | undefined;

    const [allLogs, allWOs, commits, roiSnapshots, sentryIssues] = await Promise.all([
      getMaintenanceLogs(serviceClientId, { dateFrom: periodStart, dateTo: periodEnd }),
      getWorkOrders(serviceClientId),
      client.repoUrl
        ? fetchCommitsForPeriod(client.repoUrl, periodStart, periodEnd, githubToken)
        : Promise.resolve([]),
      getSnapshots(serviceClientId, periodStart, periodEnd),
      client.sentryUrl && sentryToken
        ? fetchSentryIssues(client.sentryUrl, periodStart, periodEnd, sentryToken)
        : Promise.resolve([]),
    ]);

    const incidents = allLogs.filter((l) => l.type === 'incident');
    const preventive = allLogs.filter((l) => l.type === 'preventive');
    const support = allLogs.filter((l) => l.type === 'support');
    const closedWOs = allWOs.filter((w) => ['completed', 'invoiced'].includes(w.status));
    const openWOs = allWOs.filter((w) => !['completed', 'invoiced'].includes(w.status));

    const reportInput = {
      clientName: client.name,
      productName: client.productName,
      quarter,
      year,
      periodStart,
      periodEnd,
      incidents: incidents.map((i) => ({
        logDate: i.logDate,
        area: i.area,
        summary: i.summary,
        actionTaken: i.actionTaken || undefined,
        outcome: i.outcome || undefined,
      })),
      preventive: preventive.map((p) => ({ logDate: p.logDate, area: p.area, summary: p.summary })),
      support: support.map((s) => ({ logDate: s.logDate, area: s.area, summary: s.summary })),
      closedWOs: closedWOs.map((w) => ({
        woNumber: w.woNumber,
        title: w.title,
        coverage: w.coverage,
        estimatedCost: w.estimatedCost,
        currency: w.currency,
      })),
      openWOs: openWOs.map((w) => ({
        woNumber: w.woNumber,
        title: w.title,
        coverage: w.coverage,
        status: w.status,
      })),
      commits: commits.length ? commits : undefined,
      roiSnapshots: roiSnapshots.length
        ? roiSnapshots.map((s) => ({
            metricKey: s.metricKey,
            metricValue: s.metricValue,
            snapshotDate: s.snapshotDate,
          }))
        : undefined,
      sentryIssues: sentryIssues.length ? sentryIssues : undefined,
    };

    // ── Generate markdown ────────────────────────────────────────────────────
    let markdownContent: string;
    if (anthropicKey) {
      markdownContent = await buildQuarterlyReportMarkdownAI(reportInput, anthropicKey);
    } else {
      markdownContent = buildQuarterlyReportMarkdown(reportInput);
    }

    const title = `${client.name} — ${client.productName} Maintenance Report ${quarter} ${year}`;
    const report = await createQuarterlyReport({
      serviceClientId,
      quarter,
      year,
      title,
      markdownContent,
      status: 'draft',
    });

    return new Response(JSON.stringify({ ...report, _sources: {
      commits: commits.length,
      roiSnapshots: roiSnapshots.length,
      sentryIssues: sentryIssues.length,
      aiGenerated: !!anthropicKey,
    }}), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[generate-report]', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
