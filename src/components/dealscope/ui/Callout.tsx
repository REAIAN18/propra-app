import React from 'react';

type CalloutVariant = 'info' | 'warning' | 'success';

interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<CalloutVariant, { bg: string; border: string; iconColor: string; icon: string }> = {
  info: {
    bg: 'rgba(124,106,240,0.08)',
    border: 'rgba(124,106,240,0.25)',
    iconColor: 'var(--acc, #7c6af0)',
    icon: 'ℹ',
  },
  warning: {
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    iconColor: 'var(--amb, #fbbf24)',
    icon: '⚠',
  },
  success: {
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.25)',
    iconColor: 'var(--grn, #34d399)',
    icon: '✓',
  },
};

export function Callout({ variant = 'info', title, children, className = '' }: CalloutProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={className}
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          color: styles.iconColor,
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: 1.5,
          flexShrink: 0,
        }}
      >
        {styles.icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {title && (
          <span
            style={{
              fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              color: styles.iconColor,
            }}
          >
            {title}
          </span>
        )}
        <span
          style={{
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            color: 'rgba(228,228,236,0.75)',
            lineHeight: 1.5,
          }}
        >
          {children}
        </span>
      </div>
    </div>
  );
}
