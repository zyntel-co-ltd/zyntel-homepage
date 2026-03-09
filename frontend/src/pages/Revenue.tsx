import React, { useState, useEffect, useRef } from 'react';
import { Header, Navbar, Filters, Footer, KPICard } from '@/components/shared';
import { exportElementToPdf, buildExportFilename } from '@/utils/exportPdf';
import {
  DailyRevenueChart,
  SectionRevenueChart,
  TestRevenueChart,
  HospitalUnitRevenueChart,
  TargetProgressChart
} from '@/components/charts';

interface RevenueData {
  totalRevenue: number;
  targetRevenue: number;
  targetTooltip?: string;
  percentage: number;
  avgDailyRevenue: number;
  revenueGrowthRate: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  sectionRevenue: Array<{ section: string; revenue: number }>;
  testRevenue: Array<{ test_name: string; revenue: number }>;
  hospitalUnitRevenue: Array<{ unit: string; revenue: number }>;
}

const Revenue: React.FC = () => {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    hospitalUnit: 'all',
    testName: ''
  });
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters.endDate, filters.period, filters.labSection, filters.shift, filters.hospitalUnit, filters.testName]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.labSection) params.append('labSection', filters.labSection);
      if (filters.shift) params.append('shift', filters.shift);
      if (filters.hospitalUnit) params.append('laboratory', filters.hospitalUnit);
      if (filters.testName?.trim()) params.append('testName', filters.testName.trim());

      const response = await fetch(`/api/revenue?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: 'thisMonth',
      labSection: 'all',
      shift: 'all',
      hospitalUnit: 'all',
      testName: ''
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleExportPdf = async () => {
    if (chartsRef.current) {
      const { getPeriodDates } = await import('@/utils/dateUtils');
      const dates = filters.startDate && filters.endDate
        ? { startDate: filters.startDate, endDate: filters.endDate }
        : getPeriodDates(filters.period || 'thisMonth');
      const headerParts: string[] = [`Dates: ${dates.startDate} to ${dates.endDate}`];
      if (filters.labSection && filters.labSection !== 'all') headerParts.push(`Section: ${filters.labSection}`);
      if (filters.shift && filters.shift !== 'all') headerParts.push(`Shift: ${filters.shift}`);
      if (filters.hospitalUnit && filters.hospitalUnit !== 'all') headerParts.push(`Unit: ${filters.hospitalUnit}`);
      if (filters.testName?.trim()) headerParts.push(`Test: ${filters.testName.trim()}`);
      const filename = buildExportFilename('Revenue', [dates.startDate, dates.endDate, filters.labSection, filters.shift, filters.hospitalUnit].filter((x) => x && x !== 'all'));
      await exportElementToPdf(chartsRef.current, filename, {
        title: 'Revenue Report',
        headerLines: headerParts,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className="chart-page-top">
        <Header
          title="NHL Laboratory Dashboard"
          pageTitle="Revenue"
          onLogout={handleLogout}
          onResetFilters={resetFilters}
          showResetFilters={true}
          menuItems={[
            { label: 'Export PDF', href: '#', icon: 'fas fa-file-pdf', onClick: handleExportPdf },
            { label: 'Meta table', href: '/meta', icon: 'fas fa-database' },
            { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
          ]}
        />
        <button type="button" className="chart-page-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-expanded={sidebarOpen}>
          <i className={`fas fa-chevron-${sidebarOpen ? 'up' : 'down'}`} aria-hidden />
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
        <Navbar type="chart" />
        <div className="chart-filters-section">
          <Filters filters={filters} onFilterChange={updateFilter} showLabSectionFilter={true} showShiftFilter={true} showLaboratoryFilter={true} showTestNameFilter={true} />
        </div>
      </div>

      {isLoading && <div className="loader"><div className="one"></div><div className="two"></div><div className="three"></div><div className="four"></div></div>}

      <div className={`filters-panel-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden />
      <div className={`menu-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="filters-panel-header">
          <h3>Menu & Filters</h3>
          <button type="button" className="filters-panel-close" onClick={() => setSidebarOpen(false)} aria-label="Close">&times;</button>
        </div>
        <div className="menu-sidebar-nav">
          <Navbar type="chart" />
        </div>
        <Filters filters={filters} onFilterChange={updateFilter} showLabSectionFilter={true} showShiftFilter={true} showLaboratoryFilter={true} showPeriodFilter={true} showDateFilter={true} showTestNameFilter={true} />
      </div>

      <main className="dashboard-layout chart-page-main" ref={chartsRef}>
        <aside className="revenue-progress-card">
          {data ? (
            <TargetProgressChart
              currentValue={data.totalRevenue}
              targetValue={data.targetRevenue || 1_500_000_000}
              title="Total Revenue"
              achievedColor="#4caf50"
              gapColor="#e0e0e0"
              valuePrefix="UGX "
              targetLabel={`of UGX ${(data.targetRevenue || 1_500_000_000).toLocaleString()}`}
              tooltip={data.targetTooltip}
              height={28}
            />
          ) : (
            <div className="target-progress-chart">
              <div className="target-progress-chart__label">Total Revenue</div>
              <div className="target-progress-chart__percentage">0%</div>
              <div className="target-progress-chart__amounts">
                <span>UGX 0</span>
                <span className="target-progress-chart__target">of UGX 0</span>
              </div>
            </div>
          )}

          <div className="kpi-grid">
            <KPICard
              title="Avg. Daily Revenue"
              value={data?.avgDailyRevenue ?? 0}
              prefix="UGX "
              suffix=""
              tooltip="For the selected date range"
            />
            <KPICard
              title="Revenue Growth Rate"
              value={(data?.revenueGrowthRate ?? 0).toFixed(1)}
              suffix="%"
              tooltip="For the selected date range"
              trend={data?.revenueGrowthRate != null ? {
                value: data.revenueGrowthRate,
                direction: data.revenueGrowthRate > 0 ? 'up' : data.revenueGrowthRate < 0 ? 'down' : 'neutral'
              } : undefined}
            />
          </div>
        </aside>

        <div className="charts-area">
          <div className="dashboard-charts">
            {/* 1. Section Revenue Chart - FIRST (Doughnut) */}
            <div className="section-revenue">
              <div className="chart-title">Revenue by Laboratory Section</div>
              <div className="chart-container">
                {data?.sectionRevenue ? (
                  <SectionRevenueChart data={data.sectionRevenue} />
                ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
                )}
              </div>
            </div>

            {/* 2. Daily Revenue Chart - SECOND (Line) */}
            <div className="revenue">
              <div className="chart-title">Daily Revenue</div>
              <div className="chart-container">
                {data?.dailyRevenue ? (
                  <DailyRevenueChart data={data.dailyRevenue} />
                ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
                )}
              </div>
            </div>

            {/* 3. Hospital Unit Revenue Chart - THIRD (Bar) */}
            <div className="hospital-unit">
              <div className="chart-title">Revenue by Hospital Unit</div>
              <div className={`chart-container ${(() => {
                const hospitalData = (data?.hospitalUnitRevenue || []).filter(
                  (d) => d.unit !== 'Main Laboratory' && d.unit !== 'mainLab'
                );
                return hospitalData.length <= 1 ? 'chart-container--few-items' : '';
              })()}`}>
                {(() => {
                  const hospitalData = (data?.hospitalUnitRevenue || []).filter(
                    (d) => d.unit !== 'Main Laboratory' && d.unit !== 'mainLab'
                  );
                  return hospitalData.length ? (
                    <HospitalUnitRevenueChart data={hospitalData} />
                  ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
                  );
                })()}
              </div>
            </div>

            {/* 4. Revenue by Test - LAST (50 tests, tall canvas) */}
            <div className="test-revenue">
              <div className="chart-title">Revenue by Test</div>
              <div className={`chart-container chart-container--50items ${(data?.testRevenue?.length ?? 0) <= 1 ? 'chart-container--few-items' : ''}`}>
                {data?.testRevenue ? (
                  <TestRevenueChart data={data.testRevenue} />
                ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export { Revenue as default };