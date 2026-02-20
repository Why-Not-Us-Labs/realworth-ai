'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ChartDatum = { date: string; count: number; value: number };

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDatum }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 text-sm">
      <p className="font-semibold text-slate-900">{d.date}</p>
      <p className="text-slate-600">{d.count} appraisal{d.count !== 1 ? 's' : ''}</p>
      <p className="text-slate-600">${d.value.toFixed(0)} total offer value</p>
    </div>
  );
}

export function AppraisalsChart({ data }: { data: ChartDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Daily Appraisals</h3>
        <p className="text-sm text-slate-500 text-center py-8">No data for this period</p>
      </div>
    );
  }

  // Format dates for display
  const formatted = data.map(d => ({
    ...d,
    label: d.date.substring(5), // MM-DD
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Daily Appraisals</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
