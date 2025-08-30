"use client";

import { useMemo, useState } from "react";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);
}

export default function TvmCalculator() {
  const [pv, setPv] = useState<number>(1000);
  const [rate, setRate] = useState<number>(8); // annual %
  const [years, setYears] = useState<number>(5);

  const fv = useMemo(() => pv * Math.pow(1 + rate / 100, years), [pv, rate, years]);
  const pvOfFv = pv;

  return (
    <div className="w-full max-w-xl rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-black/30 backdrop-blur space-y-4">
      <h3 className="text-lg font-semibold">PV/FV Calculator</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-sm">Present Value (PV)</span>
          <input
            type="number"
            value={pv}
            min={0}
            onChange={(e) => setPv(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
          />
        </label>

        <label className="block">
          <span className="text-sm">Rate (%)</span>
          <input
            type="number"
            value={rate}
            min={0}
            step={0.1}
            onChange={(e) => setRate(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
          />
        </label>

        <label className="block">
          <span className="text-sm">Years</span>
          <input
            type="number"
            value={years}
            min={0}
            step={1}
            onChange={(e) => setYears(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-black/70 dark:text-white/70">Future Value (FV)</div>
          <div className="text-2xl font-semibold mt-1">{fmtCurrency(fv)}</div>
          <div className="text-xs mt-1 text-black/60 dark:text-white/60">FV = PV × (1 + r)^n</div>
        </div>

        <div className="rounded-lg border border-black/10 dark:border-white/10 p-4">
          <div className="text-sm text-black/70 dark:text-white/70">PV of FV at same r,n</div>
          <div className="text-2xl font-semibold mt-1">{fmtCurrency(pvOfFv)}</div>
          <div className="text-xs mt-1 text-black/60 dark:text-white/60">PV = FV / (1 + r)^n</div>
        </div>
      </div>

      <p className="text-sm text-black/70 dark:text-white/70">
        Increase rate or years to see compounding grow FV faster and shrink PV for the same future cash flow.
      </p>
    </div>
  );
}
