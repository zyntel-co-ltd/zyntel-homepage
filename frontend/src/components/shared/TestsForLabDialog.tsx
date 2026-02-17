import React, { useState, useEffect } from 'react';

export interface TestForLab {
  id: number;
  test_name: string;
  lab_section_at_test: string | null;
  is_urgent: boolean;
  is_received: boolean;
  is_resulted: boolean;
  is_cancelled: boolean;
  time_in: string | null;
  time_out: string | null;
  actual_tat: number | null;
}

interface TestsForLabDialogProps {
  labNo: string | null;
  open: boolean;
  onClose: () => void;
}

const TestsForLabDialog: React.FC<TestsForLabDialogProps> = ({ labNo, open, onClose }) => {
  const [tests, setTests] = useState<TestForLab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !labNo) {
      setTests([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    fetch(`/api/encounters/${encodeURIComponent(labNo)}/tests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load tests');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setTests(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load tests');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, labNo]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="tests-for-lab-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tests-for-lab-title"
      onClick={handleBackdropClick}
    >
      <div className="tests-for-lab-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="tests-for-lab-dialog-header">
          <h3 id="tests-for-lab-title">Tests for lab {labNo || ''}</h3>
          <button type="button" className="tests-for-lab-dialog-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="tests-for-lab-dialog-body">
          {loading && <p className="tests-for-lab-loading">Loading...</p>}
          {error && <p className="tests-for-lab-error">{error}</p>}
          {!loading && !error && tests.length === 0 && <p className="tests-for-lab-empty">No tests found for this lab number.</p>}
          {!loading && !error && tests.length > 0 && (
            <ul className="tests-for-lab-list">
              {tests.map((t) => (
                <li key={t.id} className="tests-for-lab-item">
                  <span className="tests-for-lab-name">{t.test_name}</span>
                  {t.lab_section_at_test && <span className="tests-for-lab-section">{t.lab_section_at_test}</span>}
                  {t.is_cancelled && <span className="tests-for-lab-badge cancelled">Cancelled</span>}
                  {t.is_resulted && <span className="tests-for-lab-badge resulted">Resulted</span>}
                  {t.is_urgent && <span className="tests-for-lab-badge urgent">Urgent</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestsForLabDialog;
