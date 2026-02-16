// frontend/src/pages/Progress.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navbar, Filters, Loader } from '@/components/shared';

const Progress: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    period: 'custom',
    labSection: 'all',
    shift: 'all',
    laboratory: 'all',
    search: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

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
      setData(result);
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
      period: 'custom',
      labSection: 'all',
      shift: 'all',
      laboratory: 'all',
      search: ''
    });
  };

  return (
    <div className="min-h-screen bg-background-color">
      <Header
        title="Nakasero Hospital Laboratory"
        pageTitle="Progress Table"
        onLogout={handleLogout}
        onResetFilters={handleResetFilters}
        showResetFilters={true}
      />

      <Navbar type="table" />

      <div className="main-search-container">
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
                <table>
                  <thead>
                    <tr>
                      <th>Lab Number</th>
                      <th>Test Name</th>
                      <th>Status</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index}>
                        <td>{row.labNo}</td>
                        <td>{row.testName}</td>
                        <td>{row.status}</td>
                        <td>{row.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
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

export default Progress;