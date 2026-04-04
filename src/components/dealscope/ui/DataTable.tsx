import React, { useState } from 'react';

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  className?: string;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'No data',
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === bv) return 0;
    const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div
      className={className}
      style={{
        background: 'var(--s2, #18181f)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {columns.map(col => {
              const key = String(col.key);
              const isActive = sortKey === key;
              return (
                <th
                  key={key}
                  onClick={col.sortable ? () => handleSort(key) : undefined}
                  style={{
                    padding: '10px 16px',
                    textAlign: col.align ?? 'left',
                    fontSize: '11px',
                    color: isActive ? 'var(--acc, #7c6af0)' : 'rgba(228,228,236,0.45)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {col.sortable && (
                    <span style={{ marginLeft: '4px', opacity: isActive ? 1 : 0.4 }}>
                      {isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'rgba(228,228,236,0.35)',
                  fontSize: '13px',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                {columns.map(col => {
                  const key = String(col.key);
                  const rawVal = row[key];
                  const cell = col.render ? col.render(rawVal, row) : String(rawVal ?? '—');
                  return (
                    <td
                      key={key}
                      style={{
                        padding: '10px 16px',
                        textAlign: col.align ?? 'left',
                        fontSize: '13px',
                        color: 'var(--tx, #e4e4ec)',
                        fontFamily: typeof rawVal === 'number' ? 'JetBrains Mono, monospace' : 'DM Sans, sans-serif',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
