import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="modal-content confirm-dialog-content">
        <div className="modal-header">
          <h3 id="confirm-dialog-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn--${variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
