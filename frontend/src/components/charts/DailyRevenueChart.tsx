//  frontend/src/components/charts/DailyRevenueChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface DailyRevenueChartProps {
  data: Array<{ date: string; revenue: number }>;
  granularity?: 'daily' | 'monthly';
}

const formatLabel = (date: string, granularity?: 'daily' | 'monthly') => {
  if (granularity === 'monthly' || (date.length === 7 && date[4] === '-')) {
    const [y, m] = date.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return date;
};

export const DailyRevenueChart: React.FC<DailyRevenueChartProps> = ({ data, granularity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const isFewItems = data.length <= 5;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => formatLabel(d.date, granularity)),
        datasets: [
          {
            label: 'Revenue (UGX)',
            data: data.map(d => d.revenue),
            backgroundColor: '#21336a',
            borderRadius: 0,
            ...(isFewItems && { maxBarThickness: 48 }),
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
              label: function (context: any) {
                const value = context.parsed.y;
                return `UGX ${value.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `UGX ${(value as number).toLocaleString()}`,
              color: '#999'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
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