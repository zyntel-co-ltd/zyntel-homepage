import React, { useState, useEffect, useRef } from 'react';
import { Header, Navbar, Filters } from '@/components/shared';
import {
  TopTestsByUnitChart,
  TestVolumeChart,
  TargetProgressChart
} from '@/components/charts';
import { exportElementToPdf } from '@/utils/exportPdf';

interface TestsData {
  totalTestsPerformed: number;
  targetTestsPerformed: number;
  percentage: number;
  avgDailyTests: number;
  dailyVolume: Array<{ date: string; count: number }>;
  topTestsByUnit: Array<{ test: string; count: number }>;
  units: string[];
}

const Tests: React.FC = () => {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    hospitalUnit: 'all'
  });
  const [data, setData] = useState<TestsData | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUnit(e.target.value);
  };

  useEffect(() => {
    fetchData();
  }, [filters.endDate, filters.period, filters.labSection, filters.shift, filters.hospitalUnit]);

  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [filters.endDate, filters.period, filters.labSection, filters.shift, filters.hospitalUnit]);

  // Re-process data when selected unit changes
  useEffect(() => {
    if (rawData) {
      processData(rawData);
    }
  }, [selectedUnit]);

  const processData = (result: any) => {
    // Map backend response to frontend expected format
    // Backend returns: testVolumeTrend, topTestsByUnit (object)
    // Frontend expects: dailyVolume, topTestsByUnit (array), units
    
    // Extract units from topTestsByUnit object keys
    const units = result.topTestsByUnit ? Object.keys(result.topTestsByUnit) : [];
    
    // Get tests for selected unit or all units
    let topTests: Array<{ test: string; count: number }> = [];
    if (selectedUnit === 'all') {
      // Aggregate all tests across all units
      const testMap: { [key: string]: number } = {};
      Object.values(result.topTestsByUnit || {}).forEach((unitTests: any) => {
        unitTests.forEach((t: any) => {
          testMap[t.test_name] = (testMap[t.test_name] || 0) + t.count;
        });
      });
      topTests = Object.entries(testMap)
        .map(([test, count]) => ({ test, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
    } else if (result.topTestsByUnit && result.topTestsByUnit[selectedUnit]) {
      // Get tests for specific unit
      topTests = result.topTestsByUnit[selectedUnit].map((t: any) => ({
        test: t.test_name,
        count: t.count
      }));
    }
    
    setData({
      totalTestsPerformed: result.totalTestsPerformed || 0,
      targetTestsPerformed: result.targetTestsPerformed || 0,
      percentage: result.percentage || 0,
      avgDailyTests: result.avgDailyTests || 0,
      dailyVolume: result.testVolumeTrend || [],
      topTestsByUnit: topTests,
      units
    });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.labSection && filters.labSection !== 'all') params.append('labSection', filters.labSection);
      if (filters.shift && filters.shift !== 'all') params.append('shift', filters.shift);
      if (filters.hospitalUnit && filters.hospitalUnit !== 'all') params.append('laboratory', filters.hospitalUnit);

      const response = await fetch(`/api/tests?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tests data');
      }

      const result = await response.json();
      console.log('Tests API Response:', result);
      
      setRawData(result);
      processData(result);
    } catch (error) {
      console.error('Error:', error);
      // Set empty data on error, no mock fallbacks
      setData({
        totalTestsPerformed: 0,
        targetTestsPerformed: 0,
        percentage: 0,
        avgDailyTests: 0,
        dailyVolume: [],
        topTestsByUnit: [],
        units: []
      });
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
    setSelectedUnit('all');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleExportPdf = async () => {
    if (chartsRef.current) {
      await exportElementToPdf(chartsRef.current, `Tests-${new Date().toISOString().slice(0, 10)}.pdf`, { title: 'Tests Report' });
    }
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className="chart-page-top">
        <Header
          title="NHL Laboratory Dashboard"
          pageTitle="Tests"
          onLogout={handleLogout}
          onResetFilters={resetFilters}
          showResetFilters={true}
          menuItems={[
            { label: 'Export PDF', href: '#', icon: 'fas fa-file-pdf', onClick: handleExportPdf },
            { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
            { label: 'Meta table', href: '/meta', icon: 'fas fa-database' },
            { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
          ]}
        />
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

      {!isLoading && (
        <main className="dashboard-layout chart-page-main" ref={chartsRef}>
          <aside className="revenue-progress-card">
            {data && (
              <TargetProgressChart
                currentValue={data.totalTestsPerformed}
                targetValue={data.targetTestsPerformed || 1}
                title="Total Tests Performed"
                achievedColor="#4caf50"
                gapColor="#e0e0e0"
                targetLabel={`of ${data.targetTestsPerformed.toLocaleString()} target`}
                height={28}
              />
            )}
            <div className="kpi-card kpi-card-full-width">
              <div className="kpi-label">
                <i className="fas fa-chart-line mr-2"></i>
                Avg. Daily Tests
              </div>
              <div className="kpi-value">{data?.avgDailyTests?.toFixed(1) || '0'}</div>
            </div>
          </aside>

          <div className="charts-area">
            <div className="dashboard-charts">
              {/* Daily Test Volume Trend - first */}
              <div className="test-count">
                <h3 className="chart-title">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Daily Test Volume Trend
                </h3>
                <div className="chart-container">
                  {data?.dailyVolume && data.dailyVolume.length > 0 ? (
                    <TestVolumeChart data={data.dailyVolume} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                      <i className="fas fa-chart-line" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}></i>
                      <p>No test volume data available for the selected period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Tests by Volume - LAST (50 tests, tall canvas) */}
              <div className="top-tests-container">
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 className="chart-title" style={{ margin: 0 }}>
                    <i className="fas fa-chart-bar mr-2"></i>
                    Top Tests by Volume
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label htmlFor="unitSelect" style={{ marginRight: '10px', fontSize: '0.9rem', color: 'var(--border-color)' }}>
                      Filter by Unit:
                    </label>
                    <select 
                      id="unitSelect"
                      value={selectedUnit}
                      onChange={handleUnitChange}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '5px',
                        fontSize: '0.9rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        color: 'var(--main-color)',
                        minWidth: '150px'
                      }}
                    >
                      <option value="all">All Units</option>
                      {data?.units?.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="chart-container chart-container--50items">
                  {data?.topTestsByUnit && data.topTestsByUnit.length > 0 ? (
                    <TopTestsByUnitChart data={data.topTestsByUnit} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                      <i className="fas fa-chart-bar" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}></i>
                      <p>No test volume data available for the selected unit</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      <footer>
        <p>&copy;2025 Zyntel</p>
        <div className="zyntel">
          <img src="/images/zyntel_no_background.png" alt="logo" />
        </div>
      </footer>
    </div>
  );
};

export default Tests;