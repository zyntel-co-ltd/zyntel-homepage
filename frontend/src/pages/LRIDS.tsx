// frontend/src/pages/LRIDS.tsx
import React, { useState, useEffect } from 'react';

interface LRIDSData {
  lab_number?: string;
  lab_no?: string;
  time_in?: string;
  request_time_expected?: string;
  request_time_out?: string;
  time_out?: string;
}

const LRIDS: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LRIDSData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

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
      const response = await fetch('/api/progress?limit=100', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const lridsData = result.data || result;
      setData(Array.isArray(lridsData) ? lridsData : []);
    } catch (error) {
      console.error('Error fetching LRIDS data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (timeExpected: string, timeOut?: string) => {
    const now = new Date();
    
    const hasTimeOut = timeOut && timeOut !== 'N/A' && timeOut !== null;
    const timeOutDate = hasTimeOut ? new Date(timeOut) : null;
    const isTimeOutValid = timeOutDate && !isNaN(timeOutDate.getTime());
    const isTimeOutInPast = isTimeOutValid && timeOutDate! <= now;

    const hasTimeExpected = timeExpected && timeExpected !== 'N/A' && timeExpected !== null;
    const timeExpectedDate = hasTimeExpected ? new Date(timeExpected) : null;
    const isTimeExpectedValid = timeExpectedDate && !isNaN(timeExpectedDate.getTime());
    const isTimeExpectedInPast = isTimeExpectedValid && timeExpectedDate! <= now;

    if (isTimeOutValid && isTimeOutInPast) {
      return { text: 'Completed', cssClass: 'progress-complete-actual' };
    }
    
    if (isTimeExpectedValid && isTimeExpectedInPast && !isTimeOutValid) {
      return { text: 'Delayed', cssClass: 'progress-overdue' };
    }
    
    if (isTimeExpectedValid && !isTimeExpectedInPast) {
      const timeLeft = timeExpectedDate!.getTime() - now.getTime();
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

  return (
    <div className="min-h-screen bg-background-color lrids">
      <header>
        <div className="header-container header-container--lrids">
          <div className="header-left">
            <div className="logo">
              <img src="/images/logo-nakasero.png" alt="logo" />
            </div>
            <h1>Nakasero Hospital Laboratory</h1>
          </div>
          <div className="page page-table page--lrids">
            <span>Laboratory Report Information Display System - LRIDS</span>
          </div>
        </div>
        <div className="main-search-container">
          <div className="search-actions-row">
            <div className="current-date-time">
              <span id="currentDate" style={{ color: 'white', fontWeight: 'bold' }}>
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <span id="currentTime" style={{ color: 'white', fontWeight: 'bold', marginLeft: '20px' }}>
                {currentTime.toLocaleTimeString('en-US')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="card">
          <div className="table-container">
            <table id="lrids" className="neon-table">
              <thead>
                <tr>
                  <th className="lab-number-cell">Lab Number</th>
                  <th>Time In</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500">Loading data...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500">No data available</td>
                  </tr>
                ) : (
                  data.map((row, index) => {
                    const labNumber = row.lab_number || row.lab_no;
                    const timeIn = row.time_in;
                    const timeExpected = row.request_time_expected;
                    const timeOut = row.request_time_out || row.time_out;
                    
                    const progress = calculateProgress(timeExpected || '', timeOut);
                    return (
                      <tr key={index}>
                        <td className="lab-number-cell">{labNumber || 'N/A'}</td>
                        <td>{timeIn ? new Date(timeIn).toLocaleString() : 'N/A'}</td>
                        <td className={progress.cssClass}>{progress.text}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
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