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

    const labelMap: Record<string, string> = {
      delayed: 'Delayed',
      onTime: 'On Time',
      notUploaded: 'Not Uploaded',
      'On Time': 'On Time',
      'Delayed <15min': 'Delayed',
      'Over Delayed': 'Over Delayed',
      'Not Uploaded': 'Not Uploaded',
    };
    const labels = Object.keys(data).map((k) => labelMap[k] || k);
    const dataValues = Object.values(data);
    const total = dataValues.reduce((sum, val) => sum + val, 0);

    const colorMap: Record<string, string> = {
      delayed: '#F44336',
      onTime: '#4CAF50',
      notUploaded: '#9E9E9E',
      'On Time': '#4CAF50',
      'Delayed': '#F44336',
      'Delayed <15min': '#FFC107',
      'Over Delayed': '#F44336',
      'Not Uploaded': '#9E9E9E',
    };
    const backgroundColors = Object.keys(data).map((k) => colorMap[k] || colorMap[labelMap[k]] || '#CCCCCC');

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
                const percentage = ((context.parsed / total) * 100).toFixed(2);
                return label + ` (${percentage}%)`;
              },
            },
          },
          datalabels: {
            formatter: (value: number) => ((value / total) * 100).toFixed(1) + '%',
            color: '#fff',
            font: { weight: 'bold', size: 12 },
          },
        },
        cutout: '55%',
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