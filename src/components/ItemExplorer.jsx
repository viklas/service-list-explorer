import React, { useState, useEffect } from "react";

// Utility for copying
function CopyButton({ text, copied, onCopy }) {
  return (
    <button
      onClick={onCopy}
      className="ml-2 text-slate-400 hover:text-blue-600 transition"
      aria-label="Copy code"
      tabIndex={0}
      title="Copy code"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-5-8H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-3" />
      </svg>
      <span className="sr-only">Copy code</span>
      <span className="ml-1 text-xs">{copied ? "Copied!" : ""}</span>
    </button>
  );
}

// Highlight function
function highlightText(text, search) {
  if (!search || !text) return text;
  const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(safeSearch, 'gi');
  const parts = [];
  let lastIndex = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<mark key={match.index} className="bg-yellow-200">{match[0]}</mark>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function ItemExplorer() {
  const [items, setItems] = useState([]);
  const [group, setGroup] = useState("All");
  const [type, setType] = useState("All");
  const [functionText, setFunctionText] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedCode, setExpandedCode] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetch("/data/fixtures/get-service-list.json")
      .then(res => res.json())
      .then(json => {
        let arr = [];
        // See if .data is a stringified array, or it's an array directly or under .services
        if (json && typeof json.data === "string") {
          try { arr = JSON.parse(json.data); } catch { arr = []; }
        } else if (Array.isArray(json)) {
          arr = json;
        } else if (Array.isArray(json.services)) {
          arr = json.services;
        } else if (Array.isArray(json.data)) {
          arr = json.data;
        }
        // Flatten all items with their full context
        const out = [];
        for (const svc of arr) {
          if (svc.items && Array.isArray(svc.items)) {
            for (const item of svc.items) {
              out.push({
                ...item,
                serviceGroupText: svc.serviceGroupText,
                serviceTypeText: svc.serviceTypeText,
                serviceText: svc.serviceText,
                functionText: item.functionText || svc.functionText || "", // try from item, then from service
              });
            }
          }
        }
        setItems(out);
      });
  }, []);

  // Group/filter value lists
  const groups = ["All", ...Array.from(new Set(items.map(i => i.serviceGroupText).filter(Boolean)))];
  const types = ["All", ...Array.from(new Set(items.map(i => i.serviceTypeText).filter(Boolean)))];
  const functions = ["All", ...Array.from(new Set(items.map(i => i.functionText).filter(Boolean)))];

  // Universal search/filter logic
  const filtered = items.filter(item => {
    const matchGroup = group === "All" || item.serviceGroupText === group;
    const matchType = type === "All" || item.serviceTypeText === type;
    const matchFunc = functionText === "All" || item.functionText === functionText;
    const hay = [
      item.serviceGroupText,
      item.serviceTypeText,
      item.functionText,
      item.serviceText,
      item.itemText,
      item.itemId,
      ...(item.units || []),
      item.freeTextRequired ? "free text required" : "",
    ].join(" ").toLowerCase();
    const matchSearch = hay.includes(search.toLowerCase());
    return matchGroup && matchType && matchFunc && matchSearch;
  });

  // Now build: group → type → functionText → serviceText → [items]
  const grouped = {};
  for (const item of filtered) {
    if (!grouped[item.serviceGroupText]) grouped[item.serviceGroupText] = {};
    if (!grouped[item.serviceGroupText][item.serviceTypeText]) grouped[item.serviceGroupText][item.serviceTypeText] = {};
    if (!grouped[item.serviceGroupText][item.serviceTypeText][item.functionText]) grouped[item.serviceGroupText][item.serviceTypeText][item.functionText] = {};
    if (!grouped[item.serviceGroupText][item.serviceTypeText][item.functionText][item.serviceText]) grouped[item.serviceGroupText][item.serviceTypeText][item.functionText][item.serviceText] = [];
    grouped[item.serviceGroupText][item.serviceTypeText][item.functionText][item.serviceText].push(item);
  }

  // Handle copy icon
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  return (
    <div className="relative p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800">Support at Home – Item Explorer</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium text-slate-700 mb-2">
        <div>
          <label className="block mb-1">🔍 Search</label>
          <input
            className="border border-slate-300 p-2 rounded-lg w-full"
            placeholder="Search anything…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">📚 Service Group</label>
          <select
            className="border border-slate-300 p-2 rounded-lg w-full"
            value={group}
            onChange={e => setGroup(e.target.value)}
          >
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">🧩 Service Type</label>
          <select
            className="border border-slate-300 p-2 rounded-lg w-full"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">🏷️ Function</label>
          <select
            className="border border-slate-300 p-2 rounded-lg w-full"
            value={functionText}
            onChange={e => setFunctionText(e.target.value)}
          >
            {functions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* List of items grouped */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([groupName, typeObj]) => (
          <div key={groupName}>
            <h2 className="text-2xl font-semibold text-red-800 mb-2">{groupName}</h2>
            {Object.entries(typeObj).map(([typeName, funcObj]) => (
              <div key={typeName} className="ml-3">
                <h3 className="text-xl font-semibold text-slate-700 mb-1">{typeName}</h3>
                {Object.entries(funcObj).map(([funcName, svcObj]) => (
                  <div key={funcName} className="ml-4">
                    <h4 className="text-lg font-semibold text-blue-800 mb-1">{funcName}</h4>
                    {Object.entries(svcObj).map(([svcName, itemsArr]) => (
                      <div key={svcName} className="ml-4 mb-4">
                        <h5 className="text-base font-semibold text-slate-800 mb-1">{svcName}</h5>
                        <ul className="space-y-2">
                          {itemsArr.map(item => (
                            <li key={item.itemId} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col">
                              <button
                                className="flex justify-between items-center px-5 py-3 text-left focus:outline-none rounded-2xl"
                                onClick={() => setExpandedCode(expandedCode === item.itemId ? null : item.itemId)}
                                aria-expanded={expandedCode === item.itemId}
                                tabIndex={0}
                              >
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <span className="font-semibold text-blue-700">{highlightText(item.itemText, search)}</span>
                                  <span className="text-xs text-slate-500 font-mono">{item.itemId}</span>
                                  <CopyButton
                                    text={item.itemId}
                                    copied={copiedCode === item.itemId}
                                    onCopy={e => {
                                      e.stopPropagation();
                                      handleCopy(item.itemId);
                                    }}
                                  />
                                  {item.freeTextRequired && (
                                    <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">free text required</span>
                                  )}
                                </div>
                                <span className="text-blue-500 text-xl">{expandedCode === item.itemId ? "−" : "+"}</span>
                              </button>
                              {expandedCode === item.itemId && (
                                <div className="px-6 pb-4 pt-1 border-t border-slate-100 bg-blue-50 rounded-b-2xl">
                                  <div className="text-sm text-slate-700 mb-2">
                                    <strong>Service Group:</strong> {item.serviceGroupText}<br />
                                    <strong>Service Type:</strong> {item.serviceTypeText}<br />
                                    <strong>Function:</strong> {item.functionText || <em>Not specified</em>}<br />
                                    <strong>Service:</strong> {item.serviceText}<br />
                                    <strong>Item Code:</strong> {item.itemId}<br />
                                    <strong>Item Name:</strong> {item.itemText}
                                  </div>
                                  {item.units && item.units.length > 0 && (
                                    <div className="text-sm text-slate-700 mt-2">
                                      <strong>Units:</strong> {item.units.join(", ")}
                                    </div>
                                  )}
                                  {item.freeTextRequired && (
                                    <div className="text-sm text-red-700 mt-2">
                                      <strong>Free text required for this item.</strong>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}