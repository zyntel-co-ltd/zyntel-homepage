import React, { useEffect, useRef } from 'react';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface CancellationReasonsChartProps {
  data: Array<{ reason: string; count: number }>;
}

const COLORS = ['#ef4444', '#f59e0b', '#9ca3af', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const CancellationReasonsChart: React.FC<CancellationReasonsChartProps> = ({ data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // Format reason for display (replace underscores with spaces)
    const labels = data.map((r) => r.reason.replace(/_/g, ' '));
    const dataValues = data.map((r) => r.count);
    const backgroundColors = data.map((_, i) => COLORS[i % COLORS.length]);
    const total = dataValues.reduce((sum, val) => sum + val, 0);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: backgroundColors,
            borderColor: '#fff',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 20, padding: 10, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.label || '';
                if (label) label += ': ';
                if (context.parsed !== null) {
                  label += new Intl.NumberFormat('en-US').format(context.parsed);
                }
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
                return label + ` (${percentage}%)`;
              },
            },
          },
          datalabels: {
            formatter: (value: number) => (total > 0 ? ((value / total) * 100).toFixed(1) + '%' : ''),
            color: '#fff',
            font: { weight: 'bold', size: 12 },
          },
        },
        ...({ cutout: '55%' } as Record<string, unknown>),
      },
      plugins: [ChartDataLabels],
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '280px', maxHeight: '320px', position: 'relative' }}>
      <canvas ref={chartRef} />
    </div>
  );
};

export default CancellationReasonsChart;
