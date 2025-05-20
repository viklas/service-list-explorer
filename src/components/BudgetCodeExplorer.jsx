import React, { useEffect, useState, useMemo } from "react";

// --- Rate chip formatting ---
function formatRate(rateObj) {
  if (!rateObj) return null;
  const { rate, frequencyPeriod } = rateObj;
  if (frequencyPeriod === "PERCENTAGE") return `${rate}%`;
  if (rate == null) return null;
  return `$${Number(rate).toLocaleString()}`;
}
function getFirstRate(rates) {
  if (Array.isArray(rates) && rates.length > 0) return rates[0];
  return null;
}

// --- Card UI for one code ---
function BudgetCodeCard({ code, idx, isOpen, onClick }) {
  const firstRate = getFirstRate(code.rates);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow group transition-all mb-4">
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left focus:outline-none rounded-xl"
        onClick={onClick}
        aria-expanded={isOpen}
        tabIndex={0}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="flex-shrink-0 text-blue-600">
            {isOpen ? (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
            ) : (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            )}
          </span>
          <span className="font-semibold text-slate-800 truncate">{code.budgetItemText}</span>
          <span className="text-xs text-slate-500 font-mono truncate">{code.budgetItemCode}</span>
          {firstRate ? (
            <span className="inline-block rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold ml-2">
              {formatRate(firstRate)}
              {firstRate.frequencyPeriod !== "PERCENTAGE" && (
                <span className="ml-1 text-slate-500">
                  {firstRate.frequency && firstRate.frequency !== 1 && <>x{firstRate.frequency} </>}
                  /{firstRate.frequencyPeriod && firstRate.frequencyPeriod.toLowerCase()}
                </span>
              )}
            </span>
          ) : (
            <span className="inline-block rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium ml-2">
              No rate
            </span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 pt-1 border-t border-slate-100 bg-blue-50 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">Budget Code</div>
              <div className="font-mono text-base text-slate-900">{code.budgetItemCode}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">Description</div>
              <div className="text-base text-slate-900">{code.budgetItemText}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-slate-500 font-semibold mb-1">Rates</div>
            {code.rates && code.rates.length > 0 ? (
              <ul className="pl-0">
                {code.rates.map((r, i) => (
                  <li key={i} className="flex items-center mb-1">
                    <span className="inline-block rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold mr-2">
                      {formatRate(r)}
                      {r.frequencyPeriod !== "PERCENTAGE" && (
                        <span className="ml-1 text-slate-500">
                          {r.frequency && r.frequency !== 1 && <>x{r.frequency} </>}
                          /{r.frequencyPeriod && r.frequencyPeriod.toLowerCase()}
                        </span>
                      )}
                    </span>
                    {r.validFrom && (
                      <span className="text-xs text-slate-500 ml-1">
                        Valid: {r.validFrom}
                        {r.validTo && r.validTo !== "9999-01-01" && <> – {r.validTo}</>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="italic text-gray-400">No rates listed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BudgetCodeExplorer() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("entitlementCodes");
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("All");
  const [openIdx, setOpenIdx] = useState(null);

  useEffect(() => {
    fetch("/data/fixtures/get-budget-codes.json")
      .then((res) => res.json())
      .then((raw) => {
        let d = null;
        // Defensive: API might return {statusCode, headers, data: "...json..."}
        if (raw && typeof raw.data === "string") {
          try {
            d = JSON.parse(raw.data);
          } catch (e) {
            console.error("Failed to parse .data JSON string:", e, raw.data);
          }
        }
        // If top-level is array-like, just use it
        if (!d && Array.isArray(raw)) d = { entitlementCodes: raw, usageCodes: [] };
        // If already object with entitlementCodes, good
        if (!d && raw.entitlementCodes) d = raw;
        if (!d) d = { entitlementCodes: [], usageCodes: [] };
        setData(d);
      });
  }, []);

  const allocationPeriods = useMemo(() => {
    if (!data) return [];
    const list = (data[view] || []).flatMap((c) =>
      (c.rates || []).map((r) => r.frequencyPeriod)
    );
    return ["All", ...Array.from(new Set(list)).filter(Boolean)];
  }, [data, view]);

  const filteredCodes = useMemo(() => {
    if (!data) return [];
    let list = data[view] || [];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.budgetItemText?.toLowerCase().includes(s) ||
          c.budgetItemCode?.toLowerCase().includes(s) ||
          (c.rates &&
            c.rates.some(
              (r) =>
                String(r.rate).toLowerCase().includes(s) ||
                r.frequencyPeriod?.toLowerCase().includes(s)
            ))
      );
    }
    if (filterPeriod !== "All") {
      list = list.filter(
        (c) =>
          c.rates &&
          c.rates.some((r) => r.frequencyPeriod === filterPeriod)
      );
    }
    return list;
  }, [data, view, search, filterPeriod]);

  return (
    <div className="relative p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800">Support at Home - Budget Code Explorer</h1>

      {/* Toggle for Entitlement/Usage */}
      <div className="flex gap-3 mb-4">
        <button
          className={`px-3 py-1 rounded font-medium border ${view === "entitlementCodes"
            ? "bg-blue-600 text-white border-blue-700"
            : "bg-gray-100 text-gray-700 border-gray-300"}`}
          onClick={() => setView("entitlementCodes")}
        >
          Entitlement Codes
        </button>
        <button
          className={`px-3 py-1 rounded font-medium border ${view === "usageCodes"
            ? "bg-blue-600 text-white border-blue-700"
            : "bg-gray-100 text-gray-700 border-gray-300"}`}
          onClick={() => setView("usageCodes")}
        >
          Usage Codes
        </button>
      </div>

      {/* Filters/Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm mb-4">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-600 mb-1 pl-1" htmlFor="budget-search">Search</label>
          <input
            id="budget-search"
            type="text"
            placeholder="🔍 Search code or text…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border px-3 py-1 rounded"
            aria-label="Search"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-slate-600 mb-1 pl-1" htmlFor="allocation-period">Allocation Period</label>
          <select
            id="allocation-period"
            className="border px-3 py-1 rounded"
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
          >
            {allocationPeriods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards List */}
      <div>
        {filteredCodes.length === 0 ? (
          <div className="text-gray-400 italic p-4 text-center">
            No budget codes match your search/filter.
          </div>
        ) : (
          filteredCodes.map((code, idx) => (
            <BudgetCodeCard
              key={code.budgetItemCode}
              code={code}
              idx={idx}
              isOpen={openIdx === idx}
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            />
          ))
        )}
      </div>
    </div>
  );
}