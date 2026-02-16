// frontend/src/pages/LRIDS.tsx
import React, { useState, useEffect } from 'react';

interface LRIDSData {
  labNo: string;
  timeIn: string;
  progress: 'Pending' | 'In Progress' | 'Ready';
}

const LRIDS: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LRIDSData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh data every 30 seconds
    const dataInterval = setInterval(fetchData, 30000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  const fetchData = async () => {
    try {
      // LRIDS is a public endpoint - NO AUTH REQUIRED
      const response = await fetch('/api/lrids');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (error) {
      console.error('Error fetching LRIDS data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      // Set empty array on error - this is a public display, show empty state
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'Ready':
        return '#4CAF50';
      case 'In Progress':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getProgressIcon = (progress: string) => {
    switch (progress) {
      case 'Ready':
        return 'fa-check-circle';
      case 'In Progress':
        return 'fa-spinner fa-spin';
      default:
        return 'fa-clock';
    }
  };

  return (
    <div className="lrids min-h-screen">
      <header>
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <img src="/images/logo-nakasero.png" alt="logo" />
            </div>
            <h1>NHL Laboratory Dashboard</h1>
          </div>
          <div className="page">
            <span>Live Results & IDS</span>
          </div>
        </div>
      </header>

      <div className="main-search-container">
        <div className="current-date-time">
          <div>
            <i className="fas fa-calendar mr-2"></i>
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div>
            <i className="fas fa-clock mr-2"></i>
            {currentTime.toLocaleTimeString('en-US')}
          </div>
        </div>
      </div>

      <main>
        {isLoading ? (
          <div className="loader">
            <div className="one"></div>
            <div className="two"></div>
            <div className="three"></div>
            <div className="four"></div>
          </div>
        ) : (
          <section className="card">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ color: '#00f0ff', fontSize: '1.5rem', marginBottom: '10px' }}>
                <i className="fas fa-heartbeat mr-2"></i>
                Laboratory Results Information Display System
              </h2>
              <p style={{ color: '#00f0ff', fontSize: '0.9rem' }}>
                Auto-refreshing every 30 seconds | Showing today's results
              </p>
            </div>

            {error && (
              <div style={{
                padding: '15px',
                margin: '20px 0',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid #f44336',
                borderRadius: '5px',
                color: '#f44336',
                textAlign: 'center'
              }}>
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {error}
              </div>
            )}

            <div className="table-container">
              <table className="neon-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>
                      <i className="fas fa-flask mr-2"></i>
                      Lab Number
                    </th>
                    <th style={{ width: '30%' }}>
                      <i className="fas fa-clock mr-2"></i>
                      Time In
                    </th>
                    <th style={{ width: '40%' }}>
                      <i className="fas fa-tasks mr-2"></i>
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px' }}>
                        <i className="fas fa-inbox" style={{ fontSize: '3rem', color: '#00f0ff', marginBottom: '15px', display: 'block' }}></i>
                        <p style={{ color: '#00f0ff', fontSize: '1.1rem' }}>
                          No test results available at the moment
                        </p>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '10px' }}>
                          Results will appear here as they become ready
                        </p>
                      </td>
                    </tr>
                  ) : (
                    data.map((row, index) => (
                      <tr key={index}>
                        <td style={{ 
                          fontWeight: 'bold', 
                          fontSize: '1.2rem',
                          fontFamily: 'monospace'
                        }}>
                          {row.labNo}
                        </td>
                        <td style={{ fontSize: '1.1rem' }}>
                          {row.timeIn}
                        </td>
                        <td>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                          }}>
                            <i 
                              className={`fas ${getProgressIcon(row.progress)}`} 
                              style={{ 
                                color: getProgressColor(row.progress),
                                fontSize: '1.5rem'
                              }}
                            ></i>
                            <span style={{
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              color: getProgressColor(row.progress)
                            }}>
                              {row.progress}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {data.length > 0 && (
              <div style={{
                marginTop: '20px',
                textAlign: 'center',
                color: '#00f0ff',
                fontSize: '0.9rem'
              }}>
                <i className="fas fa-info-circle mr-2"></i>
                Showing {data.length} result{data.length !== 1 ? 's' : ''}
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

export default LRIDS;