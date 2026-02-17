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
  height = 28,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const maxValue = Math.max(targetValue, currentValue, 1);
  const achieved = Math.min(currentValue, targetValue);
  const gap = Math.max(0, targetValue - currentValue);
  const overTarget = Math.max(0, currentValue - targetValue);
  const percentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const datasets: { label: string; data: number[]; backgroundColor: string; stack: string }[] = [
      {
        label: 'Achieved',
        data: [achieved],
        backgroundColor: achievedColor,
        stack: 'target',
      },
      {
        label: 'Gap',
        data: [gap],
        backgroundColor: gapColor,
        stack: 'target',
      },
    ];
    if (overTarget > 0) {
      datasets.push({
        label: 'Over target',
        data: [overTarget],
        backgroundColor: '#81c784',
        stack: 'target',
      });
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
  }, [currentValue, targetValue, achievedColor, gapColor, achieved, gap, overTarget, maxValue]);

  const targetText =
    targetLabel != null
      ? targetLabel
      : `of ${valuePrefix}${targetValue.toLocaleString()}${valueSuffix}`;

  return (
    <div className="target-progress-chart">
      <div className="target-progress-chart__label">{title}</div>
      <div className="target-progress-chart__percentage">{percentage.toFixed(1)}%</div>
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
