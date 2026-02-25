// frontend/src/pages/Progress.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navbar, Filters, Loader, Pagination, TestsForLabDialog } from '@/components/shared';
import { formatDateTimeWithAMPM } from '@/constants/metaOptions';
import { downloadCSV } from '@/utils/exportUtils';

const Progress: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    laboratory: 'all',
    search: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPage = 50;
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [testsDialogLabNo, setTestsDialogLabNo] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [filters, currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams();
      if (filters.period && filters.period !== 'custom') {
        params.append('period', filters.period);
      } else {
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
      }
      
      if (filters.labSection && filters.labSection !== 'all') params.append('labSection', filters.labSection);
      if (filters.shift && filters.shift !== 'all') params.append('shift', filters.shift);
      if (filters.laboratory && filters.laboratory !== 'all') params.append('laboratory', filters.laboratory);
      if (filters.search) params.append('search', filters.search);
      params.append('page', String(currentPage));
      params.append('limit', String(rowsPerPage));

      const response = await fetch(`/api/progress?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.data) {
        setData(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalRecords(result.totalRecords || result.data.length);
      } else {
        setData(Array.isArray(result) ? result : []);
        setTotalPages(1);
        setTotalRecords(Array.isArray(result) ? result.length : 0);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Shift', 'Lab Number', 'Unit', 'Time In', 'Daily TAT', 'Time Expected', 'Time Out'];
    const rows = data.map((r: any) => [
      r.date ?? r.encounter_date,
      r.shift ?? r.Shift,
      r.lab_number ?? r.lab_no,
      r.Hospital_Unit ?? r.unit,
      r.time_in,
      r.daily_tat,
      r.request_time_expected,
      r.request_time_out ?? r.time_out,
    ]);
    downloadCSV([headers, ...rows], `Progress-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: 'thisMonth',
      labSection: 'all',
      shift: 'all',
      laboratory: 'all',
      search: ''
    });
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`table-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
        <div className="header-wrapper">
          <Header
            title="Nakasero Hospital Laboratory"
            pageTitle="Progress Table"
            onLogout={handleLogout}
            onResetFilters={handleResetFilters}
            showResetFilters={true}
            menuItems={[
              { label: 'Export CSV', href: '#', icon: 'fas fa-file-csv', onClick: handleExportCSV },
              { label: 'Reception', href: '/reception', icon: 'fas fa-table' },
              { label: 'Performance', href: '/performance', icon: 'fas fa-chart-line' },
              { label: 'Meta', href: '/meta', icon: 'fas fa-database' },
              { label: 'Tracker', href: '/tracker', icon: 'fas fa-list' },
              { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
            ]}
          />
          <Navbar type="table" />
        </div>
        <button type="button" className="table-page-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <i className={`fas fa-chevron-${filtersOpen ? 'up' : 'down'}`} aria-hidden />
          {filtersOpen ? 'Hide menu' : 'Menu'}
        </button>
        <div className="filters-row">
          <button type="button" className="filters-panel-trigger" onClick={() => setFiltersPanelOpen(true)} aria-label="Open filters">
            <i className="fas fa-filter" aria-hidden /> Filters
          </button>
          <div className="filters-inline">
            <Filters
              filters={filters}
              onFilterChange={handleFilterChange}
              showPeriodFilter={true}
              showLabSectionFilter={true}
              showShiftFilter={true}
              showLaboratoryFilter={true}
            />
          </div>
        </div>
        <div className="table-search-bar">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search test / lab number..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <i className="fas fa-search search-icon"></i>
          </div>
        </div>
      </div>

      <div className={`filters-panel-overlay ${filtersPanelOpen ? 'visible' : ''}`} onClick={() => setFiltersPanelOpen(false)} aria-hidden />
      <div className={`filters-panel ${filtersPanelOpen ? 'open' : ''}`}>
        <div className="filters-panel-header">
          <h3>Filters</h3>
          <button type="button" className="filters-panel-close" onClick={() => setFiltersPanelOpen(false)} aria-label="Close filters">&times;</button>
        </div>
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          showPeriodFilter={true}
          showLabSectionFilter={true}
          showShiftFilter={true}
          showLaboratoryFilter={true}
        />
      </div>

      <main className={`table-page-main ${filtersOpen ? 'filters-expanded' : ''}`}>
        {error && (
          <div style={{
            padding: '20px',
            margin: '20px 30px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '5px',
            color: '#c00'
          }}>
            <strong>Error loading data:</strong> {error}
          </div>
        )}
        
        {isLoading ? (
          <Loader isLoading={true} />
        ) : (
          <section className="card">
            {data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No progress data available</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="neon-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Shift</th>
                      <th className="lab-number-cell">Lab Number</th>
                      <th>Unit</th>
                      <th>Time In</th>
                      <th>Daily TAT <span className="subtext">(minutes)</span></th>
                      <th>Time Expected</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => {
                      const calculateProgress = (timeExpected: string, timeOut?: string) => {
                        const now = new Date();
                        
                        const hasTimeOut = timeOut && timeOut !== 'N/A' && timeOut !== null && timeOut !== undefined;
                        const timeOutDate = hasTimeOut ? new Date(timeOut) : null;
                        const isTimeOutValid = timeOutDate && !isNaN(timeOutDate.getTime());
                        const isTimeOutInPast = isTimeOutValid && timeOutDate <= now;

                        const hasTimeExpected = timeExpected && timeExpected !== 'N/A' && timeExpected !== null && timeExpected !== undefined;
                        const timeExpectedDate = hasTimeExpected ? new Date(timeExpected) : null;
                        const isTimeExpectedValid = timeExpectedDate && !isNaN(timeExpectedDate.getTime());
                        const isTimeExpectedInPast = isTimeExpectedValid && timeExpectedDate <= now;

                        if (isTimeOutValid && isTimeOutInPast) {
                          return { text: 'Completed', cssClass: 'progress-complete-actual' };
                        }
                        
                        if (isTimeExpectedValid && isTimeExpectedInPast && !isTimeOutValid) {
                          return { text: 'Delayed', cssClass: 'progress-overdue' };
                        }
                        
                        if (isTimeExpectedValid && !isTimeExpectedInPast) {
                          const timeLeft = timeExpectedDate.getTime() - now.getTime();
                          const timeLeftInMinutes = Math.floor(timeLeft / (1000 * 60));
                          const timeLeftInHours = Math.floor(timeLeft / (1000 * 60 * 60));
                          const timeLeftInDays = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                          
                          if (timeLeftInMinutes <= 10 && timeLeftInMinutes > 0) {
                            return { text: `${timeLeftInMinutes} min(s) remaining`, cssClass: 'progress-urgent' };
                          } else if (timeLeftInDays > 0) {
                            return { text: `${timeLeftInDays} day(s) remaining`, cssClass: 'progress-pending' };
                          } else if (timeLeftInHours > 0) {
                            return { text: `${timeLeftInHours} hr(s) remaining`, cssClass: 'progress-pending' };
                          } else if (timeLeftInMinutes > 0) {
                            return { text: `${timeLeftInMinutes} min(s) remaining`, cssClass: 'progress-pending' };
                          }
                          return { text: 'Due now', cssClass: 'progress-pending' };
                        }
                        
                        return { text: 'No ETA', cssClass: 'progress-pending' };
                      };

                      const dateIn = row.date ? new Date(row.date) : new Date();
                      const formattedDate = dateIn.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      
                      const progress = calculateProgress(row.request_time_expected || '', row.request_time_out);
                      
                      return (
                        <tr key={index}>
                          <td>{formattedDate}</td>
                          <td>{row.shift || 'N/A'}</td>
                          <td
                                className="lab-number-cell lab-number-cell-dbl"
                                onDoubleClick={() => setTestsDialogLabNo(row.lab_number || null)}
                                title="Double-click to view all tests"
                              >
                                {row.lab_number || 'N/A'}
                              </td>
                          <td>{row.Hospital_Unit || 'N/A'}</td>
                          <td>{row.time_in ? formatDateTimeWithAMPM(row.time_in) : 'N/A'}</td>
                          <td>{row.daily_tat || 'N/A'}</td>
                          <td>{row.request_time_expected ? formatDateTimeWithAMPM(row.request_time_expected) : 'N/A'}</td>
                          <td className={progress.cssClass}>{progress.text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!isLoading && data.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                onPageChange={handlePageChange}
              />
            )}
          </section>
        )}
      </main>

      <TestsForLabDialog
        labNo={testsDialogLabNo}
        open={testsDialogLabNo !== null}
        onClose={() => setTestsDialogLabNo(null)}
      />
      <footer>
        <p>&copy;2025 Zyntel</p>
        <div className="zyntel">
          <img src="/images/zyntel_no_background.png" alt="logo" />
        </div>
      </footer>
    </div>
  );
};

export default Progress;