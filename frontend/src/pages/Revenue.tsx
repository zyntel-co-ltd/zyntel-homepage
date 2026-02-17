import React, { useState, useEffect } from 'react';
import { Header, Navbar, Filters, Loader } from '@/components/shared';
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
  percentage: number;
  avgDailyRevenue: number;
  revenueGrowthRate: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  sectionRevenue: Array<{ section: string; revenue: number }>;
  testRevenue: Array<{ test_name: string; revenue: number }>;
  hospitalUnitRevenue: Array<{ unit: string; revenue: number }>;
}

const Revenue: React.FC = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    hospitalUnit: 'all'
  });
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

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
      hospitalUnit: 'all'
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
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
            { label: 'Export PDF', href: '#', icon: 'fas fa-file-pdf' },
            { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
            { label: 'Meta table', href: '/meta', icon: 'fas fa-database' },
            { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
          ]}
        />
        <Navbar type="chart" />
        <div className="chart-filters-section">
          <Filters filters={filters} onFilterChange={updateFilter} showLabSectionFilter={true} showShiftFilter={true} showLaboratoryFilter={true} />
        </div>
      </div>

      {isLoading && <div className="loader"><div className="one"></div><div className="two"></div><div className="three"></div><div className="four"></div></div>}

      <main className="dashboard-layout chart-page-main">
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
            <div className="kpi-card">
              <div className="kpi-label">Avg. Daily Revenue</div>
              <div className="kpi-value">UGX {data?.avgDailyRevenue?.toLocaleString() || '0'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Revenue Growth Rate</div>
              <div className="kpi-value">{data?.revenueGrowthRate?.toFixed(1) || '0'}%</div>
            </div>
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
              <div className="chart-container">
                {data?.hospitalUnitRevenue ? (
                  <HospitalUnitRevenueChart data={data.hospitalUnitRevenue} />
                ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No data available</p>
                )}
              </div>
            </div>

            {/* 4. Test Revenue Chart - FOURTH (Bar) */}
            <div className="test-revenue">
              <div className="chart-title">Revenue by Test</div>
              <div className="chart-container">
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

      <footer>
        <p>&copy;2025 Zyntel</p>
        <div className="zyntel">
          <img src="/images/zyntel_no_background.png" alt="logo" />
        </div>
      </footer>
    </div>
  );
};

export default Revenue;