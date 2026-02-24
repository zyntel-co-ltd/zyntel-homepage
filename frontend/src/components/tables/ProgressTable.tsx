// frontend/src/components/tables/ProgressTable.tsx
import React from 'react';
import { formatDateTimeWithAMPM } from '@/constants/metaOptions';

export interface ProgressRecord {
  date?: string;
  shift?: string;
  lab_number?: string;
  Hospital_Unit?: string;
  time_in?: string;
  daily_tat?: number;
  request_time_expected?: string;
  request_time_out?: string;
}

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
              <th>Daily TAT <span className="subtext">(minutes)</span></th>
              <th>Time Expected</th>
              <th>Progress</th>
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
        <table className="neon-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Shift</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Unit</th>
              <th>Time In</th>
              <th>Daily TAT <span className="subtext">(minutes)</span></th>
              <th>Time Expected</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} className="text-center">
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
            <th>Daily TAT <span className="subtext">(minutes)</span></th>
            <th>Time Expected</th>
            <th>Progress</th>
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
                <td>{row.daily_tat || 'N/A'}</td>
                <td>{row.request_time_expected ? formatDateTimeWithAMPM(row.request_time_expected) : 'N/A'}</td>
                <td className={progress.cssClass}>{progress.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProgressTable;