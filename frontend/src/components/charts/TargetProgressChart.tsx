// frontend/src/components/charts/TargetProgressChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export interface TargetProgressChartProps {
  currentValue: number;
  targetValue: number;
  title: string;
  achievedColor?: string;
  gapColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  targetLabel?: string;
  tooltip?: string;
  height?: number;
}

const TargetProgressChart: React.FC<TargetProgressChartProps> = ({
  currentValue,
  targetValue,
  title,
  achievedColor = '#4caf50',
  gapColor = '#e0e0e0',
  valuePrefix = '',
  valueSuffix = '',
  targetLabel,
  tooltip,
  height = 28,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const maxValue = Math.max(targetValue, currentValue, 1);
  const achieved = Math.min(currentValue, targetValue);
  const gap = Math.max(0, targetValue - currentValue);
  const overTarget = Math.max(0, currentValue - targetValue);
  const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
  const isAtOrAboveTarget = currentValue >= targetValue && targetValue > 0;
  const isOverTarget = currentValue > targetValue;

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const datasets: { label: string; data: number[]; backgroundColor: string; stack: string }[] = [];
    if (isOverTarget) {
      datasets.push(
        { label: 'Target', data: [targetValue], backgroundColor: achievedColor, stack: 'target' },
        { label: 'Over target', data: [overTarget], backgroundColor: '#22c55e', stack: 'target' },
      );
    } else if (isAtOrAboveTarget) {
      datasets.push({ label: 'Achieved', data: [achieved], backgroundColor: achievedColor, stack: 'target' });
    } else {
      datasets.push(
        { label: 'Achieved', data: [achieved], backgroundColor: achievedColor, stack: 'target' },
        { label: 'Gap', data: [gap], backgroundColor: gapColor, stack: 'target' },
      );
    }

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [''],
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        layout: { padding: { left: 0, right: 0, top: 0, bottom: 0 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            display: false,
            stack: 'target',
            max: maxValue,
            grid: { display: false },
          },
          y: { display: false, grid: { display: false } },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [currentValue, targetValue, achievedColor, gapColor, achieved, gap, overTarget, maxValue, isAtOrAboveTarget, isOverTarget]);

  const targetText =
    targetLabel != null
      ? targetLabel
      : `of ${valuePrefix}${targetValue.toLocaleString()}${valueSuffix}`;

  return (
    <div className="target-progress-chart" title={tooltip}>
      <div className="target-progress-chart__label">
        {title}
        {tooltip && <span className="target-progress-chart__tooltip" title={tooltip}><i className="fas fa-info-circle" aria-hidden /></span>}
      </div>
      <div className={`target-progress-chart__percentage ${isAtOrAboveTarget ? 'target-progress-chart__percentage--achieved' : ''} ${isOverTarget ? 'target-progress-chart__percentage--perfect' : ''}`}>
        {percentage.toFixed(1)}%
        {isOverTarget && <span className="target-progress-chart__badge">✓ Target met</span>}
      </div>
      <div className="target-progress-chart__amounts">
        <span>
          {valuePrefix}
          {currentValue.toLocaleString()}
          {valueSuffix}
        </span>
        <span className="target-progress-chart__target">{targetText}</span>
      </div>
      <div style={{ height: `${height}px`, marginTop: '6px' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default TargetProgressChart;
