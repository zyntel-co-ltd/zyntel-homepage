// frontend/src/components/tables/PerformanceTable.tsx
import React from 'react';
import { formatDateTimeWithAMPM } from '@/constants/metaOptions';

export interface PerformanceRecord {
  date?: string;
  Shift?: string;
  lab_number?: string;
  Hospital_Unit?: string;
  time_in?: string;
  daily_tat?: number;
  request_time_expected?: string;
  request_time_out?: string;
  request_delay_status?: string;
  request_time_range?: string;
}

interface PerformanceTableProps {
  data: PerformanceRecord[];
  onLabNumberDoubleClick?: (labNumber: string) => void;
  isLoading?: boolean;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({ data, onLabNumberDoubleClick, isLoading = false }) => {
  const getDelayStatusClass = (status: string) => {
    if (status === 'On Time' || status === 'Swift') {
      return 'status-on-time';
    } else if (status === 'Delayed for less than 15 minutes' || status === '<15min') {
      return 'status-delayed-less-15';
    } else if (status === 'Over Delayed') {
      return 'status-over-delayed';
    }
    return 'status-not-uploaded';
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="neon-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Time In</th>
              <th>Daily TAT <span className="subtext">(minutes)</span></th>
              <th>Time Expected</th>
              <th>Time Out</th>
              <th>Delay Status</th>
              <th>Time Range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={11} className="text-center">
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
              <th>ID</th>
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Time In</th>
              <th>Daily TAT <span className="subtext">(minutes)</span></th>
              <th>Time Expected</th>
              <th>Time Out</th>
              <th>Delay Status</th>
              <th>Time Range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={11} className="text-center">
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
            <th>ID</th>
            <th>Date</th>
            <th>Shift</th>
            <th className="lab-number-cell">Lab Number</th>
            <th>Unit</th>
            <th>Time In</th>
            <th>Daily TAT <span className="subtext">(minutes)</span></th>
            <th>Time Expected</th>
            <th>Time Out</th>
            <th>Delay Status</th>
            <th>Time Range</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            return (
              <tr key={index}>
                <td className="text-center text-gray-600 font-medium">{index + 1}</td>
                <td>{row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}</td>
                <td>{row.Shift || 'N/A'}</td>
                <td
                className="lab-number-cell lab-number-cell-dbl"
                onDoubleClick={() => onLabNumberDoubleClick?.(row.lab_number || '')}
                title={onLabNumberDoubleClick ? 'Double-click to view all tests' : undefined}
              >
                {row.lab_number || 'N/A'}
              </td>
                <td>{row.Hospital_Unit || 'N/A'}</td>
                <td>{row.time_in ? formatDateTimeWithAMPM(row.time_in) : 'N/A'}</td>
                <td>{row.daily_tat || 'N/A'}</td>
                <td>{row.request_time_expected ? formatDateTimeWithAMPM(row.request_time_expected) : 'N/A'}</td>
                <td>{row.request_time_out ? formatDateTimeWithAMPM(row.request_time_out) : 'N/A'}</td>
                <td className={getDelayStatusClass(row.request_delay_status || '')}>{row.request_delay_status || 'N/A'}</td>
                <td className={getDelayStatusClass(row.request_time_range || '')}>{row.request_time_range || 'N/A'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PerformanceTable;