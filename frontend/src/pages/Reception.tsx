// frontend/src/pages/Reception.tsx
import React, { useState, useEffect } from 'react';
import { Header, Navbar, Filters, Loader } from '@/components/shared';
import { ReceptionTable, type ReceptionRecord } from '@/components/tables';

const Reception: React.FC = () => {
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'custom',
    labSection: 'all',
    shift: 'all',
    laboratory: 'all',
    search: ''
  });
  
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ReceptionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

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

      console.log('Fetching reception data with params:', params.toString());

      const response = await fetch(`/api/reception?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Reception data received:', result);
      
      // Transform backend data to match frontend interface
      const transformedData: ReceptionRecord[] = result.map((item: any) => ({
        id: item.id,
        date: item.encounter_date,
        labNumber: item.lab_no,
        shift: item.shift,
        unit: item.laboratory,
        labSection: item.lab_section_at_test,
        testName: item.test_name,
        urgency: item.is_urgent ? 'urgent' : 'routine',
        received: item.is_received || false,
        result: item.is_resulted || false,
        timeIn: item.time_in ? new Date(item.time_in).toLocaleTimeString() : ''
      }));
      
      setData(transformedData);
    } catch (error) {
      console.error('Error fetching reception data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setData([]); // Set empty array on error instead of mock data
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      period: 'custom',
      labSection: 'all',
      shift: 'all',
      laboratory: 'all',
      search: ''
    });
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

      if (response.ok) {
        // Refresh data
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
      <Header
        title="Nakasero Hospital Laboratory"
        pageTitle="Reception Table"
        onLogout={handleLogout}
        onResetFilters={handleResetFilters}
        showResetFilters={true}
      />

      <Navbar type="table" />

      <div className="main-search-container">
        <div className="search-actions-row">
          <div className={`multi-select-container ${selectedTests.length === 0 ? 'hidden' : ''}`}>
            <button 
              className="urgent-btn"
              id="multi-urgent-btn"
              onClick={handleMultiUrgent}
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Mark as Urgent ({selectedTests.length})
            </button>
            <button 
              className="receive-btn"
              id="multi-receive-btn"
              onClick={handleMultiReceive}
            >
              <i className="fas fa-check mr-2"></i>
              Receive Selected ({selectedTests.length})
            </button>
            <button 
              className="result-btn"
              id="multi-result-btn"
              onClick={handleMultiResult}
            >
              <i className="fas fa-clipboard-check mr-2"></i>
              Result Selected ({selectedTests.length})
            </button>
          </div>
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
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          showPeriodFilter={true}
          showLabSectionFilter={true}
          showShiftFilter={true}
          showLaboratoryFilter={true}
        />
      </div>

      <main>
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
          <section className="card">
            <ReceptionTable
              data={data}
              selectedIds={selectedTests}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              onUrgentClick={handleUrgentClick}
              onReceiveClick={handleReceiveClick}
              onResultClick={handleResultClick}
              isLoading={isLoading}
            />
          </section>
        )}
      </main>

      <div className="notice">
        <p>Sorry! You need a wider screen to view the table.</p>
      </div>

      <footer>
        <p>&copy;2025 Zyntel</p>
        <div className="zyntel">
          <img src="/images/zyntel_no_background.png" alt="logo" />
        </div>
      </footer>
    </div>
  );
};

export default Reception;