import React, { useState, useEffect } from "react";

export default function FundingSourcesExplorer() {
  const [sources, setSources] = useState([]);
  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("All");
  const [entryCategoryFilter, setEntryCategoryFilter] = useState("All");
  const [expandedCode, setExpandedCode] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/data/funding-sources.json");
      const data = await res.json();
      setSources(data);
    }
    load();
  }, []);

  const classificationTypes = [
    "All",
    ...new Set(sources.flatMap((s) => s.classifications.map((c) => c.classificationType))),
  ];
  const entryCategories = [
    "All",
    ...new Set(sources.flatMap((s) => s.entryCategories.map((e) => e.entryCategoryText))),
  ];

  const filtered = sources
    .filter((s) =>
      `${s.fundingSourceText}`.toLowerCase().includes(search.toLowerCase())
    )
    .filter((s) =>
      classificationFilter === "All"
        ? true
        : s.classifications.some((c) => c.classificationType === classificationFilter)
    )
    .filter((s) =>
      entryCategoryFilter === "All"
        ? true
        : s.entryCategories.some((e) => e.entryCategoryText === entryCategoryFilter)
    );

  const badgeColor = (type) => {
    switch (type) {
      case "Ongoing":
        return "bg-green-100 text-green-800";
      case "Short Term":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format sequence inline: "1. A → 2. B → 3. C"
  const formatSequence = (seq) =>
    seq
      .sort((a, b) => a.priority - b.priority)
      .map((s) => `${s.priority}. ${s.budgetTypeText}`)
      .join(" → ");

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800">Support at Home - Funding Sources</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4 text-sm text-slate-700">
        <div>
          <label className="block mb-1">🔍 Search</label>
          <input
            type="text"
            className="border border-slate-300 p-2 rounded-lg w-full"
            placeholder="Search funding sources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">📋 Classification Type</label>
          <select
            className="border border-slate-300 p-2 rounded-lg w-full"
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
          >
            {classificationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">🏷️ Entry Category</label>
          <select
            className="border border-slate-300 p-2 rounded-lg w-full"
            value={entryCategoryFilter}
            onChange={(e) => setEntryCategoryFilter(e.target.value)}
          >
            {entryCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Funding Source Cards */}
      <div className="space-y-4">
        {filtered.map((source) => {
          const isOpen = expandedCode === source.fundingSourceCode;
          return (
            <div
              key={source.fundingSourceCode}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition"
            >
              <button
                onClick={() =>
                  setExpandedCode(isOpen ? null : source.fundingSourceCode)
                }
                className="w-full p-6 text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-semibold text-blue-800">
                      {source.fundingSourceText}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      <strong>Budget Claiming Sequence:</strong>{" "}
                      {formatSequence(source.budgetClaimingSequence)}
                    </p>
                  </div>
                  <div className="text-2xl text-slate-400">
                    {isOpen ? "−" : "+"}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="p-6 border-t border-slate-100 space-y-6">
                  {/* Code */}
                  <div className="text-sm text-slate-600">
                    <strong>Code:</strong> {source.fundingSourceCode}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Entry Categories */}
                    <div>
                      <h3 className="font-medium text-slate-700 mb-2">
                        Entry Categories
                      </h3>
                      <ul className="list-disc list-inside text-sm text-slate-600">
                        {source.entryCategories.map((e) => (
                          <li key={e.entryCategoryCode}>
                            {e.entryCategoryText}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Classifications */}
                    <div>
                      <h3 className="font-medium text-slate-700 mb-2">
                        Classifications
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {source.classifications.map((c) => (
                          <li
                            key={c.classificationCode}
                            className="flex justify-between items-center"
                          >
                            <span>
                              {c.classificationCode} – {c.classificationText}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeColor(
                                c.classificationType
                              )}`}
                            >
                              {c.classificationType}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Budget Claiming Sequence Details */}
                    <div>
                      <h3 className="font-medium text-slate-700 mb-2">
                        Full Budget Sequence
                      </h3>
                      <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                        {source.budgetClaimingSequence
                          .sort((a, b) => a.priority - b.priority)
                          .map((bcs) => (
                            <li
                              key={bcs.priority}
                              className="flex justify-between"
                            >
                              <span>{bcs.budgetTypeText}</span>
                              <span className="font-mono text-xs text-slate-500">
                                {bcs.budgetTypeCode}
                              </span>
                            </li>
                          ))}
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}