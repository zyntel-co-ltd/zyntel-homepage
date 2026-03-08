// frontend/src/components/shared/KPICard.tsx
import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: string;
  prefix?: string;
  suffix?: string;
  fullWidth?: boolean;
  className?: string;
  tooltip?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  icon,
  prefix = '',
  suffix = '',
  fullWidth = false,
  className = '',
  tooltip
}) => {
  const getTrendIcon = () => {
    if (!trend || trend.direction === 'neutral') return null;
    switch (trend.direction) {
      case 'up':
        return <i className="fas fa-arrow-up progress-complete-actual mr-1" aria-hidden />;
      case 'down':
        return <i className="fas fa-arrow-down progress-overdue mr-1" aria-hidden />;
      default:
        return null;
    }
  };

  const getTrendClass = () => {
    if (!trend || trend.direction === 'neutral') return '';
    switch (trend.direction) {
      case 'up':
        return 'progress-complete-actual';
      case 'down':
        return 'progress-overdue';
      default:
        return '';
    }
  };

  const showTrend = trend && trend.direction !== 'neutral';

  return (
    <div className={`kpi-card ${fullWidth ? 'kpi-card-full-width' : ''} ${className}`} title={tooltip}>
      <div className="kpi-label">
        {icon && <i className={`${icon} mr-2`}></i>}
        {title}
        {tooltip && <span className="kpi-tooltip" title={tooltip}><i className="fas fa-info-circle" aria-hidden /></span>}
      </div>
      <div className="kpi-value">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : value}
        {suffix}
      </div>
      {showTrend && (
        <div className={`kpi-trend ${getTrendClass()}`}>
          {getTrendIcon()}
          <span>{Math.abs(trend!.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;