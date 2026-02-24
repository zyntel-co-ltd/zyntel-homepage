import React, { useEffect, useRef } from 'react';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface TATPieChartProps {
  data: Record<string, number>;
}

const TATPieChart: React.FC<TATPieChartProps> = ({ data = {} }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || Object.keys(data).length === 0) return;

    // Flask-style: On Time, Delayed for <15 min, Over Delayed, Not Uploaded
    const order = ['onTime', 'delayedLess15', 'overDelayed', 'notUploaded'];
    const labelMap: Record<string, string> = {
      onTime: 'On Time',
      delayedLess15: 'Delayed for <15 min',
      overDelayed: 'Over Delayed',
      notUploaded: 'Not Uploaded',
    };
    const colorMap: Record<string, string> = {
      onTime: '#4CAF50',
      delayedLess15: '#FFC107',
      overDelayed: '#F44336',
      notUploaded: '#9E9E9E',
    };
    const labels = order.filter((k) => (data as Record<string, number>)[k] != null).map((k) => labelMap[k]);
    const dataValues = order.filter((k) => (data as Record<string, number>)[k] != null).map((k) => (data as Record<string, number>)[k] ?? 0);
    const backgroundColors = order.filter((k) => (data as Record<string, number>)[k] != null).map((k) => colorMap[k]);
    const total = dataValues.reduce((sum, val) => sum + val, 0);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: labels,
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
    <div style={{ width: '100%', height: '100%', minHeight: '300px', maxHeight: '340px', position: 'relative' }}>
      <canvas ref={chartRef} />
    </div>
  );
};

export default TATPieChart;