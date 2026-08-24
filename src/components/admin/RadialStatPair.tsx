import React from 'react';

interface StatMetric {
  label: string;
  value: string | number;
  percentage?: number;
  subtext?: string;
  colorClass?: string;
  bgClass?: string;
}

interface RadialStatPairProps {
  title: string;
  subtitle?: string;
  primary: StatMetric;
  secondary: StatMetric;
}

export default function RadialStatPair({
  title,
  subtitle,
  primary,
  secondary,
}: RadialStatPairProps) {
  const pPct = primary.percentage !== undefined ? primary.percentage : 50;
  const sPct = secondary.percentage !== undefined ? secondary.percentage : 50;

  return (
    <div className="bg-card border border-foreground/5 rounded-[32px] p-6 space-y-6 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div>
        <h3 className="text-base font-black italic uppercase tracking-tight text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Radial Overlapping Circles Visual */}
      <div className="relative h-36 flex items-center justify-center my-2">
        {/* Secondary Circle (Left / Background) */}
        <div className="absolute left-[20%] w-28 h-28 rounded-full bg-foreground/5 border-2 border-foreground/20 flex flex-col items-center justify-center p-2 shadow-inner transition-transform group-hover:scale-105">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate max-w-full">
            {secondary.label}
          </span>
          <span className="text-lg font-black italic font-mono text-foreground">{secondary.value}</span>
          {secondary.percentage !== undefined && (
            <span className="text-[9px] font-extrabold text-muted-foreground">{sPct}%</span>
          )}
        </div>

        {/* Primary Circle (Right / Foreground Overlapping) */}
        <div className="absolute right-[20%] w-32 h-32 rounded-full bg-primary/10 border-2 border-primary flex flex-col items-center justify-center p-3 shadow-xl backdrop-blur-sm z-10 hover:scale-105 transition-transform">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-full">
            {primary.label}
          </span>
          <span className="text-2xl font-black italic font-mono text-primary">{primary.value}</span>
          {primary.percentage !== undefined && (
            <span className="text-[10px] font-black uppercase tracking-wider text-foreground bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30 mt-0.5">
              {pPct}%
            </span>
          )}
        </div>
      </div>

      {/* Legend / Breakdown Footer */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-foreground/5">
        <div className="space-y-0.5 text-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" /> {primary.label}
          </span>
          <p className="text-xs font-mono font-bold text-foreground">{primary.value} ({pPct}%)</p>
          {primary.subtext && <p className="text-[9px] text-muted-foreground">{primary.subtext}</p>}
        </div>

        <div className="space-y-0.5 text-center border-l border-foreground/5">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-foreground/30" /> {secondary.label}
          </span>
          <p className="text-xs font-mono font-bold text-foreground">{secondary.value} ({sPct}%)</p>
          {secondary.subtext && <p className="text-[9px] text-muted-foreground">{secondary.subtext}</p>}
        </div>
      </div>
    </div>
  );
}
