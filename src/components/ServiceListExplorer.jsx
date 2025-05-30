import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import Fuse from "fuse.js";

const SERVICE_TYPE_DESCRIPTIONS = {
  "Allied health and therapy services": "The provision of supplementary services that restore, improve, or maintain an older person's health, wellbeing and independence.",
  "Community cottage respite": "The provision of overnight care delivered in a cottage-style respite facility setting to support and maintain care relationships between older people and their carers.",
  "Domestic assistance": "The provision of or assistance with domestic services to ensure an older person remains safe at home.",
  "Equipment and products": "The provision of goods, equipment, or assistive technology to enable an older person to perform tasks they would otherwise be unable to do, promote safety and independence, or support wellness and reablement goals.",
  "Hoarding and squalor assistance": "The provision of support for an older person who is homeless, at risk of homelessness, or unable to receive the aged care supports they need because of living with hoarding behaviour or living in a squalid environment.",
  "Home adjustments": "The provision of modifications to an older person's home to prevent accidents and support independent living.",
  "Home maintenance and repairs": "The provision of or assistance with maintenance of the house and garden to ensure a safe and habitable home environment or facilitate wellness and reablement goals.",
  "Home or community general respite": "The provision of respite as a form of temporary relief to support and maintain care relationships between older people and their carers.",
  "Meals": "The provision of meals to older people to ensure proper nutrition is maintained, including advice on meal preparation.",
  "Nursing care": "The provision of clinical care supports and education services provided by a nurse.",
  "Personal care": "The provision of support for an older person to engage in activities of daily living that help them maintain appropriate standards of hygiene and grooming.",
  "Social support and community engagement": "The delivery of services that support an older person's need for social connection and participation in community life including diverse cultural activities.",
  "Specialised Support Services": "The provision of specialised services for frail older people who are living at home with a clinical condition and/or specialised needs.",
  "Therapeutic services for independent living": "The provision of supplementary therapy services that enhances functional independencies in daily living activities.",
  "Transport": "The provision of direct and indirect transport services to connect an older person with the community and attend their usual activities."
};

export default function ServiceListExplorer() {
  const [data, setData] = useState([]);
  const [prices, setPrices] = useState([]);
  const [group, setGroup] = useState("All");
  const [category, setCategory] = useState("All");
  const [unit, setUnit] = useState("All");
  const [serviceType, setServiceType] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [sortField, setSortField] = useState("serviceId");
  const [sortAsc, setSortAsc] = useState(true);
  const [uploadRules, setUploadRules] = useState([]);

  useEffect(() => {
    fetch("/data/fixtures/get-service-list.json")
      .then((res) => res.json())
      .then((json) => {
        // console.log("Raw JSON fetched:", json);

        // Check if there's a 'data' property that is a string (stringified array)
        if (json && typeof json.data === "string") {
          try {
            const parsed = JSON.parse(json.data);
            if (Array.isArray(parsed)) {
              // console.log("Parsed data from stringified JSON array:", parsed.length, "items");
              setData(parsed);
              return;
            }
          } catch (e) {
            console.error("Failed to parse 'data' string as JSON array:", e, json.data);
          }
        }

        if (Array.isArray(json)) {
          setData(json);
        } else if (Array.isArray(json.services)) {
          setData(json.services);
        } else if (Array.isArray(json.data)) {
          setData(json.data);
        } else {
          console.warn("Could not detect array. JSON shape:", json);
          setData([]);
        }
      })
      .catch((e) => {
        console.error("Failed to load service list JSON:", e);
        setData([]);
      });

    fetch("/data/Upload_Required_Business_Rules.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const cleaned = parsed.data.map(row => ({
          serviceId: row.Service_ID.trim(),
          requirement: row.Upload_Requred.trim(),
          condition: row.Conditions.trim()
        }));
        setUploadRules(cleaned);
      });

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

  // CSV conversion and download functions
  function convertToCsv(rows) {
    if (!rows.length) return '';
    const keys = Object.keys(rows[0]).filter(
      k => !['classifications', 'items', 'wraparoundServices', 'itemCategories', 'healthProfessionalTypes'].includes(k)
    );
    const csvRows = [keys.join(',')];
    rows.forEach(row => {
      const values = keys.map(k => {
        let v = row[k];
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
        if (typeof v === 'undefined' || v === null) v = '';
        return `"${String(v).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
  }

  function handleDownloadCsv() {
    const csv = convertToCsv(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service-list.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  const getUploadRequirement = (serviceId) =>
    uploadRules.filter(rule => rule.serviceId === serviceId);

  const highlightText = (text) => {
    if (!search || !text) return text;
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeSearch, 'gi');
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <mark key={match.index} className="bg-yellow-200">{match[0]}</mark>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  // Keep your getPrice logic as is (uses serviceText/serviceTypeText)
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

  // --- Filter values from the new structure
  const groups = ["All", ...new Set(data.map(d => d.serviceGroupText))];
  const categories = ["All", ...new Set(data.map(d => d.participantContributionCategory))];
  const unitTypes = ["All", ...new Set(data.map(d => d.unitType))];
  const serviceTypes = ["All", ...new Set(data.map(d => d.serviceTypeText))];

  // --- Universal search and filters
  const filtered = data.filter(item => {
    const matchGroup = group === "All" || item.serviceGroupText === group;
    const matchCategory = category === "All" || item.participantContributionCategory === category;
    const matchUnit = unit === "All" || item.unitType === unit;
    const matchServiceType = serviceType === "All" || item.serviceTypeText === serviceType;

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

    return matchGroup && matchCategory && matchUnit && matchServiceType && matchSearch;
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

  const groupedSorted = groups.filter(g => g !== "All").map(g => {
    const servicesInGroup = sorted.filter(s => s.serviceGroupText === g);
    const typeBuckets = [...new Set(servicesInGroup.map(s => s.serviceTypeText || "Other"))];

    return {
      name: g,
      subgroups: typeBuckets.map(t => ({
        type: t,
        services: servicesInGroup.filter(s => s.serviceTypeText === t)
      }))
    };
  });

  const renderUploadBadge = (serviceId) => {
    const uploads = getUploadRequirement(serviceId);
    if (!uploads.length) return null;

    return uploads.map((upload, idx) => (
      <span
        key={`${serviceId}-${idx}`}
        className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs"
      >
        📎 {upload.requirement} ({upload.condition})
      </span>
    ));
  };

  // Category-to-badge mapping
  const getCoContributionRate = (category) => {
    if (!category) return null;
    if (category.toLowerCase().includes("clinical")) return "0%";
    if (category.toLowerCase().includes("independence")) return "5%–50%";
    if (category.toLowerCase().includes("everyday")) return "17.5%–80%";
    return null;
  };

  return (
    <div className="relative p-6 space-y-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <h1 className="text-3xl font-bold text-slate-800">Support at Home - Service List Explorer</h1>
      <p className="text-sm text-slate-600">
        Average prices are extracted from indicative pricing from the{' '}
        <a
          href="https://www.health.gov.au/sites/default/files/2025-03/summary-of-indicative-support-at-home-prices_2.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          Department of Health Pricing Summary (PDF)
        </a>
        .
      </p>
      <div className="flex mb-4">
        <button
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
          onClick={handleDownloadCsv}
        >
          ⬇️ Download CSV
        </button>
      </div>
      {/* Filter controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-sm font-medium text-slate-700">
        {/* Search & Filters */}
        <div>
          <label className="block mb-1">🔍 Search</label>
          <input className="border border-slate-300 p-2 rounded-lg w-full" placeholder="Search anything..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <label className="block mb-1">🧩 Service Type</label>
          <select className="border border-slate-300 p-2 rounded-lg w-full" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            {serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">⚖️ Unit Type</label>
          <select className="border border-slate-300 p-2 rounded-lg w-full" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {unitTypes.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex justify-end gap-4 text-sm text-slate-600">
        <label className="flex items-center gap-2">
          Sort by:
          <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="border p-1 rounded">
            <option value="serviceText">Name</option>
            <option value="price">Price</option>
            <option value="serviceId">Service ID</option>
          </select>
        </label>
        <button onClick={() => setSortAsc(!sortAsc)} className="border px-2 py-1 rounded bg-white hover:bg-slate-100">
          {sortAsc ? "⬆️ Asc" : "⬇️ Desc"}
        </button>
      </div>

      {/* Grouped Services */}
      <div className="space-y-12">
        {groupedSorted.map((group) => (
          <div key={group.name}>
            <h2 className="text-2xl font-semibold text-red-800 mb-4">{highlightText(group.name)}</h2>
            <div className="space-y-6">
              {group.subgroups.map((sub) => (
                <div key={sub.type} className="mb-8">
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">{highlightText(sub.type)}</h3>
                  {SERVICE_TYPE_DESCRIPTIONS[sub.type] && (
                    <p className="text-sm text-slate-400 mb-4 max-w-4xl">
                      {SERVICE_TYPE_DESCRIPTIONS[sub.type]}
                    </p>
                  )}
                  <div className="space-y-6">
                    {sub.services.map((item) => {
                      const price = getPrice(item);
                      return (
                        <div key={item.serviceId} className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                          <button className="w-full text-left p-4 flex justify-between items-center"
                            onClick={() => setExpandedId(expandedId === item.serviceId ? null : item.serviceId)}>
                            <div>
                              <div className="text-lg font-semibold text-blue-800 flex items-center gap-3">
                                <span>{highlightText(item.serviceText)}</span>
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
                                {/* Co Contribution Rate Badge */}
                                {(() => {
                                  const rate = getCoContributionRate(item.participantContributionCategory);
                                  return rate ? (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs ml-2">
                                      % Contribution Rate: <strong>{rate}</strong>
                                    </span>
                                  ) : null;
                                })()}
                                {renderUploadBadge(item.serviceId)}
                              </div>
                              <div className="text-sm text-slate-500 italic">
                                <span>{highlightText(item.participantContributionCategory)}</span>
                              </div>
                            </div>
                            <span className="text-blue-500 text-xl">
                              {expandedId === item.serviceId ? "−" : "+"}
                            </span>
                          </button>

                          {/* Expanded Details (unchanged) */}
                          {expandedId === item.serviceId && (
                            <div className="px-6 pb-6 flex flex-col md:flex-row gap-6">
                              <div className="flex-1 space-y-3">
                                <div className="text-sm text-slate-700">
                                  <strong>Unit:</strong>{" "}
                                  <span className="inline">{highlightText(item.unitType)}</span>
                                </div>
                                <div className="text-xs text-slate-400">
                                  Service ID:{" "}
                                  <span className="inline">{highlightText(item.serviceId)}</span>
                                </div>
                                {item.classifications?.length > 0 && (
                                  <div className="text-sm">
                                    <strong className="text-slate-700">Classifications:</strong>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.classifications.map((c, i) => (
                                        <span
                                          key={i}
                                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                                        >
                                          {highlightText(c.classificationText)}{" "}
                                          <span className="text-[10px]">
                                            ({highlightText(c.classificationType)})
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 border-l border-slate-100 pl-4 space-y-3">
                                {item.items?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-slate-700 mb-1">
                                      🧾 Items
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                      {item.items.map((i, idx) => (
                                        <li key={idx}>
                                          {highlightText(i.itemText)}{" "}
                                          <span className="text-xs text-slate-500">
                                            ({highlightText(i.itemId)})
                                          </span>{" "}
                                          – Units:{" "}
                                          {i.units
                                            .map((u) => highlightText(u))
                                            .reduce((a, b) => (
                                              <>
                                                {a}, {b}
                                              </>
                                            ))}
                                          {i.freeTextRequired && (
                                            <span className="text-red-600">
                                              (free text required)
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {item.wraparoundServices?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-slate-700 mb-1">
                                      🔄 Wraparound Services
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                      {item.wraparoundServices.map((w, idx) => (
                                        <li key={idx}>
                                          {highlightText(w.wraparoundServiceText)}{" "}
                                          <span className="text-xs text-slate-500">
                                            ({highlightText(w.wraparoundServiceId)})
                                          </span>{" "}
                                          – Units:{" "}
                                          {w.units
                                            .map((u) => highlightText(u))
                                            .reduce((a, b) => (
                                              <>
                                                {a}, {b}
                                              </>
                                            ))}
                                          {w.freeTextRequired && (
                                            <span className="text-red-600">
                                              (free text required)
                                            </span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {item.itemCategories?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-slate-700 mb-1">
                                      📦 Item Categories
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                      {item.itemCategories.map((c, idx) => (
                                        <li key={idx}>
                                          {highlightText(c.itemCategoryText)}{" "}
                                          <span className="text-xs text-slate-500">
                                            ({highlightText(c.itemCategoryCode)})
                                          </span>{" "}
                                          {c.freeTextRequired && (
                                            <span className="text-red-600">(free text required)</span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {item.healthProfessionalTypes?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-slate-700 mb-1">
                                      👩‍⚕️ Health Professionals
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                      {item.healthProfessionalTypes.map((h, idx) => (
                                        <li key={idx}>
                                          {highlightText(h.healthProfessionalTypeText)}{" "}
                                          <span className="text-xs text-slate-500">
                                            ({highlightText(h.healthProfessionalTypeCode)})
                                          </span>{" "}
                                          {h.freeTextRequired && (
                                            <span className="text-red-600">(free text required)</span>
                                          )}
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
        ))}
      </div>
    </div>
  );
}