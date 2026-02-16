
// frontend/src/components/charts/TopTestsByUnitChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface TopTestsByUnitChartProps {
  data: Array<{ test: string; count: number }>;
}

export const TopTestsByUnitChart: React.FC<TopTestsByUnitChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Get top 8 tests
    const topTests = data.slice(0, 8);

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topTests.map(d => d.test),
        datasets: [
          {
            label: 'Test Count',
            data: topTests.map(d => d.count),
            backgroundColor: '#f59e0b',
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#666',
              padding: 15
            }
          }
        },
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: '#999'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
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