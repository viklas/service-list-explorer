import React, { useState, useEffect } from "react";

export default function ServiceListExplorer() {
  const [data, setData] = useState([]);
  const [group, setGroup] = useState("All");
  const [category, setCategory] = useState("All");
  const [unit, setUnit] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch("/data/service-list.new.json")
      .then((res) => res.json())
      .then(setData);
  }, []);

  const highlightText = (text) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
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

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800">🧭 Support at Home: Service Explorer</h1>
      <div className="flex flex-wrap gap-4 items-center">
        <input
          className="border border-slate-300 p-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400 w-full sm:w-1/3"
          placeholder="🔍 Search anything..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-slate-300 p-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          className="border border-slate-300 p-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="border border-slate-300 p-2 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-400"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          {unitTypes.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <div className="overflow-y-scroll max-h-[70vh] space-y-6 pr-2">
        {filtered.map((item) => (
          <div
            key={item.serviceId}
            className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <button
              className="w-full text-left p-4 flex justify-between items-center"
              onClick={() => setExpandedId(expandedId === item.serviceId ? null : item.serviceId)}
            >
              <div>
                <div className="text-lg font-semibold text-blue-800">{highlightText(item.serviceText)}</div>
                <div className="text-sm text-slate-500 italic">
                  Group: {highlightText(item.serviceGroupText)} &bull; Type: {highlightText(item.serviceTypeText)}
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
                    <strong>Unit:</strong> {highlightText(item.unitType)} &nbsp;|&nbsp;
                    <strong>Category:</strong> {highlightText(item.participantContributionCategory)}
                  </div>
                  <div className="text-xs text-slate-400">Service ID: {highlightText(item.serviceId)}</div>

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
        ))}
      </div>
    </div>
  );
}
