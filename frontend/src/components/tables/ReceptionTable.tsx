// frontend/src/components/tables/ReceptionTable.tsx
import React from 'react';
import { UrgentButton, ReceiveButton, ResultButton } from '@/components/shared';

export interface ReceptionRecord {
  id: number;
  date: string;
  labNumber: string;
  shift: string;
  unit: string;
  labSection: string;
  testName: string;
  urgency: 'routine' | 'urgent';
  received: boolean;
  result: boolean;
  timeIn?: string;
}

interface ReceptionTableProps {
  data: ReceptionRecord[];
  selectedIds: number[];
  onSelectRow: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onUrgentClick: (id: number, currentUrgency: 'routine' | 'urgent') => void;
  onReceiveClick: (id: number) => void;
  onResultClick: (id: number) => void;
  onLabNumberDoubleClick?: (labNumber: string) => void;
  isLoading?: boolean;
}

const ReceptionTable: React.FC<ReceptionTableProps> = ({
  data,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onUrgentClick,
  onReceiveClick,
  onResultClick,
  onLabNumberDoubleClick,
  isLoading = false
}) => {
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="neon-table">
          <thead>
            <tr>
              <th><input type="checkbox" disabled /></th>
              <th>Date</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Shift</th>
              <th>Unit</th>
              <th>Lab Section</th>
              <th>Test Name</th>
              <th className="text-center">Urgency</th>
              <th className="text-center">Receive</th>
              <th className="text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={10} className="text-center">
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
              <th><input type="checkbox" disabled /></th>
              <th>Date</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Shift</th>
              <th>Unit</th>
              <th>Lab Section</th>
              <th>Test Name</th>
              <th className="text-center">Urgency</th>
              <th className="text-center">Receive</th>
              <th className="text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={10} className="text-center">
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
            <th>
              <input
                type="checkbox"
                id="selectAll"
                className="form-checkbox h-4 w-4 text-blue-600"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
            </th>
            <th>Date</th>
            <th className="lab-number-cell">Lab Number</th>
            <th>Shift</th>
            <th>Unit</th>
            <th>Lab Section</th>
            <th>Test Name</th>
            <th className="text-center">Urgency</th>
            <th className="text-center">Receive</th>
            <th className="text-center">Result</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className={selectedIds.includes(row.id) ? 'selected-row' : ''}>
              <td>
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => onSelectRow(row.id)}
                />
              </td>
              <td>{new Date(row.date).toLocaleDateString()}</td>
              <td
                className="lab-number-cell lab-number-cell-dbl"
                onDoubleClick={() => onLabNumberDoubleClick?.(row.labNumber)}
                title={onLabNumberDoubleClick ? 'Double-click to view all tests' : undefined}
              >
                {row.labNumber}
              </td>
              <td>{row.shift}</td>
              <td>{row.unit}</td>
              <td>{row.labSection}</td>
              <td>{row.testName}</td>
              <td className="text-center">
                <UrgentButton
                  isUrgent={row.urgency === 'urgent'}
                  onClick={() => onUrgentClick(row.id, row.urgency)}
                />
              </td>
              <td className="text-center">
                <ReceiveButton
                  isReceived={row.received}
                  onClick={() => onReceiveClick(row.id)}
                  disabled={row.urgency === 'urgent' && !row.received}
                />
              </td>
              <td className="text-center">
                <ResultButton
                  hasResult={row.result}
                  onClick={() => onResultClick(row.id)}
                  disabled={!row.received}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReceptionTable;