
// frontend/src/components/charts/DailyNumbersChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface DailyNumbersChartProps {
  data: Array<{ date: string; count: number }>;
  granularity?: 'daily' | 'monthly';
}

const formatLabel = (date: string, granularity?: 'daily' | 'monthly') => {
  if (granularity === 'monthly' || (date.length === 7 && date[4] === '-')) {
    const [y, m] = date.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return date;
};

export const DailyNumbersChart: React.FC<DailyNumbersChartProps> = ({ data, granularity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => formatLabel(d.date, granularity)),
        datasets: [
          {
            label: 'Daily Request Volume',
            data: data.map(d => d.count),
            backgroundColor: '#21336a',
            borderColor: '#21336a',
            borderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => `${context.parsed.y} requests`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Requests' },
            ticks: {
              color: '#999'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            title: { display: true, text: 'Date' },
            ticks: {
              color: '#999'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, granularity]);

  return <canvas ref={canvasRef}></canvas>;
};