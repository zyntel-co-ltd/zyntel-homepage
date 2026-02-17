
// frontend/src/components/charts/HospitalUnitRevenueChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface HospitalUnitRevenueChartProps {
  data: Array<{ unit: string; revenue: number }>;
}

export const HospitalUnitRevenueChart: React.FC<HospitalUnitRevenueChartProps> = ({ data }) => {
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
        labels: data.map(d => d.unit === 'mainLab' ? 'Main Laboratory' : d.unit === 'annex' ? 'Annex' : d.unit),
        datasets: [
          {
            label: 'Revenue (UGX)',
            data: data.map(d => d.revenue),
            backgroundColor: '#21336a',
            borderRadius: 0,
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
                const value = context.parsed.x;
                return `UGX ${value.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
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