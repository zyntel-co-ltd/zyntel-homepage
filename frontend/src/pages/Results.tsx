// Patient-facing results progress page - public, no auth.
// For patients to view progress; reception can enter lab number to see progress.
// Accessible at /results - link shown as QR in Admin panel for patients to scan.
// When on Cloudflare Pages, set VITE_API_BASE_URL to your tunnel/API URL.
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const resultsApiUrl = (labNo: string) => {
  const enc = encodeURIComponent(labNo);
  return base ? (base.endsWith('/api') ? `${base}/results/${enc}` : `${base}/api/results/${enc}`) : `/api/results/${enc}`;
};

interface TestStatus {
  test_name: string;
  lab_section: string | null;
  status: 'pending' | 'received' | 'resulted' | 'cancelled';
  time_in: string | null;
  time_out: string | null;
}

interface ResultsData {
  found: boolean;
  tests: TestStatus[];
  summary: {
    total: number;
    pending: number;
    received: number;
    resulted: number;
    cancelled: number;
  };
  message?: string;
}

const formatTime = (s: string | null): string => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
  } catch {
    return s;
  }
};

const statusBadgeClass = (status: TestStatus['status']): string => {
  switch (status) {
    case 'resulted': return 'results-status-resulted';
    case 'received': return 'results-status-received';
    case 'cancelled': return 'results-status-cancelled';
    default: return 'results-status-pending';
  }
};

const Results: React.FC = () => {
  const { labNo: labNoParam } = useParams<{ labNo?: string }>();
  const [labNo, setLabNo] = useState(labNoParam || '');
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (labNoParam && labNoParam.trim()) setLabNo(labNoParam.trim());
  }, [labNoParam]);

  const MIN_LAB_NO_LENGTH = 4;

  const fetchResults = useCallback(async () => {
    const trimmed = labNo.trim();
    if (!trimmed) {
      setError('Please enter your full lab number from your receipt.');
      return;
    }
    if (trimmed.length < MIN_LAB_NO_LENGTH) {
      setError('Please enter your complete lab number. Partial numbers cannot be searched.');
      return;
    }
    if (/\s/.test(trimmed)) {
      setError('Lab number should not contain spaces. Please enter the number exactly as shown on your receipt.');
      return;
    }
    setError(null);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(resultsApiUrl(trimmed));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = (json as { error?: string }).error || 'Failed to fetch results';
        throw new Error(errMsg);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [labNo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = labNo.trim();
    if (!trimmed) {
      setError('Please enter your full lab number from your receipt.');
      return;
    }
    if (trimmed.length < MIN_LAB_NO_LENGTH) {
      setError('Please enter your complete lab number. Partial numbers cannot be searched.');
      return;
    }
    if (/\s/.test(trimmed)) {
      setError('Lab number should not contain spaces. Please enter the number exactly as shown on your receipt.');
      return;
    }
    fetchResults();
  };

  // Auto-fetch when URL has /results/:labNo (e.g. from QR code with lab number in URL)
  useEffect(() => {
    if (!labNoParam?.trim() || data || loading) return;
    const trimmed = labNoParam.trim();
    if (trimmed.length < MIN_LAB_NO_LENGTH) {
      setLabNo(trimmed);
      setError('Please enter your complete lab number. Partial numbers cannot be searched.');
      return;
    }
    setLabNo(trimmed);
    setError(null);
    setLoading(true);
    setData(null);
    fetch(resultsApiUrl(trimmed))
      .then((res) => (res.ok ? res.json() : res.json().then((j: any) => Promise.reject(new Error(j?.error || 'Failed to fetch')))))
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'))
      .finally(() => setLoading(false));
  }, [labNoParam]);

  return (
    <div className="results-page">
      <div className="results-container">
        <div className="results-header">
          <img src="/images/logo-nakasero.png" alt="Logo" className="results-logo" />
          <h1>Check Your Results</h1>
          <p>Enter your lab number to see the status of your tests</p>
        </div>

        <form onSubmit={handleSubmit} className="results-form">
          <div className="results-input-row">
            <input
              type="text"
              placeholder="Enter full lab number from your receipt"
              value={labNo}
              onChange={(e) => setLabNo(e.target.value)}
              className="results-input"
              autoFocus
              autoComplete="off"
            />
            <button type="submit" className="results-submit" disabled={loading}>
              {loading ? 'Checking...' : 'Check'}
            </button>
          </div>
          {error && <p className="results-error">{error}</p>}
        </form>

        {data && (
          <div className="results-content">
            {data.found ? (
              <>
                <div className="results-summary">
                  <span>Your tests</span>
                  <span>
                    {data.summary.resulted} resulted · {data.summary.received} in progress · {data.summary.pending} pending
                    {data.summary.cancelled > 0 && ` · ${data.summary.cancelled} cancelled`}
                  </span>
                </div>
                <div className="results-table-wrap">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Section</th>
                        <th>Status</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tests.map((t, i) => (
                        <tr key={i}>
                          <td>{t.test_name}</td>
                          <td>{t.lab_section || '—'}</td>
                          <td>
                            <span className={`results-badge ${statusBadgeClass(t.status)}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>{formatTime(t.time_in)}</td>
                          <td>{formatTime(t.time_out)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="results-not-found">
                <p>{data.message || "We couldn't find this lab number. Please check your receipt or contact the lab for assistance."}</p>
              </div>
            )}
          </div>
        )}

        <div className="results-footer">
          <Link to="/" className="results-back">← Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default Results;
