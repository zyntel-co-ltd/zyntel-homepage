
// frontend/src/components/charts/TestRevenueChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface TestRevenueChartProps {
  data: Array<{ test_name: string; revenue: number }>;
}

export const TestRevenueChart: React.FC<TestRevenueChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Get top tests (all data or top 50)
    const topTests = data.slice(0, 50);
    const isFewItems = topTests.length <= 5;

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topTests.map(d => d.test_name),
        datasets: [
          {
            label: 'Revenue by Test (UGX)',
            data: topTests.map(d => d.revenue),
            backgroundColor: '#21336a',
            borderRadius: 0,
            ...(isFewItems && { maxBarThickness: 48 }),
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                return `UGX ${context.parsed.x.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            position: 'top',
            beginAtZero: true,
            ticks: {
              callback: (value) => `UGX ${(value as number).toLocaleString()}`,
              color: '#999'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
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
  }, [data]);

  return <canvas ref={canvasRef}></canvas>;
};