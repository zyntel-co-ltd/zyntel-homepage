// frontend/src/components/tables/TrackerTable.tsx
import React from 'react';
import { EmptyTableMessage } from '@/components/shared';
import { formatTimeWithAMPM } from '@/constants/metaOptions';
import { formatDuration } from '@/utils/formatDuration';

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
  timeOutRaw?: string;
  timeExpectedRaw?: string;
}

interface TrackerTableProps {
  data: TrackerRecord[];
  onLabNumberDoubleClick?: (labNumber: string) => void;
  hasSearch?: boolean;
  isLoading?: boolean;
}

const TrackerTable: React.FC<TrackerTableProps> = ({ data, onLabNumberDoubleClick, hasSearch = false, isLoading = false }) => {
  const calculateProgress = (timeExpected: string, timeOut?: string) => {
    const now = new Date();
    const hasTimeOut = timeOut && timeOut !== 'N/A' && timeOut !== null && timeOut !== undefined;
    const timeOutDate = hasTimeOut ? new Date(timeOut) : null;
    const isTimeOutValid = timeOutDate && !isNaN(timeOutDate.getTime());
    const isTimeOutInPast = isTimeOutValid && timeOutDate! <= now;

    const hasTimeExpected = timeExpected && timeExpected !== 'N/A' && timeExpected !== null && timeExpected !== undefined;
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
      } else {
        return { text: 'Due now', cssClass: 'progress-pending' };
      }
    }
    return { text: 'No ETA', cssClass: 'progress-pending' };
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
              <td colSpan={13} className="text-center" style={{ padding: 0, border: 'none', verticalAlign: 'middle' }}>
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
              <td>{formatTimeWithAMPM(row.timeIn)}</td>
              <td>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(row.urgency)}`}>
                  {row.urgency.charAt(0).toUpperCase() + row.urgency.slice(1)}
                </span>
              </td>
              <td>{row.timeReceived ? formatTimeWithAMPM(row.timeReceived) : '-'}</td>
              <td>
                <span className={`px-2 py-1 rounded-full ${row.tat > 120 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {formatDuration(row.tat)}
                </span>
              </td>
              <td>{row.timeExpected ? formatTimeWithAMPM(row.timeExpected) : '-'}</td>
              <td className={(() => {
                const p = calculateProgress(row.timeExpectedRaw || row.timeExpected || '', row.timeOutRaw || row.timeOut);
                return p.cssClass;
              })()}>
                {calculateProgress(row.timeExpectedRaw || row.timeExpected || '', row.timeOutRaw || row.timeOut).text}
              </td>
              <td>{row.timeOut ? formatTimeWithAMPM(row.timeOut) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackerTable;