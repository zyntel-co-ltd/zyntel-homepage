// frontend/src/components/charts/SectionRevenueChart.tsx
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

interface SectionRevenueChartProps {
  data: Array<{ section: string; revenue: number }>;
}

const SECTION_COLORS = [
  '#21336a',
  '#4CAF50',
  '#795548',
  '#9C27B0',
  'rgb(250, 39, 11)',
  '#00BCD4',
  '#607D8B',
  '#deab5f',
  '#E91E63',
  '#FFC107',
];
const OTHER_SECTIONS_GRAY = '#d3d3d3';

export const SectionRevenueChart: React.FC<SectionRevenueChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const backgroundColors = data.map((d, i) =>
      d.section.toLowerCase() === 'other sections'
        ? OTHER_SECTIONS_GRAY
        : SECTION_COLORS[i % SECTION_COLORS.length]
    );

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.section.toUpperCase()),
        datasets: [
          {
            data: data.map(d => d.revenue),
            backgroundColor: backgroundColors,
            hoverOffset: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...({ cutout: '60%' } as Record<string, unknown>),
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 20,
              padding: 10,
              font: { size: 12 },
              color: '#666'
            }
          },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                const value = context.parsed;
                const percentage = totalRevenue > 0
                  ? (value / totalRevenue) * 100
                  : 0;
                return `${context.label}: UGX ${value.toLocaleString()} (${percentage.toFixed(1)}%)`;
              }
            }
          },
          datalabels: {
            formatter: (value: number) => {
              const pct = totalRevenue > 0 ? (value / totalRevenue) * 100 : 0;
              return pct > 0 ? `${pct.toFixed(1)}%` : '';
            },
            color: '#fff',
            font: { weight: 'bold', size: 11 },
          },
        }
      },
      plugins: [ChartDataLabels],
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  return <canvas ref={canvasRef}></canvas>;
};