'use client';

type Metrics = {
  totalAppraisals: number;
  avgOfferAmount: number;
  acceptRate: number;
  totalOfferValue: number;
  pendingReviewCount: number;
  fulfillmentRate: number;
};

export function MetricsCards({ metrics }: { metrics: Metrics }) {
  const cards = [
    {
      label: 'Total Appraisals',
      value: metrics.totalAppraisals.toString(),
      color: 'text-slate-900',
    },
    {
      label: 'Avg Offer',
      value: `$${metrics.avgOfferAmount.toFixed(0)}`,
      color: 'text-slate-900',
    },
    {
      label: 'Accept Rate',
      value: `${metrics.acceptRate}%`,
      color: metrics.acceptRate >= 50 ? 'text-green-600' : 'text-slate-900',
    },
    {
      label: 'Revenue (Fulfilled)',
      value: `$${metrics.totalOfferValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      color: 'text-green-600',
    },
    {
      label: 'Fulfillment Rate',
      value: `${metrics.fulfillmentRate}%`,
      color: metrics.fulfillmentRate >= 75 ? 'text-blue-600' : metrics.fulfillmentRate > 0 ? 'text-orange-600' : 'text-slate-900',
    },
    {
      label: 'Needs Review',
      value: metrics.pendingReviewCount.toString(),
      color: metrics.pendingReviewCount > 0 ? 'text-amber-600' : 'text-slate-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
