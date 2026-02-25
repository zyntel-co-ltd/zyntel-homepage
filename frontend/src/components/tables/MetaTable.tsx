// frontend/src/components/tables/MetaTable.tsx
import React from 'react';

export interface MetaRecord {
  id: number;
  testName: string;
  section: string;
  price: number;
  expectedTAT: number;
}

interface MetaTableProps {
  data: MetaRecord[];
  onEdit: (id: number) => void;
  onAdd: () => void;
  isLoading?: boolean;
  /** When false, edit button and Add New Test are hidden (technicians) */
  canEdit?: boolean;
}

const MetaTable: React.FC<MetaTableProps> = ({
  data,
  onEdit,
  onAdd,
  isLoading = false,
  canEdit = true
}) => {
  if (isLoading) {
    return (
      <div className="table-container">
        <div className="table-toolbar">
          <h2 className="table-title">Meta Data</h2>
          {canEdit && (
          <button className="meta-actions-button" onClick={onAdd}>
            <i className="fas fa-plus"></i> Add New Test
          </button>
          )}
        </div>
        <table className="neon-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Section</th>
              <th>Price (UGX)</th>
              <th>Expected TAT</th>
              {canEdit && <th className="text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={canEdit ? 5 : 4} className="text-center">
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

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <h2 className="table-title">Meta Data</h2>
        {canEdit && (
        <button className="meta-actions-button" onClick={onAdd}>
          <i className="fas fa-plus"></i> Add New Test
        </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="empty-state">
          <p>No tests found.</p>
        </div>
      ) : (
        <table className="neon-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Section</th>
              <th>Price (UGX)</th>
              <th>Expected TAT</th>
              {canEdit && <th className="text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td className="cell-strong">{row.testName}</td>
                <td>{row.section}</td>
                <td>{row.price.toLocaleString()}</td>
                <td>{row.expectedTAT} min</td>
                {canEdit && (
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => onEdit(row.id)}
                    className="action-button edit-button"
                    title="Edit"
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MetaTable;