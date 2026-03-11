// frontend/src/components/tables/ReceptionTable.tsx
import React from 'react';
import { UrgentButton, ReceiveButton, ResultButton, CancelButton, EmptyTableMessage } from '@/components/shared';

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
  cancelled?: boolean;
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
  onCancelClick?: (id: number) => void;
  onUncancelClick?: (id: number) => void;
  onLabNumberDoubleClick?: (labNumber: string) => void;
  hasSearch?: boolean;
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
  onCancelClick,
  onUncancelClick,
  onLabNumberDoubleClick,
  hasSearch = false,
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
            <th className="text-center">Cancel</th>
            <th className="text-center">Urgency</th>
            <th className="text-center">Receive</th>
            <th className="text-center">Result</th>
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
              <th><input type="checkbox" disabled /></th>
              <th>Date</th>
              <th className="lab-number-cell">Lab Number</th>
              <th>Shift</th>
              <th>Unit</th>
              <th>Lab Section</th>
              <th>Test Name</th>
            <th className="text-center">Cancel</th>
            <th className="text-center">Urgency</th>
            <th className="text-center">Receive</th>
            <th className="text-center">Result</th>
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
            <th className="text-center">Cancel</th>
            <th className="text-center">Urgency</th>
            <th className="text-center">Receive</th>
            <th className="text-center">Result</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className={`${selectedIds.includes(row.id) ? 'selected-row' : ''} ${row.cancelled ? 'reception-row-cancelled' : ''}`}>
              <td>
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => onSelectRow(row.id)}
                  disabled={row.cancelled}
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
                <CancelButton
                  isCancelled={row.cancelled ?? false}
                  onClick={() => onCancelClick?.(row.id)}
                  disabled={row.cancelled}
                  onUncancelClick={row.cancelled ? () => onUncancelClick?.(row.id) : undefined}
                  showUncancel={!!row.cancelled}
                />
              </td>
              <td className="text-center">
                <UrgentButton
                  isUrgent={row.urgency === 'urgent'}
                  onClick={() => onUrgentClick(row.id, row.urgency)}
                  disabled={row.cancelled}
                />
              </td>
              <td className="text-center">
                <ReceiveButton
                  isReceived={row.received}
                  onClick={() => onReceiveClick(row.id)}
                  disabled={(row.urgency === 'urgent' && !row.received) || row.cancelled}
                />
              </td>
              <td className="text-center">
                <ResultButton
                  hasResult={row.result}
                  onClick={() => onResultClick(row.id)}
                  disabled={!row.received || row.cancelled}
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