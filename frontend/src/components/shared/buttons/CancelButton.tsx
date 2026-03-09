import React from 'react';

interface CancelButtonProps {
  isCancelled: boolean;
  onClick: () => void;
  disabled?: boolean;
  onUncancelClick?: () => void;
  showUncancel?: boolean;
}

const CancelButton: React.FC<CancelButtonProps> = ({ isCancelled, onClick, disabled = false, onUncancelClick, showUncancel = false }) => {
  if (isCancelled) {
    if (showUncancel && onUncancelClick) {
      return (
        <div className="button-container">
          <button
            className="uncancel-btn"
            onClick={onUncancelClick}
            style={{
              padding: '4px 10px',
              fontSize: '0.8rem',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <i className="fas fa-undo mr-1"></i>
            Uncancel
          </button>
        </div>
      );
    }
    return (
      <div className="button-container">
        <span className="cancel-badge" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#999', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          Cancelled
        </span>
      </div>
    );
  }
  return (
    <div className="button-container">
      <button
        className="cancel-btn"
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '4px 10px',
          fontSize: '0.85rem',
          backgroundColor: '#9ca3af',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <i className="fas fa-times mr-1"></i>
        Cancel
      </button>
    </div>
  );
};

export default CancelButton;
