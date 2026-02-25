// frontend/src/pages/Tracker.tsx
import React, { useState, useEffect } from 'react';
import { Header, Navbar, Filters, Loader, Pagination, TestsForLabDialog } from '@/components/shared';
import { TrackerTable, type TrackerRecord } from '@/components/tables';
import { downloadCSV } from '@/utils/exportUtils';

const Tracker: React.FC = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    hospitalUnit: 'all',
    search: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<TrackerRecord[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [testsDialogLabNo, setTestsDialogLabNo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPage = 50;

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
      if (filters.labSection && filters.labSection !== 'all') {
        params.append('labSection', filters.labSection);
      }
      if (filters.shift && filters.shift !== 'all') {
        params.append('shift', filters.shift);
      }
      if (filters.hospitalUnit && filters.hospitalUnit !== 'all') {
        params.append('laboratory', filters.hospitalUnit);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      params.append('page', String(currentPage));
      params.append('limit', String(rowsPerPage));

      const response = await fetch(`/api/tracker?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracker data');
      }

      const result = await response.json();
      const list = result?.data ?? (Array.isArray(result) ? result : []);
      setData(list);
      if (result?.totalRecords != null) {
        setTotalRecords(result.totalRecords);
        setTotalPages(result.totalPages ?? 1);
      } else {
        setTotalRecords(list.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching tracker data:', error);
      // On error, clear data so the UI reflects that no real data is available
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
    window.location.href = '/login';
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: 'thisMonth',
      labSection: 'all',
      shift: 'all',
      hospitalUnit: 'all',
      search: ''
    });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Shift', 'Lab Number', 'Unit', 'Lab Section', 'Test Name', 'Time In', 'Urgency', 'Time Received', 'TAT (min)', 'Time Expected', 'Progress', 'Time Out'];
    const rows = data.map((r) => [
      r.date,
      r.shift,
      r.labNumber,
      r.unit,
      r.labSection,
      r.testName,
      r.timeIn,
      r.urgency,
      r.timeReceived,
      r.tat,
      r.timeExpected,
      r.progress,
      r.timeOut,
    ]);
    downloadCSV([headers, ...rows], `Tracker-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`table-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
        <div className="header-wrapper">
          <Header
            title="Nakasero Hospital Laboratory"
            pageTitle="Tracker Table"
            onLogout={handleLogout}
            onResetFilters={handleResetFilters}
            showResetFilters={true}
            menuItems={[
              { label: 'Export CSV', href: '#', icon: 'fas fa-file-csv', onClick: handleExportCSV },
              { label: 'Admin Panel', href: '/admin', icon: 'fas fa-cog' },
              { label: 'Reception Table', href: '/reception', icon: 'fas fa-table' },
              { label: 'Progress Table', href: '/progress', icon: 'fas fa-chart-bar' },
              { label: 'Performance Table', href: '/performance', icon: 'fas fa-chart-line' },
              { label: 'Meta Table', href: '/meta', icon: 'fas fa-database' },
              { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' }
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
              showStatusFilter={false}
            />
          </div>
        </div>
        <div className="table-search-bar">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search lab number, test name, invoice..."
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
          showStatusFilter={false}
        />
      </div>

      <main className={`table-page-main ${filtersOpen ? 'filters-expanded' : ''}`}>
        {isLoading ? (
          <Loader isLoading={true} />
        ) : (
          <section className="card">
            <TrackerTable
              data={data}
              onLabNumberDoubleClick={(labNumber) => setTestsDialogLabNo(labNumber)}
              isLoading={isLoading}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
            />
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

export default Tracker;