// frontend/src/components/charts/RevenueProgressChart.tsx
import React from 'react';

interface RevenueProgressChartProps {
  currentValue: number;
  targetValue: number;
  title?: string;
  prefix?: string;
  suffix?: string;
}

const RevenueProgressChart: React.FC<RevenueProgressChartProps> = ({
  currentValue,
  targetValue,
  title = 'Total Revenue',
  prefix = 'UGX ',
  suffix = ''
}) => {
  const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

  return (
    <div className="numbers-progress-card revenue-target-card">
      <div className="label">{title}</div>
      <div className="percentage">{percentage.toFixed(1)}%</div>
      <div className="amounts">
        <span>{prefix}{currentValue.toLocaleString()}{suffix}</span>
        <span className="target">of {prefix}{targetValue.toLocaleString()}{suffix}</span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default RevenueProgressChart;