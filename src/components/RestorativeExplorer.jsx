import React, { useState, useEffect } from "react";
import Papa from "papaparse";

export default function RestorativeExplorer() {
  const [items, setItems] = useState([]);
  const [scope, setScope] = useState("Included");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [copiedActivity, setCopiedActivity] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/data/section13_restorative_care.csv");
      const text = await res.text();
      const { data } = Papa.parse(text, { header: true });
      setItems(data.filter((r) => r.Activity));
    }
    load();
  }, []);

  const scopes     = ["Included", "Excluded", "All"];
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.Category))).sort()];

  const filtered = items
    .filter((i) => (scope === "All" ? true : i.Scope === scope))
    .filter((i) => (categoryFilter === "All" ? true : i.Category === categoryFilter))
    .filter((i) =>
      `${i.Category} ${i.Activity}`.toLowerCase().includes(search.toLowerCase())
    );

  const grouped = categories
    .filter((cat) => cat !== "All")
    .reduce((acc, cat) => {
      const list = filtered.filter((i) => i.Category === cat);
      if (list.length) acc[cat] = list;
      return acc;
    }, {});

  const handleCopy = (activity) => {
    navigator.clipboard.writeText(activity).then(() => {
      setCopiedActivity(activity);
      setTimeout(() => setCopiedActivity(null), 2000);
    });
  };

  return (
    <div className="relative p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Support at Home - Restorative Care Activities
        </h1>
        <p className="text-sm text-slate-600">
                    Restorative Care Management Activities List from Section 13 of{' '}
                    <a
                        href="https://www.health.gov.au/sites/default/files/2025-05/support-at-home-program-manual-a-guide-for-registered-providers_0.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                    >
                        Support at Home Program Manual v2.1 (May 2025) (PDF)
                    </a>
                    .
                </p>
                <br></br>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm font-medium text-slate-700 mb-4">
          {/* Search */}
          <div>
            <label className="block mb-1">🔍 Search</label>
            <input
              type="text"
              className="border border-slate-300 p-2 rounded-lg w-full"
              placeholder="Search activities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Scope */}
          <div>
            <label className="block mb-1">✔️ Scope</label>
            <select
              className="border border-slate-300 p-2 rounded-lg w-full"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              {scopes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {/* Category */}
          <div>
            <label className="block mb-1">🏷️ Category</label>
            <select
              className="border border-slate-300 p-2 rounded-lg w-full"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grouped List */}
        {Object.entries(grouped).map(([cat, itemsInCat]) => (
          <div key={cat} className="mb-8">
            <h2 className="text-2xl font-semibold text-red-800 mb-4">{cat}</h2>
            <ul className="space-y-4">
              {itemsInCat.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-4"
                >
                  {/* Activity text takes full remaining width */}
                  <span className="flex-1 mr-4 text-lg font-semibold text-blue-700">
                    {item.Activity}
                  </span>

                  {/* Copy button + badge container */}
                  <div className="flex-none flex items-center space-x-3">
                    <button
                      onClick={() => handleCopy(item.Activity)}
                      className="flex items-center space-x-1 text-slate-500 hover:text-slate-700"
                      aria-label="Copy item"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16h8M8 12h8m-5-8H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-3"
                        />
                      </svg>
                      <span className="text-xs">
                        {copiedActivity === item.Activity ? "Copied!" : "Copy item"}
                      </span>
                    </button>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        item.Scope === "Included"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.Scope}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}