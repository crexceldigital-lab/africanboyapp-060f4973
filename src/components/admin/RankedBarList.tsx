import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface RankedItem {
  id?: string;
  label: string;
  sublabel?: string;
  value: number;
  formattedValue?: string;
  percentage?: number;
}

interface RankedBarListProps {
  title: string;
  subtitle?: string;
  items: RankedItem[];
  maxItems?: number;
  actionLabel?: string;
  onAction?: () => void;
  emptyMessage?: string;
  barColorClass?: string;
}

export default function RankedBarList({
  title,
  subtitle,
  items,
  maxItems = 5,
  actionLabel,
  onAction,
  emptyMessage = 'No data recorded for this period',
  barColorClass = 'bg-primary',
}: RankedBarListProps) {
  const displayItems = items.slice(0, maxItems);
  const maxVal = Math.max(...displayItems.map((i) => i.value), 1);

  return (
    <div className="bg-card border border-foreground/5 rounded-[32px] p-6 space-y-5 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-black italic uppercase tracking-tight text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 shrink-0"
          >
            {actionLabel} <ArrowUpRight size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {displayItems.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {emptyMessage}
          </div>
        ) : (
          displayItems.map((item, idx) => {
            const fillPct = item.percentage !== undefined
              ? Math.min(100, Math.max(0, item.percentage))
              : Math.round((item.value / maxVal) * 100);

            return (
              <div key={item.id || `${item.label}-${idx}`} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[10px] font-black text-primary w-5 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-foreground truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                        ({item.sublabel})
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-black text-foreground shrink-0">
                    {item.formattedValue || item.value.toLocaleString()}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden p-0.5 border border-foreground/5">
                  <div
                    className={`h-full ${barColorClass} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
