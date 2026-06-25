export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/.?\s]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

export async function fetchCommitsForPeriod(
  repoUrl: string,
  since: string,
  until: string,
  token?: string,
): Promise<GitHubCommit[]> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return [];
  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'zyntel-admin/1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const apiUrl =
    `https://api.github.com/repos/${owner}/${repo}/commits` +
    `?since=${since}T00:00:00Z&until=${until}T23:59:59Z&per_page=100`;

  try {
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) return [];
    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((c) => ({
      sha: (c.sha ?? '').slice(0, 7),
      message: (c.commit?.message ?? '').split('\n')[0].trim(),
      author: c.commit?.author?.name ?? c.author?.login ?? '',
      date: (c.commit?.author?.date ?? '').slice(0, 10),
      url: c.html_url ?? '',
    }));
  } catch {
    return [];
  }
}

export async function fetchRepoStats(
  repoUrl: string,
  token?: string,
): Promise<{ defaultBranch: string; description: string } | null> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return null;
  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'zyntel-admin/1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) return null;
    const d = await res.json();
    return { defaultBranch: d.default_branch ?? 'main', description: d.description ?? '' };
  } catch {
    return null;
  }
}

export async function fetchSentryIssues(
  sentryUrl: string,
  since: string,
  until: string,
  authToken: string,
): Promise<Array<{ title: string; count: number; firstSeen: string; lastSeen: string }>> {
  // Parse org + project slug from a Sentry project URL
  // e.g. https://zyntel.sentry.io/projects/my-project/
  // or   https://sentry.io/organizations/zyntel/projects/my-project/
  let orgSlug = '';
  let projectSlug = '';
  const m1 = sentryUrl.match(/https?:\/\/([^.]+)\.sentry\.io\/projects\/([^/?]+)/);
  const m2 = sentryUrl.match(/sentry\.io\/organizations\/([^/]+)\/projects\/([^/?]+)/);
  if (m1) { orgSlug = m1[1]; projectSlug = m1[2]; }
  else if (m2) { orgSlug = m2[1]; projectSlug = m2[2]; }
  if (!orgSlug || !projectSlug) return [];

  const apiBase = `https://sentry.io/api/0`;
  try {
    const res = await fetch(
      `${apiBase}/projects/${orgSlug}/${projectSlug}/issues/?query=&start=${since}T00:00:00&end=${until}T23:59:59&limit=25`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    if (!res.ok) return [];
    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((i) => ({
      title: i.title ?? '',
      count: Number(i.count ?? 0),
      firstSeen: (i.firstSeen ?? '').slice(0, 10),
      lastSeen: (i.lastSeen ?? '').slice(0, 10),
    }));
  } catch {
    return [];
  }
}
