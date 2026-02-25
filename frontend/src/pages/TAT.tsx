// frontend/src/pages/TAT.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Header, Navbar, Filters, Loader, KPICard, Footer } from '@/components/shared';
import { 
  TATPieChart, 
  TATLineChart, 
  TATHourlyChart,
  TATProgressChart 
} from '@/components/charts';
import { exportElementToPdf, buildExportFilename } from '@/utils/exportPdf';

interface TATData {
  pieData: {
    onTime: number;
    delayedLess15: number;
    overDelayed: number;
    notUploaded: number;
  };
  dailyTrend: Array<{
    date: string;
    delayed: number;
    onTime: number;
    notUploaded: number;
  }>;
  hourlyTrend: Array<{
    hour: number;
    delayed: number;
    onTime: number;
    notUploaded: number;
  }>;
  kpis: {
    totalRequests: number;
    delayedRequests: number;
    onTimeRequests: number;
    avgDailyDelayed: number;
    avgDailyOnTime: number;
    avgDailyNotUploaded: number;
    mostDelayedHour: string;
    mostDelayedDay: string;
  };
}

const TAT: React.FC = () => {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    shift: 'all',
    hospitalUnit: 'all'
  });
  
  const [data, setData] = useState<TATData | null>(null);
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

      const response = await fetch(`/api/tat?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch TAT data');
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching TAT data:', error);
      // On error, clear data so charts do not display mock values
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: 'thisMonth',
      shift: 'all',
      hospitalUnit: 'all'
    });
  };

  const handleExportPdf = async () => {
    if (chartsRef.current) {
      const headerParts: string[] = [];
      if (filters.period && filters.period !== 'custom') headerParts.push(`Period: ${filters.period}`);
      if (filters.startDate && filters.endDate) headerParts.push(`${filters.startDate} to ${filters.endDate}`);
      if (filters.shift && filters.shift !== 'all') headerParts.push(`Shift: ${filters.shift}`);
      if (filters.hospitalUnit && filters.hospitalUnit !== 'all') headerParts.push(`Unit: ${filters.hospitalUnit}`);
      const filename = buildExportFilename('TAT', [filters.period, filters.shift, filters.hospitalUnit].filter((x) => x && x !== 'all'));
      await exportElementToPdf(chartsRef.current, filename, {
        title: 'TAT Report',
        headerLines: headerParts,
      });
    }
  };

  if (isLoading) {
    return <Loader isLoading={true} />;
  }

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`chart-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
      <Header
        title="NHL Laboratory Dashboard"
        pageTitle="TAT"
        onLogout={handleLogout}
        onResetFilters={handleResetFilters}
        showResetFilters={true}
        menuItems={[
          { label: 'Export PDF', href: '#', icon: 'fas fa-file-pdf', onClick: handleExportPdf },
          { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
          { label: 'Performance Table', href: '/performance', icon: 'fas fa-table' },
          { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' }
        ]}
      />

      <button type="button" className="chart-page-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
        <i className={`fas fa-chevron-${filtersOpen ? 'up' : 'down'}`} aria-hidden />
        {filtersOpen ? 'Hide menu' : 'Filters & Menu'}
      </button>
      <Navbar type="chart" />

      <div className="chart-filters-section">
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          showLabSectionFilter={false}
          showShiftFilter={true}
          showLaboratoryFilter={true}
          showPeriodFilter={true}
        />
      </div>
      </div>

      <main className={`dashboard-layout chart-page-main ${filtersOpen ? 'filters-expanded' : ''}`} ref={chartsRef}>
        <aside className="revenue-progress-card">
          {data && (
            <>
              <TATProgressChart
                currentValue={data.kpis.delayedRequests}
                totalValue={data.kpis.totalRequests}
                title="Total Delayed Requests"
                color="#f44336"
              />
              
              <div style={{ marginTop: '20px' }}>
                <TATProgressChart
                  currentValue={data.kpis.onTimeRequests}
                  totalValue={data.kpis.totalRequests}
                  title="Total On-Time Requests"
                  color="#4caf50"
                />
              </div>
            </>
          )}

          <div className="kpi-grid">
            {data && (
              <>
                <KPICard
                  title="Average Daily On-Time"
                  value={data.kpis.avgDailyOnTime}
                  trend={{ value: -3.2, direction: 'down' }}
                  icon="fas fa-check-circle"
                  suffix=""
                />
                <KPICard
                  title="Average Daily Delays"
                  value={data.kpis.avgDailyDelayed}
                  trend={{ value: 5.7, direction: 'up' }}
                  icon="fas fa-clock"
                  suffix=""
                />
                <KPICard
                  title="Average Daily Not Uploaded"
                  value={data.kpis.avgDailyNotUploaded}
                  trend={{ value: -1.5, direction: 'down' }}
                  icon="fas fa-upload"
                  suffix=""
                />
                <KPICard
                  title="Most Delayed Hour"
                  value={data.kpis.mostDelayedHour}
                  icon="fas fa-hourglass-half"
                />
                <KPICard
                  title="Most Delayed Day"
                  value={data.kpis.mostDelayedDay}
                  fullWidth={true}
                  icon="fas fa-calendar-times"
                />
              </>
            )}
          </div>
        </aside>

        <div className="charts-area">
          <div className="dashboard-charts">
            <div className="performance-chart">
              <div className="chart-title">
                <i className="fas fa-chart-pie mr-2"></i>
                TAT Performance Distribution
              </div>
              <div className="chart-container chart-container--doughnut">
                {data && <TATPieChart data={data.pieData} />}
              </div>
            </div>
            
            <div className="daily-performance-chart">
              <div className="chart-title">
                <i className="fas fa-chart-line mr-2"></i>
                Daily TAT Performance Trend
              </div>
              <div className="chart-container">
                {data && <TATLineChart data={data.dailyTrend} />}
              </div>
            </div>
            
            <div className="hourly-performance-chart">
              <div className="chart-title">
                <i className="fas fa-clock mr-2"></i>
                Hourly TAT Performance Trend
              </div>
              <div className="chart-container">
                {data && <TATHourlyChart data={data.hourlyTrend} />}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TAT;