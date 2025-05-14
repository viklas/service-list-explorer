import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import Fuse from "fuse.js";

export default function ServiceListExplorer() {
  const [data, setData] = useState([]);
  const [prices, setPrices] = useState([]);
  const [group, setGroup] = useState("All");
  const [category, setCategory] = useState("All");
  const [unit, setUnit] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [sortField, setSortField] = useState("serviceId");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetch("/data/service-list.new.json")
      .then((res) => res.json())
      .then(setData);

    fetch("/data/service-price-reference.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const cleaned = parsed.data.map((row) => ({
          Service: row.Service.trim(),
          Unit: row.Unit.trim(),
          Median: parseFloat(row.Median.replace("$", "")),
          Min: parseFloat(row.Min.replace("$", "")),
          Max: parseFloat(row.Max.replace("$", "")),
          Level: parseInt(row.Level)
        }));
        setPrices(cleaned);
      });
  }, []);

  const highlightText = (text) => {
    if (!search || !text) return text;
    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  const getPrice = (item) => {
    const exactLevel3 = prices.find(p => p.Level === 3 && p.Service.toLowerCase() === item.serviceText?.toLowerCase());
    if (exactLevel3) return { ...exactLevel3, matchType: "Exact (L3)", score: 1, matchedLabel: exactLevel3.Service };

    const exactLevel2 = prices.find(p => p.Level === 2 && p.Service.toLowerCase() === item.serviceTypeText?.toLowerCase());
    if (exactLevel2) return { ...exactLevel2, matchType: "Exact (L2)", score: 1, matchedLabel: exactLevel2.Service };

    const fuse3 = new Fuse(prices.filter(p => p.Level === 3), { keys: ['Service'], threshold: 0.4 });
    const fuse2 = new Fuse(prices.filter(p => p.Level === 2), { keys: ['Service'], threshold: 0.4 });

    const fuzzy3 = fuse3.search(item.serviceText || '')[0];
    if (fuzzy3) return { ...fuzzy3.item, matchType: "Fuzzy (L3)", score: 1 - fuzzy3.score, matchedLabel: fuzzy3.item.Service };

    const fuzzy2 = fuse2.search(item.serviceTypeText || '')[0];
    if (fuzzy2) return { ...fuzzy2.item, matchType: "Fuzzy (L2)", score: 1 - fuzzy2.score, matchedLabel: fuzzy2.item.Service };

    return null;
  };

  const groups = ["All", ...new Set(data.map(d => d.serviceGroupText))];
  const categories = ["All", ...new Set(data.map(d => d.participantContributionCategory))];
  const unitTypes = ["All", ...new Set(data.map(d => d.unitType))];

  const filtered = data.filter(item => {
    const matchGroup = group === "All" || item.serviceGroupText === group;
    const matchCategory = category === "All" || item.participantContributionCategory === category;
    const matchUnit = unit === "All" || item.unitType === unit;

    const searchableText = [
      item.serviceGroupText,
      item.serviceTypeText,
      item.serviceText,
      item.unitType,
      item.participantContributionCategory,
      item.serviceId,
      ...(item.classifications?.map(c => `${c.classificationText} ${c.classificationType}`) || []),
      ...(item.items?.map(i => `${i.itemText} ${i.itemId}`) || []),
      ...(item.wraparoundServices?.map(w => `${w.wraparoundServiceText} ${w.wraparoundServiceId}`) || []),
      ...(item.itemCategories?.map(ic => `${ic.itemCategoryText} ${ic.itemCategoryCode}`) || []),
      ...(item.healthProfessionalTypes?.map(h => `${h.healthProfessionalTypeText} ${h.healthProfessionalTypeCode}`) || [])
    ].join(" ").toLowerCase();

    const matchSearch = searchableText.includes(search.toLowerCase());

    return matchGroup && matchCategory && matchUnit && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "price") {
      const priceA = getPrice(a)?.Median || 0;
      const priceB = getPrice(b)?.Median || 0;
      return sortAsc ? priceA - priceB : priceB - priceA;
    } else if (sortField === "serviceId") {
      const idA = a.serviceId?.toString() || "";
      const idB = b.serviceId?.toString() || "";
      return sortAsc ? idA.localeCompare(idB) : idB.localeCompare(idA);
    } else {
      const textA = a[sortField]?.toLowerCase() || "";
      const textB = b[sortField]?.toLowerCase() || "";
      return sortAsc ? textA.localeCompare(textB) : textB.localeCompare(textA);
    }
  });

  const groupedSorted = groups.filter(g => g !== "All").map(g => ({
    name: g,
    services: sorted.filter(s => s.serviceGroupText === g)
  }));

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800">🧭 Support at Home: Service Explorer</h1>
      <p className="text-sm text-slate-600">Based on indicative pricing from the <a href="https://www.health.gov.au/sites/default/files/2025-03/summary-of-indicative-support-at-home-prices_2.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Department of Health Pricing Summary (PDF)</a>.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium text-slate-700">
        <div>
          <label className="block mb-1">🔍 Search</label>
          <input
            className="border border-slate-300 p-2 rounded-lg w-full"
            placeholder="Search anything..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1">📚 Group</label>
          <select className="border border-slate-300 p-2 rounded-lg w-full" value={group} onChange={(e) => setGroup(e.target.value)}>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">🏷️ Category</label>
          <select className="border border-slate-300 p-2 rounded-lg w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">⚖️ Unit Type</label>
          <select className="border border-slate-300 p-2 rounded-lg w-full" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {unitTypes.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-2">
          Sort by:
          <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border p-1 rounded">
            <option value="serviceText">Name</option>
            <option value="price">Price</option>
            <option value="serviceId">Service ID</option>
          </select>
        </label>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="border px-2 py-1 rounded bg-white hover:bg-slate-100"
        >
          {sortAsc ? "⬆️ Asc" : "⬇️ Desc"}
        </button>
      </div>

      <div className="space-y-12">
        {groupedSorted.map(group => (
          <div key={group.name}>
            <h2 className="text-2xl font-semibold text-slate-700 mb-4">{group.name}</h2>
            <div className="space-y-6">
              {group.services.map(item => {
                const price = getPrice(item);
                return (
                  <div key={item.serviceId} className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                    <button className="w-full text-left p-4 flex justify-between items-center" onClick={() => setExpandedId(expandedId === item.serviceId ? null : item.serviceId)}>
                      <div>
                        <div className="text-lg font-semibold text-blue-800 flex items-center gap-3">
                          {highlightText(item.serviceText)}
                          {price && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            ${price.Median.toFixed(0)} avg
                            {price.matchedLabel && (
                              <span className="ml-2 text-[10px] text-slate-600 italic">
                                price sourced from: {price.matchedLabel}
                              </span>
                            )}
                          </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 italic">
                          Group: {highlightText(item.serviceGroupText)} • Type: {highlightText(item.serviceTypeText)}
                        </div>
                      </div>
                      <span className="text-blue-500 text-xl">
                        {expandedId === item.serviceId ? "−" : "+"}
                      </span>
                    </button>
                    {expandedId === item.serviceId && (
                      <div className="px-6 pb-6 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                          <div className="text-sm text-slate-700">
                            <strong>Unit:</strong> {highlightText(item.unitType)} • <strong>Category:</strong> {highlightText(item.participantContributionCategory)}
                          </div>
                          <div className="text-xs text-slate-400">
                            Service ID: {highlightText(item.serviceId)}
                          </div>
                          {item.classifications?.length > 0 && (
                            <div className="text-sm">
                              <strong className="text-slate-700">Classifications:</strong>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {item.classifications.map((c, i) => (
                                  <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                    {highlightText(c.classificationText)} <span className="text-[10px]">({highlightText(c.classificationType)})</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 border-l border-slate-100 pl-4 space-y-3">
                          {item.items?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-1">🧾 Items</h4>
                              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                {item.items.map((i, idx) => (
                                  <li key={idx}>
                                    {highlightText(i.itemText)} <span className="text-xs text-slate-500">({highlightText(i.itemId)})</span> – Units: {i.units.map(u => highlightText(u)).reduce((a, b) => <>{a}, {b}</>)} {i.freeTextRequired && <span className="text-red-600">(free text required)</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.wraparoundServices?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-1">🔄 Wraparound Services</h4>
                              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                {item.wraparoundServices.map((w, idx) => (
                                  <li key={idx}>
                                    {highlightText(w.wraparoundServiceText)} <span className="text-xs text-slate-500">({highlightText(w.wraparoundServiceId)})</span> – Units: {w.units.map(u => highlightText(u)).reduce((a, b) => <>{a}, {b}</>)} {w.freeTextRequired && <span className="text-red-600">(free text required)</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.itemCategories?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-1">📦 Item Categories</h4>
                              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                {item.itemCategories.map((c, idx) => (
                                  <li key={idx}>
                                    {highlightText(c.itemCategoryText)} <span className="text-xs text-slate-500">({highlightText(c.itemCategoryCode)})</span> {c.freeTextRequired && <span className="text-red-600">(free text required)</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.healthProfessionalTypes?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-1">👩‍⚕️ Health Professionals</h4>
                              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                {item.healthProfessionalTypes.map((h, idx) => (
                                  <li key={idx}>
                                    {highlightText(h.healthProfessionalTypeText)} <span className="text-xs text-slate-500">({highlightText(h.healthProfessionalTypeCode)})</span> {h.freeTextRequired && <span className="text-red-600">(free text required)</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
