// frontend/src/components/shared/Pagination.tsx
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '20px', marginTop: '20px' }}>
      <button type="button" className="pagination-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
      {pageNumbers.map((page) => (
        <button key={page} type="button" className={`pagination-btn ${page === currentPage ? 'active' : ''}`} onClick={() => onPageChange(page)}>{page}</button>
      ))}
      <button type="button" className="pagination-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      <button type="button" className="pagination-btn" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>Last</button>
      <span className="pagination-count">Total: {totalRecords}</span>
    </div>
  );
};
