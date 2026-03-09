// frontend/src/components/tables/PerformanceTable.tsx
import React from 'react';
import { EmptyTableMessage } from '@/components/shared';
import { formatDateTimeWithAMPM } from '@/constants/metaOptions';
import { formatDuration } from '@/utils/formatDuration';

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
  hasSearch?: boolean;
  isLoading?: boolean;
}

const PerformanceTable: React.FC<PerformanceTableProps> = ({ data, onLabNumberDoubleClick, hasSearch = false, isLoading = false }) => {
  /** Match Flask TAT categorizations: On Time, Swift, Delayed for <15 minutes, Over Delayed, Not Uploaded */
  const getDelayStatusClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('on time') || s.includes('ontime') || s.includes('swift')) return 'status-on-time';
    if (s.includes('<15') || s.includes('less than 15') || s.includes('delayed for less')) return 'status-delayed-less-15';
    if (s.includes('over delayed')) return 'status-over-delayed';
    if (s.includes('delayed')) return 'status-delayed';
    return 'status-not-uploaded';
  };

  const formatDelayStatus = (status: string) => {
    const s = (status || '').trim();
    if (!s) return 'Not Uploaded';
    const lower = s.toLowerCase();
    if (lower.includes('on time') || lower === 'ontime') return 'On Time';
    if (lower.includes('swift')) return 'Swift';
    if (lower.includes('<15') || lower.includes('less than 15') || lower.includes('delayed for less')) return 'Delayed for <15 minutes';
    if (lower.includes('over delayed')) return 'Over Delayed';
    if (lower.includes('delayed')) return 'Delayed';
    return s;
  };

  /** Time range from Flask: "X hrs Y mins" or "Not Uploaded" - display as-is */
  const formatTimeRange = (val: string | number | null | undefined) => {
    if (val == null || val === '') return 'Not Uploaded';
    if (typeof val === 'number' && isNaN(val)) return 'Not Uploaded';
    return String(val);
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
              <th>Daily TAT</th>
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
              <th>Daily TAT</th>
              <th>Time Expected</th>
              <th>Time Out</th>
              <th>Delay Status</th>
              <th>Time Range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={11} className="text-center" style={{ padding: 0, border: 'none', verticalAlign: 'middle' }}>
                <EmptyTableMessage hasSearch={hasSearch} />
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
            <th>Daily TAT</th>
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
                <td>{formatDuration(row.daily_tat)}</td>
                <td>{row.request_time_expected ? formatDateTimeWithAMPM(row.request_time_expected) : 'N/A'}</td>
                <td>{row.request_time_out ? formatDateTimeWithAMPM(row.request_time_out) : 'N/A'}</td>
                <td className={getDelayStatusClass(row.request_delay_status || '')}>{formatDelayStatus(row.request_delay_status || '')}</td>
                <td>{formatTimeRange(row.request_time_range)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PerformanceTable;