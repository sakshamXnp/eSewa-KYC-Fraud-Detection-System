'use client';

import { useState, useEffect } from 'react';

interface DayData {
  date: string;
  label: string;
  high: number;
  medium: number;
  low: number;
}

export default function StatsChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/stats/trend');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Trend fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="chart-skeleton">Loading trend...</div>;
  if (!data.length) return <div className="chart-empty">No data yet</div>;

  const maxVal = Math.max(...data.map(d => d.high + d.medium + d.low), 10);
  const chartHeight = 200;
  const chartWidth = 600;
  const barWidth = 40;
  const gap = 30;

  return (
    <div className="chart-card fade-up">
      <div className="chart-header">
        <h3 className="chart-title">7-Day Submission Trend</h3>
        <span className="chart-date">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      <div className="svg-container">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="trend-svg">
          {/* Y-axis lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <line 
              key={i}
              x1="0" y1={chartHeight * (1 - p)} 
              x2={chartWidth} y2={chartHeight * (1 - p)} 
              stroke="#1e2d4a" 
              strokeWidth="1" 
              strokeDasharray="4 4"
            />
          ))}

          {data.map((day, i) => {
            const x = i * (barWidth + gap) + 40;
            const total = day.high + day.medium + day.low;
            
            const lowH = (day.low / maxVal) * chartHeight;
            const medH = (day.medium / maxVal) * chartHeight;
            const highH = (day.high / maxVal) * chartHeight;

            return (
              <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                {/* Low Segment */}
                <rect 
                  x={x} y={chartHeight - lowH} 
                  width={barWidth} height={lowH} 
                  fill="#22c55e" 
                  className="bar-segment"
                />
                {/* Medium Segment */}
                <rect 
                  x={x} y={chartHeight - lowH - medH} 
                  width={barWidth} height={medH} 
                  fill="#f59e0b" 
                  className="bar-segment"
                />
                {/* High Segment */}
                <rect 
                  x={x} y={chartHeight - lowH - medH - highH} 
                  width={barWidth} height={highH} 
                  fill="#ef4444" 
                  className="bar-segment"
                />
                
                {/* X-axis labels */}
                <text 
                  x={x + barWidth / 2} y={chartHeight + 20} 
                  textAnchor="middle" 
                  fill="#64748b" 
                  fontSize="12"
                  fontFamily="Sora"
                >
                  {day.label}
                </text>

                {/* Tooltip on hover */}
                {hovered === i && (
                  <g transform={`translate(${x + barWidth / 2}, ${chartHeight - (lowH + medH + highH) - 10})`}>
                    <rect 
                      x="-60" y="-50" width="120" height="45" 
                      rx="8" fill="#070d1a" stroke="#1e2d4a" 
                    />
                    <text x="0" y="-32" textAnchor="middle" fill="#f1f5f9" fontSize="10" fontFamily="JetBrains Mono">
                      {day.label}: {day.high}H, {day.medium}M, {day.low}L
                    </text>
                    <text x="0" y="-18" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="Sora">
                      Total: {total}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .chart-card {
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .chart-title {
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .chart-date {
          font-size: 12px;
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
        }

        .svg-container {
          width: 100%;
          height: 240px;
        }

        .trend-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .bar-segment {
          transform-origin: bottom;
          animation: grow 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .bar-segment:hover {
          opacity: 1;
        }

        @keyframes grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }

        .chart-skeleton, .chart-empty {
          height: 280px;
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          margin-bottom: 32px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
      `}} />
    </div>
  );
}
