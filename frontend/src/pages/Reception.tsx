// frontend/src/pages/Reception.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navbar, Filters, Loader, Pagination, TestsForLabDialog, Footer } from '@/components/shared';
import { formatTimeWithAMPM } from '@/constants/metaOptions';
import { ReceptionTable, type ReceptionRecord } from '@/components/tables';
import { downloadCSV } from '@/utils/exportUtils';

const Reception: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'thisMonth',
    labSection: 'all',
    shift: 'all',
    laboratory: 'all',
    search: ''
  });
  
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ReceptionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const rowsPerPage = 50;
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [testsDialogLabNo, setTestsDialogLabNo] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [filters, currentPage]);

  useEffect(() => {
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
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

      const response = await fetch(`/api/reception?${params.toString()}`, {
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
      const raw = Array.isArray(result) ? result : (result?.data ?? []);
      const transformedData: ReceptionRecord[] = raw.map((item: any) => ({
        id: item.id,
        date: item.encounter_date,
        labNumber: item.lab_no,
        shift: item.shift,
        unit: item.laboratory,
        labSection: item.lab_section_at_test,
        testName: item.test_name,
        urgency: item.is_urgent === true ? 'urgent' : 'routine',
        received: item.is_received || false,
        result: item.is_resulted || false,
        timeIn: item.time_in ? formatTimeWithAMPM(item.time_in) : ''
      }));
      setData(transformedData);
      if (result?.totalRecords != null) {
        setTotalRecords(result.totalRecords);
        setTotalPages(result.totalPages ?? 1);
      } else {
        setTotalRecords(transformedData.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching reception data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const stateKey = key === 'hospitalUnit' ? 'laboratory' : key;
    setFilters(prev => ({ ...prev, [stateKey]: value }));
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

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      period: 'thisMonth',
      labSection: 'all',
      shift: 'all',
      laboratory: 'all',
      search: ''
    });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Lab Number', 'Shift', 'Unit', 'Lab Section', 'Test Name', 'Urgency', 'Received', 'Result', 'Time In'];
    const rows = data.map((r) => [r.date, r.labNumber, r.shift, r.unit, r.labSection, r.testName, r.urgency, r.received ? 'Yes' : 'No', r.result ? 'Yes' : 'No', r.timeIn ?? '']);
    downloadCSV([headers, ...rows], `Reception-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleSelectRow = (id: number) => {
    setSelectedTests(prev =>
      prev.includes(id)
        ? prev.filter(testId => testId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTests(data.map(item => item.id));
    } else {
      setSelectedTests([]);
    }
  };

  const handleUrgentClick = async (id: number, currentUrgency: 'routine' | 'urgent') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reception/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isUrgent: currentUrgency === 'routine'
        })
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating urgency:', error);
    }
  };

  const handleReceiveClick = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reception/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isReceived: true
        })
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error marking as received:', error);
    }
  };

  const handleResultClick = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reception/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isResulted: true
        })
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error marking as resulted:', error);
    }
  };

  const handleMultiUrgent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reception/bulk-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testIds: selectedTests,
          action: 'urgent'
        })
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (response.ok) {
        setSelectedTests([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error bulk updating urgency:', error);
    }
  };

  const handleMultiReceive = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reception/bulk-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testIds: selectedTests,
          action: 'receive'
        })
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (response.ok) {
        setSelectedTests([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error bulk receiving:', error);
    }
  };

  const handleMultiResult = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reception/bulk-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testIds: selectedTests,
          action: 'result'
        })
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (response.ok) {
        setSelectedTests([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error bulk resulting:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background-color">
      <div className={`table-page-top ${!filtersOpen ? 'collapsed' : ''}`}>
        <div className="header-wrapper">
          <Header
            title="Nakasero Hospital Laboratory"
            pageTitle="Reception Table"
            onLogout={handleLogout}
            onResetFilters={handleResetFilters}
            showResetFilters={true}
            menuItems={[
              { label: 'Export CSV', href: '#', icon: 'fas fa-file-csv', onClick: handleExportCSV },
              { label: 'Reception', href: '/reception', icon: 'fas fa-table' },
              { label: 'Progress', href: '/progress', icon: 'fas fa-chart-bar' },
              { label: 'Performance', href: '/performance', icon: 'fas fa-chart-line' },
              { label: 'Meta', href: '/meta', icon: 'fas fa-database' },
              { label: 'Tracker', href: '/tracker', icon: 'fas fa-list' },
              { label: 'Dashboard', href: '/dashboard', icon: 'fas fa-home' },
            ]}
          />
          <Navbar type="table" />
        </div>
        <button
          type="button"
          className="table-page-toggle"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
        >
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
          <div className="search-actions-row">
            <div className="multi-select-container">
            <button 
              className="urgent-btn"
              id="multi-urgent-btn"
              onClick={handleMultiUrgent}
              disabled={selectedTests.length === 0}
              title={selectedTests.length === 0 ? 'Select rows first' : ''}
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Mark as Urgent
            </button>
            <button 
              className="receive-btn"
              id="multi-receive-btn"
              onClick={handleMultiReceive}
              disabled={selectedTests.length === 0}
              title={selectedTests.length === 0 ? 'Select rows first' : ''}
            >
              <i className="fas fa-check mr-2"></i>
              Receive Selected
            </button>
            <button 
              className="result-btn"
              id="multi-result-btn"
              onClick={handleMultiResult}
              disabled={selectedTests.length === 0}
              title={selectedTests.length === 0 ? 'Select rows first' : ''}
            >
              <i className="fas fa-clipboard-check mr-2"></i>
              Result Selected
            </button>
          </div>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search lab number, test name, section, unit..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <i className="fas fa-search search-icon"></i>
          </div>
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
            <br />
            <button 
              onClick={fetchData}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        {isLoading ? (
          <Loader isLoading={true} />
        ) : (
          <>
            <section className="card">
              <ReceptionTable
                data={data}
                selectedIds={selectedTests}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                onUrgentClick={handleUrgentClick}
                onReceiveClick={handleReceiveClick}
                onResultClick={handleResultClick}
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

export default Reception;