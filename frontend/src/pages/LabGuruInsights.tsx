import React, { useState, useEffect } from 'react';
import { Header, Navbar, Footer } from '@/components/shared';
import { getPeriodDates } from '@/utils/dateUtils';

interface TestItem {
  test: string;
  count: number;
}

const PAGE_SIZE = 25;

const TableBlock: React.FC<{
  title: string;
  paginated: TestItem[];
  search: string;
  onSearchChange: (v: string) => void;
  onClear: () => void;
  page: number;
  setPage: (v: number | ((p: number) => number)) => void;
  totalPages: number;
  totalCount: number;
}> = ({ title, paginated, search, onSearchChange, onClear, page, setPage, totalPages, totalCount }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>{title}</h3>
    <div className="search-input-with-clear" style={{ marginBottom: '8px' }}>
      <input
        type="text"
        placeholder="Search test..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClear()}
      />
      <button
        type="button"
        className="search-clear-btn"
        onClick={onClear}
        disabled={!search}
        title="Clear"
        aria-label="Clear search"
      >
        <i className="fas fa-times" aria-hidden />
      </button>
    </div>
    <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>#</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Test</th>
            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid var(--border-color)' }}>Count</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                {search ? 'No matches' : 'No data'}
              </td>
            </tr>
          ) : (
            paginated.map((row, i) => (
              <tr key={`${row.test}-${i}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 12px' }}>{page * PAGE_SIZE + i + 1}</td>
                <td style={{ padding: '10px 12px' }}>{row.test}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{row.count.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    {totalPages > 1 && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ color: '#666', fontSize: '0.875rem' }}>
          Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '6px 12px', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: '6px 12px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      </div>
    )}
  </div>
);

const LabGuruInsights: React.FC = () => {
  const { startDate: defStart, endDate: defEnd } = getPeriodDates('thisMonth');
  const [filters, setFilters] = useState({
    startDate: defStart,
    endDate: defEnd,
    period: 'thisMonth',
  });
  const [data, setData] = useState<{
    labguruTests: TestItem[];
    ourTests: TestItem[];
    labguruCount: number;
    ourCount: number;
    target: number;
    gap: number;
    startDate: string;
    endDate: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchLabguru, setSearchLabguru] = useState('');
  const [searchOurs, setSearchOurs] = useState('');
  const [pageLabguru, setPageLabguru] = useState(0);
  const [pageOurs, setPageOurs] = useState(0);

  useEffect(() => {
    fetchData();
  }, [filters.period, filters.startDate, filters.endDate]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const res = await fetch(`/api/labguru-insights/full?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        setData(null);
      } else {
        setData(json);
        setPageLabguru(0);
        setPageOurs(0);
      }
    } catch (e) {
      setError('Failed to load');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key === 'period' && value !== 'custom') {
      const dates = getPeriodDates(value);
      setFilters((prev) => ({ ...prev, startDate: dates.startDate, endDate: dates.endDate }));
    }
  };

  const filteredLabguru = (data?.labguruTests || []).filter(
    (t) => !searchLabguru || t.test.toLowerCase().includes(searchLabguru.toLowerCase())
  );
  const filteredOurs = (data?.ourTests || []).filter(
    (t) => !searchOurs || t.test.toLowerCase().includes(searchOurs.toLowerCase())
  );

  const paginatedLabguru = filteredLabguru.slice(pageLabguru * PAGE_SIZE, pageLabguru * PAGE_SIZE + PAGE_SIZE);
  const paginatedOurs = filteredOurs.slice(pageOurs * PAGE_SIZE, pageOurs * PAGE_SIZE + PAGE_SIZE);
  const totalPagesLabguru = Math.ceil(filteredLabguru.length / PAGE_SIZE);
  const totalPagesOurs = Math.ceil(filteredOurs.length / PAGE_SIZE);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleLabguruSearch = (v: string) => {
    setSearchLabguru(v);
    setPageLabguru(0);
  };
  const handleLabguruClear = () => {
    setSearchLabguru('');
    setPageLabguru(0);
  };
  const handleOursSearch = (v: string) => {
    setSearchOurs(v);
    setPageOurs(0);
  };
  const handleOursClear = () => {
    setSearchOurs('');
    setPageOurs(0);
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className="chart-page-top">
        <Header
          title="NHL Laboratory Dashboard"
          pageTitle="LabGuru Detailed Tests Insights"
          onLogout={handleLogout}
          menuItems={[
            { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
            { label: 'Tests', href: '/tests', icon: 'fas fa-flask' },
          ]}
        />
        <Navbar type="chart" />
        <div className="chart-filters-section">
          <div className="dashboard-filters">
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  updateFilter('endDate', e.target.value);
                  if (e.target.value) updateFilter('period', 'custom');
                }}
              />
            </div>
            <div className="filter-group">
              <label>Period</label>
              <select
                value={filters.period}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v !== 'custom') {
                    const { startDate, endDate } = getPeriodDates(v);
                    setFilters((prev) => ({ ...prev, period: v, startDate, endDate }));
                  } else {
                    setFilters((prev) => ({ ...prev, period: v }));
                  }
                }}
              >
                <option value="custom">Custom</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="lastQuarter">Last Quarter</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loader">
          <div className="one"></div>
          <div className="two"></div>
          <div className="three"></div>
          <div className="four"></div>
        </div>
      )}

      <main className="dashboard-layout labguru-insights-main" style={{ padding: '20px', paddingTop: 'calc(var(--app-header-height) + var(--app-navbar-height) + var(--app-chart-filters-height) + 20px)', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {error && <p style={{ color: '#c00', marginBottom: '16px' }}>{error}</p>}

        {!isLoading && data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '12px', width: '100%', maxWidth: '900px' }}>
              <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>LabGuru</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.labguruCount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>Dashboard</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.ourCount.toLocaleString()}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>Target</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.target.toLocaleString()}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>Gap</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: data.gap !== 0 ? '#666' : 'inherit' }}>{data.gap >= 0 ? '+' : ''}{data.gap.toLocaleString()}</div>
              </div>
            </div>
            <p className="labguru-date-range" style={{ marginBottom: '16px', color: '#666', textAlign: 'center', fontSize: '0.9rem' }}>
              {data.startDate} to {data.endDate}
            </p>
            <div className="labguru-tables-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', width: '100%', maxWidth: '1200px' }}>
              <TableBlock
                title="LabGuru Tests"
                paginated={paginatedLabguru}
                search={searchLabguru}
                onSearchChange={handleLabguruSearch}
                onClear={handleLabguruClear}
                page={pageLabguru}
                setPage={setPageLabguru}
                totalPages={totalPagesLabguru}
                totalCount={filteredLabguru.length}
              />
              <TableBlock
                title="Dashboard (Meta) Tests"
                paginated={paginatedOurs}
                search={searchOurs}
                onSearchChange={handleOursSearch}
                onClear={handleOursClear}
                page={pageOurs}
                setPage={setPageOurs}
                totalPages={totalPagesOurs}
                totalCount={filteredOurs.length}
              />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LabGuruInsights;
