// frontend/src/components/tables/ProgressTable.tsx
import React from 'react';
import { formatDateTimeWithAMPM } from '@/constants/metaOptions';
import { formatDuration } from '@/utils/formatDuration';

export interface ProgressRecord {
  date?: string;
  shift?: string;
  lab_number?: string;
  Hospital_Unit?: string;
  time_in?: string;
  daily_tat?: number;
  request_time_expected?: string;
  request_time_out?: string;
  request_delay_status?: string;
  request_time_range?: string;
}

/** Match Flask TAT categorizations - same as PerformanceTable */
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

const formatTimeRange = (val: string | number | null | undefined) => {
  if (val == null || val === '') return 'Not Uploaded';
  if (typeof val === 'number' && isNaN(val)) return 'Not Uploaded';
  return String(val);
};

interface ProgressTableProps {
  data: ProgressRecord[];
  isLoading?: boolean;
}

const ProgressTable: React.FC<ProgressTableProps> = ({ data, isLoading = false }) => {
  const calculateProgress = (timeExpected: string, timeOut?: string) => {
    const now = new Date();
    
    // Check if timeOut exists and is valid
    const hasTimeOut = timeOut && timeOut !== 'N/A' && timeOut !== null && timeOut !== undefined;
    const timeOutDate = hasTimeOut ? new Date(timeOut) : null;
    const isTimeOutValid = timeOutDate && !isNaN(timeOutDate.getTime());
    const isTimeOutInPast = isTimeOutValid && timeOutDate! <= now;

    // Check if timeExpected exists and is valid
    const hasTimeExpected = timeExpected && timeExpected !== 'N/A' && timeExpected !== null && timeExpected !== undefined;
    const timeExpectedDate = hasTimeExpected ? new Date(timeExpected) : null;
    const isTimeExpectedValid = timeExpectedDate && !isNaN(timeExpectedDate.getTime());
    const isTimeExpectedInPast = isTimeExpectedValid && timeExpectedDate! <= now;

    // ACTUALLY COMPLETED
    if (isTimeOutValid && isTimeOutInPast) {
      return { text: 'Completed', cssClass: 'progress-complete-actual' };
    }
    
    // DELAYED
    if (isTimeExpectedValid && isTimeExpectedInPast && !isTimeOutValid) {
      return { text: 'Delayed', cssClass: 'progress-overdue' };
    }
    
    // PENDING with time remaining
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
              <th>Time In</th>
              <th>Daily TAT</th>
              <th>Time Expected</th>
              <th>Time Out</th>
              <th>Progress</th>
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
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Time In</th>
              <th>Daily TAT</th>
              <th>Time Expected</th>
              <th>Time Out</th>
              <th>Progress</th>
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
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Time In</th>
              <th>Daily TAT</th>
              <th>Time Expected</th>
              <th>Time Out</th>
              <th>Progress</th>
              <th>Delay Status</th>
              <th>Time Range</th>
            </tr>
          </thead>
        <tbody>
          {data.map((row, index) => {
            const dateIn = row.date ? new Date(row.date) : new Date();
            const formattedDate = dateIn.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            // Calculate progress using Flask's logic
            const progress = calculateProgress(row.request_time_expected || '', row.request_time_out);
            
            return (
              <tr key={index}>
                <td>{formattedDate}</td>
                <td>{row.shift || 'N/A'}</td>
                <td className="lab-number-cell">{row.lab_number || 'N/A'}</td>
                <td>{row.Hospital_Unit || 'N/A'}</td>
                <td>{row.time_in ? formatDateTimeWithAMPM(row.time_in) : 'N/A'}</td>
                <td>{formatDuration(row.daily_tat)}</td>
                <td>{row.request_time_expected ? formatDateTimeWithAMPM(row.request_time_expected) : 'N/A'}</td>
                <td>{row.request_time_out ? formatDateTimeWithAMPM(row.request_time_out) : 'N/A'}</td>
                <td className={progress.cssClass}>{progress.text}</td>
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

export default ProgressTable;