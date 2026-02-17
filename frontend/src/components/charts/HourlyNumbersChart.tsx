
// frontend/src/components/charts/HourlyNumbersChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface HourlyNumbersChartProps {
  data: Array<{ hour: number; count: number }>;
}

export const HourlyNumbersChart: React.FC<HourlyNumbersChartProps> = ({ data }) => {
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
      type: 'line',
      data: {
        labels: data.map(d => `${d.hour}:00`),
        datasets: [
          {
            label: 'Hourly Request Volume',
            data: data.map(d => d.count),
            borderColor: '#21336a',
            backgroundColor: 'rgba(33, 51, 106, 0.2)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#21336a',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
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
            title: { display: true, text: 'Hour of Day' },
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