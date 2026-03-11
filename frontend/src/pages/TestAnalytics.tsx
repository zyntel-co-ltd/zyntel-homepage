import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header, Navbar, Filters, Footer, KPICard } from '@/components/shared';
import { TestVolumeChart, DailyRevenueChart } from '@/components/charts';
import { exportElementToPdf, buildExportFilename } from '@/utils/exportPdf';

interface TestAnalyticsData {
  testName: string;
  totalCount: number;
  totalRevenue: number;
  avgTat: number | null;
  onTimeCount: number;
  delayedCount: number;
  noTatCount: number;
  percentage: number;
  avgDailyTests: number;
  testVolumeTrend: Array<{ date: string; count: number }>;
  revenueTrend: Array<{ date: string; revenue: number }>;
  granularity?: 'daily' | 'monthly';
}

const TestAnalytics: React.FC = () => {
  const { testName } = useParams<{ testName: string }>();
  const chartsRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    hospitalUnit: 'all',
  });
  const [data, setData] = useState<TestAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!testName) return;
    fetchData();
  }, [testName, filters.period, filters.startDate, filters.endDate, filters.labSection, filters.shift, filters.hospitalUnit]);

  const fetchData = async () => {
    if (!testName) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.labSection && filters.labSection !== 'all') params.append('labSection', filters.labSection);
      if (filters.shift && filters.shift !== 'all') params.append('shift', filters.shift);
      if (filters.hospitalUnit && filters.hospitalUnit !== 'all') params.append('laboratory', filters.hospitalUnit);

      const response = await fetch(`/api/tests/${encodeURIComponent(testName)}/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch test analytics');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    const stateKey = key === 'hospitalUnit' ? 'laboratory' : key;
    setFilters((prev) => ({ ...prev, [stateKey]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: 'thisMonth',
      labSection: 'all',
      shift: 'all',
      hospitalUnit: 'all',
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleExportPdf = async () => {
    if (chartsRef.current && data) {
      const { getPeriodDates } = await import('@/utils/dateUtils');
      const dates =
        filters.startDate && filters.endDate
          ? { startDate: filters.startDate, endDate: filters.endDate }
          : getPeriodDates(filters.period || 'thisMonth');
      const filename = buildExportFilename(`Test-${data.testName}`, [dates.startDate, dates.endDate]);
      await exportElementToPdf(chartsRef.current, filename, {
        title: `Analytics: ${data.testName}`,
        headerLines: [`Dates: ${dates.startDate} to ${dates.endDate}`],
      });
    }
  };

  if (!testName) {
    return (
      <div className="min-h-screen bg-background-color">
        <p>No test selected. <a href="/tests">Back to Tests</a></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-color">
      <div className="chart-page-top">
        <Header
          title="NHL Laboratory Dashboard"
          pageTitle={`Test Analytics: ${decodeURIComponent(testName)}`}
          onLogout={handleLogout}
          onResetFilters={resetFilters}
          showResetFilters={true}
          menuItems={[
            { label: 'Export PDF', href: '#', icon: 'fas fa-file-pdf', onClick: handleExportPdf },
            { label: 'Back to Tests', href: '/tests', icon: 'fas fa-chart-bar' },
            { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
          ]}
        />
        <button type="button" className="chart-page-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-expanded={sidebarOpen}>
          <i className={`fas fa-chevron-${sidebarOpen ? 'up' : 'down'}`} aria-hidden />
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
        <Navbar type="chart" />
        <div className="chart-filters-section">
          <Filters
            filters={filters}
            onFilterChange={updateFilter}
            showLabSectionFilter={true}
            showShiftFilter={true}
            showLaboratoryFilter={true}
            showPeriodFilter={true}
          />
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

      <div className={`filters-panel-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden />
      <div className={`menu-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="filters-panel-header">
          <h3>Menu & Filters</h3>
          <button type="button" className="filters-panel-close" onClick={() => setSidebarOpen(false)} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="menu-sidebar-nav">
          <Navbar type="chart" />
        </div>
        <Filters
          filters={filters}
          onFilterChange={updateFilter}
          showLabSectionFilter={true}
          showShiftFilter={true}
          showLaboratoryFilter={true}
          showPeriodFilter={true}
          showDateFilter={true}
        />
      </div>

      {!isLoading && data && (
        <main className="dashboard-layout chart-page-main" ref={chartsRef}>
          <aside className="revenue-progress-card">
            <KPICard title="Total Count" value={data.totalCount.toLocaleString()} icon="fas fa-vial" fullWidth />
            <KPICard title="Revenue (UGX)" value={data.totalRevenue.toLocaleString()} icon="fas fa-money-bill" fullWidth />
            <KPICard title="Avg. TAT (min)" value={data.avgTat != null ? data.avgTat.toFixed(1) : 'N/A'} icon="fas fa-clock" fullWidth />
            <KPICard title="On Time" value={data.onTimeCount.toLocaleString()} icon="fas fa-check-circle" fullWidth />
            <KPICard title="Delayed" value={data.delayedCount.toLocaleString()} icon="fas fa-exclamation-triangle" fullWidth />
            <KPICard title="Avg. Daily" value={data.avgDailyTests.toFixed(1)} icon="fas fa-chart-line" fullWidth />
          </aside>

          <div className="charts-area">
            <div className="test-count">
              <h3 className="chart-title">
                <i className="fas fa-chart-bar mr-2"></i>
                {data.granularity === 'monthly' ? 'Monthly' : 'Daily'} Volume
              </h3>
              <div className="chart-container">
                {data.testVolumeTrend && data.testVolumeTrend.length > 0 ? (
                  <TestVolumeChart data={data.testVolumeTrend} granularity={data.granularity} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>No data</div>
                )}
              </div>
            </div>
            <div className="test-count">
              <h3 className="chart-title">
                <i className="fas fa-money-bill mr-2"></i>
                {data.granularity === 'monthly' ? 'Monthly' : 'Daily'} Revenue
              </h3>
              <div className="chart-container">
                {data.revenueTrend && data.revenueTrend.length > 0 ? (
                  <DailyRevenueChart data={data.revenueTrend} granularity={data.granularity} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>No data</div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {!isLoading && !data && (
        <main style={{ padding: '30px' }}>
          <p>No analytics data for this test.</p>
        </main>
      )}

      <Footer />
    </div>
  );
};

export default TestAnalytics;
