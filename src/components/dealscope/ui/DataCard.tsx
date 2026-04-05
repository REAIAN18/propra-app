import React from 'react';

interface DataCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function DataCard({ label, value, subtitle, trend, trendValue, className = '' }: DataCardProps) {
  const trendColor =
    trend === 'up' ? 'var(--grn, #34d399)' :
    trend === 'down' ? 'var(--red, #f87171)' :
    'var(--tx, #e4e4ec)';

  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div
      className={className}
      style={{
        background: 'var(--s2, #18181f)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontFamily: 'DM Sans, sans-serif',
          color: 'rgba(228,228,236,0.5)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span
          style={{
            fontSize: '22px',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--tx, #e4e4ec)',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
        {trend && trendValue && (
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'DM Sans, sans-serif',
              color: trendColor,
              fontWeight: 500,
            }}
          >
            {trendArrow} {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif',
            color: 'rgba(228,228,236,0.45)',
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
