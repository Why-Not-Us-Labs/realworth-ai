'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { FutureValuePrediction } from '@/lib/types';

type Props = {
  predictions: FutureValuePrediction[];
  currentValue: { low: number; high: number };
};

export function FutureValueChart({ predictions, currentValue }: Props) {
  const currentMid = (currentValue.low + currentValue.high) / 2;

  // Transform predictions into chart data
  const chartData = useMemo(() => {
    // Start with current value at year 0
    const data = [
      {
        year: 0,
        label: 'Now',
        low: currentValue.low,
        mid: currentMid,
        high: currentValue.high,
        probability: 100,
        reasoning: 'Current appraised value',
      },
    ];

    // Add each prediction point
    predictions.forEach((pred) => {
      data.push({
        year: pred.years,
        label: `${pred.years}yr`,
        low: Math.round(currentMid * pred.multiplierLow),
        mid: Math.round(currentMid * ((pred.multiplierLow + pred.multiplierHigh) / 2)),
        high: Math.round(currentMid * pred.multiplierHigh),
        probability: pred.probability,
        reasoning: pred.reasoning,
      });
    });

    return data;
  }, [predictions, currentValue, currentMid]);

  // Find the max value for Y axis
  const maxValue = Math.max(...chartData.map((d) => d.high));
  const yAxisMax = Math.ceil(maxValue / 100) * 100;

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }>; label?: string }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 max-w-xs">
          <p className="font-semibold text-slate-900">
            {data.year === 0 ? 'Current Value' : `In ${data.year} years`}
          </p>
          <div className="mt-1 space-y-1 text-sm">
            <p className="text-slate-600">
              Range: <span className="font-medium text-slate-900">${data.low.toLocaleString()} - ${data.high.toLocaleString()}</span>
            </p>
            {data.year > 0 && (
              <>
                <p className="text-slate-600">
                  Probability: <span className="font-medium text-indigo-600">{data.probability}%</span>
                </p>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">{data.reasoning}</p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              domain={[0, yAxisMax]}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={currentMid}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              label={{
                value: 'Current',
                position: 'right',
                fill: '#94a3b8',
                fontSize: 11,
              }}
            />
            {/* Confidence band (area between low and high) */}
            <Area
              type="monotone"
              dataKey="high"
              stroke="none"
              fill="url(#colorRange)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
            />
            {/* Mid-point line */}
            <Area
              type="monotone"
              dataKey="mid"
              stroke="#6366f1"
              strokeWidth={2}
              fill="none"
              dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#4f46e5' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and summary */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-indigo-500 rounded" />
            <span>Projected value</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-indigo-500/20 rounded-sm" />
            <span>Confidence range</span>
          </div>
        </div>
        {predictions.length > 0 && (
          <span className="text-indigo-600 font-medium">
            {predictions[predictions.length - 1].probability}% confidence at {predictions[predictions.length - 1].years}yr
          </span>
        )}
      </div>

      {/* Reasoning text */}
      {predictions.length > 0 && (
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {predictions[0].reasoning}
        </p>
      )}
    </div>
  );
}
