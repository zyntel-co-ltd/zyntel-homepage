import React, { useEffect, useRef } from 'react';
import Chart, { ChartConfiguration } from 'chart.js/auto';

interface DailyDataPoint {
  date: string;
  delayed: number;
  onTime: number;
  notUploaded: number;
}

interface TATLineChartProps {
  data: DailyDataPoint[];
  granularity?: 'daily' | 'monthly';
}

const formatLabel = (date: string, granularity?: 'daily' | 'monthly') => {
  if (granularity === 'monthly' || (date.length === 7 && date[4] === '-')) {
    const [y, m] = date.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TATLineChart: React.FC<TATLineChartProps> = ({ data = [], granularity }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const labels = data.map(d => formatLabel(d.date, granularity));
    const delayedData = data.map(d => d.delayed || 0);
    const onTimeData = data.map(d => d.onTime || 0);
    const notUploadedData = data.map(d => d.notUploaded || 0);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Delayed',
            data: delayedData,
            borderColor: '#f44336',
            backgroundColor: '#f44336',
            fill: false,
            tension: 0,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 0,
          },
          {
            label: 'On Time',
            data: onTimeData,
            borderColor: '#4caf50',
            backgroundColor: '#4caf50',
            fill: false,
            tension: 0,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 0,
          },
          {
            label: 'Not Uploaded',
            data: notUploadedData,
            borderColor: '#9E9E9E',
            backgroundColor: '#9E9E9E',
            fill: false,
            tension: 0,
            borderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true, 
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Date', color: '#666' },
            grid: { display: false },
            ticks: { color: '#666' }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Requests', color: '#666' },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#666' }
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, granularity]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '350px' }}>
      <canvas ref={chartRef} />
    </div>
  );
};

export default TATLineChart;