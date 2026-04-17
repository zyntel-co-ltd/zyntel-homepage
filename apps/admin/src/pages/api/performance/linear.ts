import type { APIRoute } from 'astro';

// Engineering label → point value (canonical from playbook)
const LABEL_POINTS: Record<string, number> = {
  'ui-fix': 1,
  'copy-change': 1,
  'bug-minor': 2,
  'chore': 2,
  'docs': 2,
  'feature-small': 3,
  'bug-major': 5,
  'feature-medium': 5,
  'performance': 5,
  'infra': 6,
  'refactor': 6,
  'migration': 7,
  'feature-large': 8,
  'security': 8,
};

// CTO (Engineering) level thresholds — 90-day rolling
const LEVELS = [
  { level: 0, name: 'Inactive', min: 0, max: 149 },
  { level: 1, name: 'Active', min: 150, max: 499 },
  { level: 2, name: 'Contributing', min: 500, max: 1499 },
  { level: 3, name: 'Core', min: 1500, max: Infinity },
];

function scoreLabels(labelNames: string[]): number {
  return labelNames.reduce((sum, name) => sum + (LABEL_POINTS[name] ?? 0), 0);
}

function getLevel(points: number) {
  return LEVELS.findLast(l => points >= l.min) ?? LEVELS[0];
}

const LINEAR_API = 'https://api.linear.app/graphql';

// Fetch viewer's done issues completed in the last 90 days
const ISSUES_QUERY = `
  query CompletedIssues($after: String) {
    viewer {
      id
      name
      email
      assignedIssues(
        filter: {
          state: { type: { eq: "completed" } }
          completedAt: { gt: $ninetyDaysAgo }
        }
        orderBy: completedAt
        first: 100
        after: $after
      ) {
        nodes {
          id
          identifier
          title
          completedAt
          createdAt
          labels {
            nodes {
              name
            }
          }
          estimate
          url
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.LINEAR_API_TOKEN;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LINEAR_API_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    let allIssues: any[] = [];
    let cursor: string | null = null;
    let hasNext = true;
    let viewerInfo: { name: string; email: string } | null = null;

    while (hasNext) {
      const body = {
        query: ISSUES_QUERY,
        variables: { ninetyDaysAgo, after: cursor },
      };

      const res = await fetch(LINEAR_API, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        return new Response(JSON.stringify({ error: `Linear API error: ${res.status}`, detail: text }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const json = await res.json();
      if (json.errors) {
        return new Response(JSON.stringify({ error: 'Linear GraphQL error', detail: json.errors }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const viewer = json.data?.viewer;
      if (!viewerInfo) viewerInfo = { name: viewer.name, email: viewer.email };

      const assigned = viewer.assignedIssues;
      allIssues = allIssues.concat(assigned.nodes);
      hasNext = assigned.pageInfo.hasNextPage;
      cursor = assigned.pageInfo.endCursor ?? null;
    }

    // Score each issue
    const scoredIssues = allIssues.map((issue: any) => {
      const labelNames: string[] = issue.labels.nodes.map((l: any) => l.name);
      const points = scoreLabels(labelNames);
      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        completedAt: issue.completedAt,
        labels: labelNames,
        points,
        url: issue.url,
      };
    }).filter(i => i.points > 0); // only count scored issues

    const totalPoints = scoredIssues.reduce((sum, i) => sum + i.points, 0);
    const currentLevel = getLevel(totalPoints);
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
    const pointsToNext = nextLevel ? Math.max(0, nextLevel.min - totalPoints) : 0;

    return new Response(JSON.stringify({
      viewer: viewerInfo,
      totalPoints,
      issueCount: scoredIssues.length,
      level: currentLevel,
      nextLevel: nextLevel ?? null,
      pointsToNext,
      windowDays: 90,
      issues: scoredIssues.sort((a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
