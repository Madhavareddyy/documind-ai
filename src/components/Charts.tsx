import React from 'react';

export interface BarChartDatum {
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

export function SimpleBarChart({
  data,
  primaryLabel = 'Direct',
  secondaryLabel = 'Inferred',
  height = 220,
}: {
  data: BarChartDatum[];
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
        No data available to plot yet.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => d.value + (d.secondaryValue ?? 0))
  );
  const chartHeight = height - 48;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
          {primaryLabel}
        </span>
        {data.some((d) => typeof d.secondaryValue === 'number') && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            {secondaryLabel}
          </span>
        )}
      </div>
      <div className="w-full overflow-x-auto">
        <div
          className="flex items-end gap-3 min-w-[360px] pt-4 pb-2 px-1 border-b border-slate-200"
          style={{ height }}
        >
          {data.map((item) => {
            const pHeight = Math.round((item.value / maxVal) * chartHeight);
            const sHeight = Math.round(
              ((item.secondaryValue ?? 0) / maxVal) * chartHeight
            );
            const total = item.value + (item.secondaryValue ?? 0);

            return (
              <div
                key={item.label}
                className="flex-1 min-w-[48px] flex flex-col items-center justify-end gap-1.5 h-full group"
              >
                <span className="text-[11px] font-mono tabular-nums text-slate-600">
                  {total}
                </span>
                <div className="w-full max-w-[44px] flex flex-col justify-end rounded-t-md overflow-hidden bg-slate-100/60">
                  {sHeight > 0 && (
                    <div
                      className="w-full bg-amber-500 transition-all duration-300"
                      style={{ height: `${Math.max(4, sHeight)}px` }}
                      title={`${secondaryLabel}: ${item.secondaryValue}`}
                    />
                  )}
                  {pHeight > 0 && (
                    <div
                      className="w-full transition-all duration-300"
                      style={{
                        height: `${Math.max(4, pHeight)}px`,
                        backgroundColor: item.color ?? '#2563EB',
                      }}
                      title={`${primaryLabel}: ${item.value}`}
                    />
                  )}
                </div>
                <span
                  className="text-[11px] text-slate-600 truncate max-w-[84px] text-center"
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DonutBreakdownChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="16"
          />
          {total > 0 &&
            segments.map((seg) => {
              const frac = seg.value / total;
              const dash = frac * circumference;
              const gap = circumference - dash;
              const strokeDashoffset = -offsetAcc;
              offsetAcc += dash;
              if (seg.value === 0) return null;
              return (
                <circle
                  key={seg.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold font-mono tabular-nums text-slate-900">
            {centerValue}
          </span>
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span>{seg.label}</span>
              </div>
              <div className="font-mono tabular-nums text-xs text-slate-600">
                {seg.value} <span className="text-slate-400">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
