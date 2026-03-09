import React from 'react';

/** Friendly message when table has no results — suggests trying a more recent date range (avoids mentioning purging) */
const EmptyTableMessage: React.FC<{
  hasSearch?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ hasSearch = false, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      textAlign: 'center',
      padding: '32px 24px',
      color: '#6b7280',
      fontSize: '0.95rem',
      lineHeight: 1.5,
      ...style,
    }}
  >
    <p style={{ margin: 0 }}>
      {hasSearch
        ? 'No results found for your search. Your search may be from a while ago — try a more recent date range.'
        : 'No results found. Your selection may be from a while ago — try a more recent date range.'}
    </p>
  </div>
);

export default EmptyTableMessage;
