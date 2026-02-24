// frontend/src/components/tables/LRIDSTable.tsx
import React, { useEffect, useState } from 'react';
import { formatDateTimeWithAMPM } from '@/constants/metaOptions';

export interface LRIDSRecord {
  id: number;
  timestamp: string;
  labNumber: string;
  patientName: string;
  testName: string;
  status: 'received' | 'processing' | 'completed' | 'cancelled';
  labSection: string;
  technician: string;
  updatedAt: string;
}

interface LRIDSTableProps {
  data: LRIDSRecord[];
  isLoading?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const LRIDSTable: React.FC<LRIDSTableProps> = ({
  data,
  isLoading = false,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'received':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'fas fa-check-circle text-green-500';
      case 'processing':
        return 'fas fa-spinner text-blue-500 fa-spin';
      case 'received':
        return 'fas fa-inbox text-yellow-500';
      case 'cancelled':
        return 'fas fa-times-circle text-red-500';
      default:
        return 'fas fa-question-circle text-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const past = new Date(timestamp);
    const now = currentTime;
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-main-color">Live Results &amp; IDS</h2>
          <div className="text-sm text-gray-600">
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} | Last updated: {currentTime.toLocaleTimeString()}
          </div>
        </div>
        <table className="neon-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Patient Name</th>
              <th>Test Name</th>
              <th>Status</th>
              <th>Lab Section</th>
              <th>Technician</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} className="text-center">
                <div className="loader-inline">
                  <div className="one"></div>
                  <div className="two"></div>
                  <div className="three"></div>
                  <div className="four"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-container">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-main-color">Live Results &amp; IDS</h2>
          <div className="text-sm text-gray-600">
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} | Last updated: {currentTime.toLocaleTimeString()}
          </div>
        </div>
        <table className="neon-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Patient Name</th>
              <th>Test Name</th>
              <th>Status</th>
              <th>Lab Section</th>
              <th>Technician</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} className="text-center">
                <div className="text-center py-8">
                  <i className="fas fa-database text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-600">No live data available</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-main-color">Live Results &amp; IDS</h2>
        <div className="text-sm text-gray-600">
          Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} | Last updated: {currentTime.toLocaleTimeString()}
        </div>
      </div>
      
      <table className="neon-table lrids-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th className="lab-number-cell">Lab Number</th>
            <th>Patient Name</th>
            <th>Test Name</th>
            <th>Status</th>
            <th>Lab Section</th>
            <th>Technician</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="hover-row">
              <td>{formatDateTimeWithAMPM(row.timestamp)}</td>
              <td className="lab-number-cell font-mono font-bold">{row.labNumber}</td>
              <td>{row.patientName}</td>
              <td>{row.testName}</td>
              <td>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(row.status)}></i>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(row.status)}`}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </span>
                </div>
              </td>
              <td>{row.labSection}</td>
              <td>{row.technician}</td>
              <td>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{formatTimeAgo(row.updatedAt)}</span>
                  <i className="fas fa-history text-gray-400"></i>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LRIDSTable;