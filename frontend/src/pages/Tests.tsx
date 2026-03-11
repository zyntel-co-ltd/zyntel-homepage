import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Header, Navbar, Filters, Footer, KPICard } from '@/components/shared';
import {
  TopTestsByUnitChart,
  TestVolumeChart,
  TargetProgressChart
} from '@/components/charts';
import { exportElementToPdf, buildExportFilename } from '@/utils/exportPdf';

interface TestsData {
  totalTestsPerformed: number;
  targetTestsPerformed: number;
  percentage: number;
  avgDailyTests: number;
  dailyVolume: Array<{ date: string; count: number }>;
  granularity?: 'daily' | 'monthly';
  topTestsByUnit: Array<{ test: string; count: number }>;
  units: string[];
}

interface LabGuruInsights {
  labguruCount: number;
  ourCount: number;
  target: number;
  gap: number;
  startDate: string;
  endDate: string;
}

const Tests: React.FC = () => {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insights, setInsights] = useState<LabGuruInsights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    hospitalUnit: 'all',
    testName: ''
  });
  const [data, setData] = useState<TestsData | null>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUnit(e.target.value);
  };

  useEffect(() => {
    fetchData();
  }, [filters.endDate, filters.period, filters.labSection, filters.shift, filters.hospitalUnit, filters.testName]);

  const fetchInsights = async () => {
    setInsightsError(null);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const res = await fetch(`/api/labguru-insights?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const json = await res.json();
      if (json.error) {
        setInsightsError(json.error);
        setInsights(null);
      } else {
        setInsights(json);
      }
    } catch (e) {
      setInsightsError('Failed to load');
      setInsights(null);
    }
  };

  // Fetch LabGuru insights on load and when period changes (so LabGuru count is visible in header)
  useEffect(() => {
    fetchInsights();
  }, [filters.period, filters.startDate, filters.endDate]);

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
      granularity: result.granularity,
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
      if (filters.testName) params.append('testName', filters.testName);

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
        granularity: undefined,
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
      hospitalUnit: 'all',
      testName: ''
    });
    setSelectedUnit('all');
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
      const filename = buildExportFilename('Tests', [dates.startDate, dates.endDate, filters.labSection, filters.shift, filters.hospitalUnit].filter((x) => x && x !== 'all'));
      await exportElementToPdf(chartsRef.current, filename, {
        title: 'Tests Report',
        headerLines: headerParts,
      });
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
            showTestNameFilter={true}
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
          <button type="button" className="filters-panel-close" onClick={() => setSidebarOpen(false)} aria-label="Close">&times;</button>
        </div>
        <div className="menu-sidebar-nav">
          <Navbar type="chart" />
        </div>
        <Filters filters={filters} onFilterChange={updateFilter} showLabSectionFilter={true} showShiftFilter={true} showLaboratoryFilter={true} showPeriodFilter={true} showDateFilter={true} showTestNameFilter={true} />
      </div>

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
                tooltip="Target is prorated for the selected date range"
                height={28}
              />
            )}
            <KPICard title="Avg. Daily Tests" value={data?.avgDailyTests?.toFixed(1) || '0'} icon="fas fa-chart-line" fullWidth tooltip="For the selected date range" />
          </aside>

          <div className="charts-area">
            {/* Targets Comparison - LabGuru vs Our count (expandable) */}
            <div className="labguru-insights-card" style={{ marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setInsightsOpen((o) => !o)}
                style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'var(--card-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--main-color)' }}
              >
                <span>
                  <i className="fas fa-balance-scale mr-2"></i>
                  Targets Comparison (LabGuru vs Dashboard)
                  {insights && (
                    <span style={{ marginLeft: '12px', fontWeight: 600, color: 'var(--primary-color)' }}>
                      — LabGuru: {insights.labguruCount.toLocaleString()}
                    </span>
                  )}
                  {(insightsError && !insights) && (
                    <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#c00' }}>— Unable to load</span>
                  )}
                  {insights?.labguruError && (
                    <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#c00' }}>— LabGuru unavailable</span>
                  )}
                </span>
                <i className={`fas fa-chevron-${insightsOpen ? 'up' : 'down'}`}></i>
              </button>
              {insightsOpen && (
                <div style={{ padding: '16px', background: 'var(--background-color)', borderTop: '1px solid var(--border-color)' }}>
                  {(insightsError || insights?.labguruError) ? (
                    <p style={{ color: '#c00' }}>{insightsError || insights?.labguruError}</p>
                  ) : insights ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div style={{ padding: '12px', background: 'var(--card-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>LabGuru</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{insights.labguruCount.toLocaleString()}</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>Dashboard</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{insights.ourCount.toLocaleString()}</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>Target</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{insights.target.toLocaleString()}</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--card-bg)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>Gap</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: insights.gap !== 0 ? '#666' : 'inherit' }}>{insights.gap >= 0 ? '+' : ''}{insights.gap.toLocaleString()}</div>
                        </div>
                      </div>
                      <Link to="/labguru-insights" style={{ display: 'inline-block', marginTop: '12px', color: 'var(--main-color)', fontSize: '0.9rem' }}>
                        View full test-by-test analysis →
                      </Link>
                    </>
                  ) : (
                    <p style={{ color: '#666' }}>Loading...</p>
                  )}
                </div>
              )}
            </div>

            <div className="dashboard-charts">
              {/* Daily/Monthly Test Volume Trend - first */}
              <div className="test-count">
                <h3 className="chart-title">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  {data?.granularity === 'monthly' ? 'Monthly' : 'Daily'} Test Volume Trend
                </h3>
                <div className="chart-container">
                  {data?.dailyVolume && data.dailyVolume.length > 0 ? (
                    <TestVolumeChart data={data.dailyVolume} granularity={data.granularity} />
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
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 className="chart-title" style={{ margin: 0 }}>
                    <i className="fas fa-chart-bar mr-2"></i>
                    Top Tests by Volume
                  </h3>
                  {filters.testName && (
                    <Link
                      to={`/test-analytics/${encodeURIComponent(filters.testName)}`}
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--main-color)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="fas fa-chart-line"></i>
                      View analytics for &quot;{filters.testName}&quot;
                    </Link>
                  )}
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
                <div className={`chart-container chart-container--50items ${(data?.topTestsByUnit?.length ?? 0) <= 1 ? 'chart-container--few-items' : ''}`}>
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

      <Footer />
    </div>
  );
};

export default Tests;