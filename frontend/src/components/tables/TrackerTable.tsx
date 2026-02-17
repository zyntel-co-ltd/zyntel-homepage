// frontend/src/components/tables/TrackerTable.tsx
import React from 'react';

export interface TrackerRecord {
  id: number;
  date: string;
  shift: string;
  labNumber: string;
  unit: string;
  labSection: string;
  testName: string;
  timeIn: string;
  urgency: 'routine' | 'urgent';
  timeReceived: string;
  tat: number;
  timeExpected: string;
  progress: 'pending' | 'in-progress' | 'completed';
  timeOut: string;
}

interface TrackerTableProps {
  data: TrackerRecord[];
  onLabNumberDoubleClick?: (labNumber: string) => void;
  isLoading?: boolean;
}

const TrackerTable: React.FC<TrackerTableProps> = ({ data, onLabNumberDoubleClick, isLoading = false }) => {
  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressIcon = (progress: string) => {
    switch (progress) {
      case 'completed':
        return 'fas fa-check-circle text-green-500';
      case 'in-progress':
        return 'fas fa-spinner text-yellow-500 fa-spin';
      default:
        return 'fas fa-clock text-gray-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    return urgency === 'urgent' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-blue-100 text-blue-800';
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="neon-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Lab Section</th>
              <th>Test Name</th>
              <th>Time In</th>
              <th>Urgency</th>
              <th>Time Received</th>
              <th>TAT <span className="subtext">(minutes)</span></th>
              <th>Time Expected</th>
              <th>Progress</th>
              <th>Time Out</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={13} className="text-center">
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
        <table className="neon-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Lab Section</th>
              <th>Test Name</th>
              <th>Time In</th>
              <th>Urgency</th>
              <th>Time Received</th>
              <th>TAT <span className="subtext">(minutes)</span></th>
              <th>Time Expected</th>
              <th>Progress</th>
              <th>Time Out</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={13} className="text-center">
                No data available
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="neon-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Shift</th>
            <th className="lab-number-cell">Lab Number</th>
            <th>Unit</th>
            <th>Lab Section</th>
            <th>Test Name</th>
            <th>Time In</th>
            <th>Urgency</th>
            <th>Time Received</th>
            <th>TAT <span className="subtext">(minutes)</span></th>
            <th>Time Expected</th>
            <th>Progress</th>
            <th>Time Out</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.date).toLocaleDateString()}</td>
              <td>{row.shift}</td>
              <td
                className="lab-number-cell lab-number-cell-dbl"
                onDoubleClick={() => onLabNumberDoubleClick?.(row.labNumber)}
                title={onLabNumberDoubleClick ? 'Double-click to view all tests' : undefined}
              >
                {row.labNumber}
              </td>
              <td>{row.unit}</td>
              <td>{row.labSection}</td>
              <td>{row.testName}</td>
              <td>{row.timeIn}</td>
              <td>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(row.urgency)}`}>
                  {row.urgency.charAt(0).toUpperCase() + row.urgency.slice(1)}
                </span>
              </td>
              <td>{row.timeReceived || '-'}</td>
              <td>
                <span className={`px-2 py-1 rounded-full ${row.tat > 120 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {row.tat} min
                </span>
              </td>
              <td>{row.timeExpected}</td>
              <td>
                <div className="flex items-center space-x-2">
                  <i className={getProgressIcon(row.progress)}></i>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProgressColor(row.progress)}`}>
                    {row.progress.charAt(0).toUpperCase() + row.progress.slice(1)}
                  </span>
                </div>
              </td>
              <td>{row.timeOut || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackerTable;