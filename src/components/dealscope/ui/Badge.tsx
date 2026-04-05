import React from 'react';

type BadgeVariant = 'BUY' | 'CONDITIONAL' | 'PASS';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  BUY: {
    bg: 'rgba(52,211,153,0.12)',
    color: 'var(--grn, #34d399)',
    border: 'rgba(52,211,153,0.3)',
  },
  CONDITIONAL: {
    bg: 'rgba(251,191,36,0.12)',
    color: 'var(--amb, #fbbf24)',
    border: 'rgba(251,191,36,0.3)',
  },
  PASS: {
    bg: 'rgba(248,113,113,0.12)',
    color: 'var(--red, #f87171)',
    border: 'rgba(248,113,113,0.3)',
  },
};

export function Badge({ variant, label, className = '' }: BadgeProps) {
  const styles = VARIANT_STYLES[variant];
  const displayLabel = label ?? variant;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '20px',
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        fontSize: '11px',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {displayLabel}
    </span>
  );
}
