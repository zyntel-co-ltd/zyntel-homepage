import React, { useState, useEffect, useRef } from 'react';
import { Header, Navbar, Filters, Footer } from '@/components/shared';
import {
  DailyNumbersChart,
  HourlyNumbersChart,
  TargetProgressChart
} from '@/components/charts';
import { exportElementToPdf, buildExportFilename } from '@/utils/exportPdf';

interface NumbersData {
  totalRequests: number;
  targetRequests: number;
  percentage: number;
  avgDailyRequests: number;
  busiestHour: string;
  busiestDay: string;
  dailyVolume: Array<{ date: string; count: number }>;
  hourlyVolume: Array<{ hour: number; count: number }>;
}

const Numbers: React.FC = () => {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    shift: 'all',
    hospitalUnit: 'all'
  });
  const [data, setData] = useState<NumbersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters.endDate, filters.period, filters.shift, filters.hospitalUnit]);

  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [filters.endDate, filters.period, filters.shift, filters.hospitalUnit]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.shift) params.append('shift', filters.shift);
      if (filters.hospitalUnit) params.append('laboratory', filters.hospitalUnit);

      const response = await fetch(`/api/numbers?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch numbers data');
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
      shift: 'all',
      hospitalUnit: 'all'
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleExportPdf = async () => {
    if (chartsRef.current) {
      const headerParts: string[] = [];
      if (filters.period && filters.period !== 'custom') headerParts.push(`Period: ${filters.period}`);
      if (filters.startDate && filters.endDate) headerParts.push(`${filters.startDate} to ${filters.endDate}`);
      if (filters.shift && filters.shift !== 'all') headerParts.push(`Shift: ${filters.shift}`);
      if (filters.hospitalUnit && filters.hospitalUnit !== 'all') headerParts.push(`Unit: ${filters.hospitalUnit}`);
      const filename = buildExportFilename('Numbers', [filters.period, filters.shift, filters.hospitalUnit].filter((x) => x && x !== 'all'));
      await exportElementToPdf(chartsRef.current, filename, {
        title: 'Numbers Report',
        headerLines: headerParts,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`chart-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
        <Header
          title="NHL Laboratory Dashboard"
          pageTitle="Numbers"
          onLogout={handleLogout}
          onResetFilters={resetFilters}
          showResetFilters={true}
          menuItems={[
            { label: 'Export PDF', href: '#', icon: 'fas fa-file-pdf', onClick: handleExportPdf },
            { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
            { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
          ]}
        />
        <button type="button" className="chart-page-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <i className={`fas fa-chevron-${filtersOpen ? 'up' : 'down'}`} aria-hidden />
          {filtersOpen ? 'Hide menu' : 'Filters & Menu'}
        </button>
        <Navbar type="chart" />
        <div className="chart-filters-section">
          <Filters filters={filters} onFilterChange={updateFilter} showLabSectionFilter={false} showShiftFilter={true} showLaboratoryFilter={true} />
        </div>
      </div>

      {isLoading && <div className="loader"><div className="one"></div><div className="two"></div><div className="three"></div><div className="four"></div></div>}

      <main className={`dashboard-layout chart-page-main ${filtersOpen ? 'filters-expanded' : ''}`} ref={chartsRef}>
        <aside className="numbers-summary-card">
          {data && (
            <TargetProgressChart
              currentValue={data.totalRequests}
              targetValue={data.targetRequests || 1}
              title="Total Requests"
              achievedColor="#4caf50"
              gapColor="#e0e0e0"
              targetLabel={`of ${data.targetRequests.toLocaleString()} target`}
              height={28}
            />
          )}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Average Daily Requests</div>
              <div className="kpi-value">{data?.avgDailyRequests?.toFixed(1) || '0'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Busiest Hour</div>
              <div className="kpi-value">{data?.busiestHour || 'N/A'}</div>
            </div>
            <div className="kpi-card kpi-card-full-width">
              <div className="kpi-label">Busiest Day</div>
              <div className="kpi-value">{data?.busiestDay || 'N/A'}</div>
            </div>
          </div>
        </aside>

        <div className="charts-area">
          <div className="dashboard-charts">
            {/* Daily Request Volume Chart */}
            <div className="daily-numbers-chart">
              <div className="chart-title">Daily Request Volume</div>
              <div className="chart-container">
                {data?.dailyVolume ? (
                  <DailyNumbersChart data={data.dailyVolume} />
                ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
                )}
              </div>
            </div>

            {/* Hourly Request Volume Chart */}
            <div className="hourly-numbers-chart">
              <div className="chart-title">Hourly Request Volume</div>
              <div className="chart-container">
                {data?.hourlyVolume ? (
                  <HourlyNumbersChart data={data.hourlyVolume} />
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

export default Numbers;