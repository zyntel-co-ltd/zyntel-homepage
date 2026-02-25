// frontend/src/pages/Performance.tsx
import React, { useState, useEffect } from 'react';
import { Header, Navbar, Filters, Loader, Pagination, TestsForLabDialog, Footer } from '@/components/shared';
import { fetchWithAuth } from '@/services/api';
import { PerformanceTable, type PerformanceRecord } from '@/components/tables';
import { downloadCSV } from '@/utils/exportUtils';

const Performance: React.FC = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    shift: 'all',
    laboratory: 'all',
    search: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<PerformanceRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPage = 50;
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [testsDialogLabNo, setTestsDialogLabNo] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filters, currentPage]);

  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [filters, currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.shift && filters.shift !== 'all') {
        params.append('shift', filters.shift);
      }
      if (filters.laboratory && filters.laboratory !== 'all') {
        params.append('laboratory', filters.laboratory);
      }
      params.append('page', String(currentPage));
      params.append('limit', String(rowsPerPage));

      const response = await fetchWithAuth(`/api/performance?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();
      
      // Handle both paginated and non-paginated responses
      if (result.data) {
        setData(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalRecords(result.totalRecords || result.data.length);
      } else {
        setData(result);
        setTotalPages(1);
        setTotalRecords(result.length);
      }
    } catch (error) {
      console.error('Error:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const stateKey = key === 'hospitalUnit' ? 'laboratory' : key;
    setFilters(prev => ({ ...prev, [stateKey]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    window.location.href = '/';
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: 'thisMonth',
      shift: 'all',
      laboratory: 'all',
      search: ''
    });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Shift', 'Lab Number', 'Unit', 'Time In', 'Daily TAT', 'Time Expected', 'Time Out', 'Delay Status', 'Time Range'];
    const rows = data.map((r) => [
      r.date,
      r.Shift,
      r.lab_number,
      r.Hospital_Unit,
      r.time_in,
      r.daily_tat,
      r.request_time_expected,
      r.request_time_out,
      r.request_delay_status,
      r.request_time_range,
    ]);
    downloadCSV([headers, ...rows], `Performance-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`table-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
        <div className="header-wrapper">
          <Header
            title="Nakasero Hospital Laboratory"
            pageTitle="Performance Table"
            onLogout={handleLogout}
            onResetFilters={handleResetFilters}
            showResetFilters={true}
            menuItems={[
              { label: 'Export CSV', href: '#', icon: 'fas fa-file-csv', onClick: handleExportCSV },
              { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
              { label: 'Reception Table', href: '/reception', icon: 'fas fa-table' },
              { label: 'Progress Table', href: '/progress', icon: 'fas fa-chart-bar' },
              { label: 'Tracker Table', href: '/tracker', icon: 'fas fa-list' },
              { label: 'Meta Table', href: '/meta', icon: 'fas fa-database' },
              { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' }
            ]}
          />
          <Navbar type="table" />
        </div>
        <button type="button" className="table-page-toggle" onClick={() => setFiltersPanelOpen((o) => !o)} aria-expanded={filtersPanelOpen}>
          <i className={`fas fa-chevron-${filtersPanelOpen ? 'up' : 'down'}`} aria-hidden />
          {filtersPanelOpen ? 'Close' : 'Menu'}
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
              showLabSectionFilter={false}
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
              placeholder="Search lab number, unit, shift..."
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
          <h3>Menu & Filters</h3>
          <button type="button" className="filters-panel-close" onClick={() => setFiltersPanelOpen(false)} aria-label="Close">&times;</button>
        </div>
        <div className="menu-sidebar-nav">
          <Navbar type="table" />
        </div>
        <div className="menu-sidebar-search">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search lab number, unit, shift..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <i className="fas fa-search search-icon"></i>
          </div>
        </div>
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          showPeriodFilter={true}
          showLabSectionFilter={false}
          showShiftFilter={true}
          showLaboratoryFilter={true}
        />
      </div>

      <main className={`table-page-main ${filtersOpen ? 'filters-expanded' : ''}`}>
        {isLoading ? (
          <Loader isLoading={true} />
        ) : (
          <>
            <section className="card">
              <PerformanceTable
                data={data}
                onLabNumberDoubleClick={(labNumber) => setTestsDialogLabNo(labNumber)}
                isLoading={isLoading}
              />
            </section>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      <TestsForLabDialog
        labNo={testsDialogLabNo}
        open={testsDialogLabNo !== null}
        onClose={() => setTestsDialogLabNo(null)}
      />
      <Footer />
    </div>
  );
};

export default Performance;