import React, { useState, useEffect, useCallback, useMemo } from "react";
import Papa from "papaparse";
import Fuse from "fuse.js";
import Masonry from "react-masonry-css";

// --- UI/utility components ---
function InfoCard({ title, children, className = "" }) {
  return (
    <div className={`p-4 bg-gray-50 border rounded-lg shadow-sm ${className}`}>
      <h3 className="font-semibold mb-2 text-slate-700">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
function InfoRow({ label, children }) {
  return (
    <div className="flex mb-1">
      <div className="w-40 font-semibold text-slate-600">{label}:</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function highlight(text, term) {
  if (!term || !text) return text;
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safeTerm, "gi");
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<mark key={m.index} className="bg-yellow-200">{m[0]}</mark>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function Breadcrumbs({ path, onCrumb }) {
  return (
    <div className="text-xs mb-2 text-slate-600">
      {path.map((node, i) => (
        <span key={node.id}>
          {i > 0 && " / "}
          <button
            className="hover:underline text-blue-600"
            onClick={() => onCrumb(i)}
          >
            {node.name}
          </button>
        </span>
      ))}
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function ServiceHierarchyExplorer() {
  const [treeData, setTreeData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [path, setPath] = useState([]);
  const [prices, setPrices] = useState([]);
  const [showTree, setShowTree] = useState(false);

  // --- Data loading and cross-linking
  useEffect(() => {
    Promise.all([
      fetch("/data/service-list.new.json").then((r) => r.json()),
      fetch("/data/funding-sources.json").then((r) => r.json()),
      fetch("/data/section7_care_management.csv")
        .then((r) => r.text())
        .then((text) => Papa.parse(text, { header: true, skipEmptyLines: true }).data),
      fetch("/data/section13_restorative_care.csv")
        .then((r) => r.text())
        .then((text) => Papa.parse(text, { header: true, skipEmptyLines: true }).data),
      fetch("/data/service-price-reference.csv")
        .then((res) => res.text())
        .then((text) => Papa.parse(text, { header: true, skipEmptyLines: true }).data),
    ]).then(([services, funding, careMgmt, restorative, pricesCsv]) => {
      setPrices(
        pricesCsv.map((r) => ({
          Service: r.Service.trim(),
          Unit: r.Unit.trim(),
          Median: parseFloat(r.Median.replace("$", "")),
          Min: parseFloat(r.Min.replace("$", "")),
          Max: parseFloat(r.Max.replace("$", "")),
          Level: parseInt(r.Level),
        }))
      );

      // Build hierarchy
      const groups = {};
      services.forEach((svc) => {
        const {
          serviceGroupId,
          serviceGroupText,
          serviceTypeId,
          serviceTypeText,
          serviceId,
          serviceText,
          participantContributionCategory,
          unitType,
          items,
          wraparoundServices,
          itemCategories,
          healthProfessionalTypes,
          classifications,
        } = svc;

        if (!groups[serviceGroupId]) {
          groups[serviceGroupId] = {
            id: `group:${serviceGroupId}`,
            name: serviceGroupText,
            children: {},
          };
        }
        const group = groups[serviceGroupId];

        if (!group.children[serviceTypeId]) {
          group.children[serviceTypeId] = {
            id: `type:${serviceTypeId}`,
            name: serviceTypeText,
            children: {},
          };
        }
        const type = group.children[serviceTypeId];

        type.children[serviceId] = {
          id: `svc:${serviceId}`,
          name: serviceText,
          meta: {
            serviceGroupText,
            serviceTypeText,
            serviceId,
            serviceText,
            participantContributionCategory,
            unitType,
            items,
            wraparoundServices,
            itemCategories,
            healthProfessionalTypes,
            classifications,
            _fundingSourceLinks: [],
            _careActivities: [],
            _restorativeActivities: [],
          },
        };
      });

      // Cross-link concepts
      Object.values(groups).forEach((g) =>
        Object.values(g.children).forEach((t) =>
          Object.values(t.children).forEach((svcNode) => {
            // Funding sources: match by entryCategory or classification
            let fundingLinks = [];
            funding.forEach((fs) => {
              fs.entryCategories?.forEach((ec) => {
                if (
                  svcNode.meta.participantContributionCategory &&
                  ec.entryCategoryText &&
                  svcNode.meta.participantContributionCategory
                    .toLowerCase()
                    .includes(ec.entryCategoryText.toLowerCase())
                ) {
                  fundingLinks.push({
                    fundingSourceText: fs.fundingSourceText,
                    entryCategoryText: ec.entryCategoryText,
                  });
                }
              });
              fs.classifications?.forEach((cl) => {
                if (
                  svcNode.meta.classifications?.some((svcCl) =>
                    svcCl.classificationText
                      .toLowerCase()
                      .includes(cl.classificationText.toLowerCase())
                  )
                ) {
                  fundingLinks.push({
                    fundingSourceText: fs.fundingSourceText,
                    classificationText: cl.classificationText,
                  });
                }
              });
            });
            svcNode.meta._fundingSourceLinks = fundingLinks;

            // Care Management Activities: fuzzy match
            const fuseCare = new Fuse(careMgmt, {
              keys: ["Activity"],
              threshold: 0.4,
            });
            const careMatches = fuseCare.search(svcNode.name, { limit: 3 });
            svcNode.meta._careActivities = careMatches.map((m) => m.item);

            // Restorative Activities: fuzzy match
            const fuseRest = new Fuse(restorative, {
              keys: ["Activity"],
              threshold: 0.4,
            });
            const restMatches = fuseRest.search(svcNode.name, { limit: 3 });
            svcNode.meta._restorativeActivities = restMatches.map((m) => m.item);
          })
        )
      );

      setTreeData({
        id: "root",
        name: "All Services",
        children: Object.values(groups).map((g) => ({
          ...g,
          children: Object.values(g.children).map((t) => ({
            ...t,
            children: Object.values(t.children),
          })),
        })),
      });
    });
  }, []);

  // --- Filters and options
  const [groupOptions, typeOptions, categoryOptions] = useMemo(() => {
    if (!treeData) return [[], [], []];
    const groups = treeData.children.map((g) => g.name);
    let types = [];
    let cats = [];
    treeData.children.forEach((g) => {
      g.children.forEach((t) => {
        types.push(t.name);
        t.children.forEach((s) => {
          cats.push(s.meta.participantContributionCategory);
        });
      });
    });
    return [
      ["All", ...new Set(groups)],
      ["All", ...new Set(types)],
      ["All", ...new Set(cats)],
    ];
  }, [treeData]);

  // --- Pricing logic
  function getPrice(item) {
    const ex3 =
      prices.find(
        (p) =>
          p.Level === 3 &&
          p.Service.toLowerCase() === item.serviceText?.toLowerCase()
      ) || null;
    if (ex3) return { ...ex3, matchType: "Exact (L3)" };

    const ex2 =
      prices.find(
        (p) =>
          p.Level === 2 &&
          p.Service.toLowerCase() === item.serviceTypeText?.toLowerCase()
      ) || null;
    if (ex2) return { ...ex2, matchType: "Exact (L2)" };

    const fuse3 = new Fuse(prices.filter((p) => p.Level === 3), {
      keys: ["Service"],
      threshold: 0.4,
    });
    const fuse2 = new Fuse(prices.filter((p) => p.Level === 2), {
      keys: ["Service"],
      threshold: 0.4,
    });
    const f3 = item.serviceText ? fuse3.search(item.serviceText)[0] : null;
    if (f3) return { ...f3.item, matchType: "Fuzzy (L3)", score: 1 - f3.score };
    const f2 = item.serviceTypeText
      ? fuse2.search(item.serviceTypeText)[0]
      : null;
    if (f2) return { ...f2.item, matchType: "Fuzzy (L2)", score: 1 - f2.score };

    return null;
  }

  // --- Tree filtering/pruning logic (always fully expanded on load and on search/filter)
  const filteredTree = useMemo(() => {
    if (!treeData) return null;
    const term = searchTerm.trim().toLowerCase();

    function flattenStrings(obj) {
      // Recursively extract all strings for deep search
      if (typeof obj === "string") return [obj];
      if (Array.isArray(obj)) return obj.flatMap(flattenStrings);
      if (typeof obj === "object" && obj !== null) {
        return Object.values(obj).flatMap(flattenStrings);
      }
      return [];
    }

    function recurse(node, lineage = []) {
      if (!node.children) {
        const { meta } = node;
        const okFilter =
          (filterGroup === "All" || meta.serviceGroupText === filterGroup) &&
          (filterType === "All" || meta.serviceTypeText === filterType) &&
          (filterCategory === "All" || meta.participantContributionCategory === filterCategory);

        // UNIVERSAL SEARCH SCOPE: flatten all string data for full-text match
        const hay = [
          node.name,
          ...flattenStrings(meta)
        ]
          .join(" ")
          .toLowerCase();

        const okSearch = !term || hay.includes(term);

        if (okFilter && okSearch) {
          return { ...node, _lineage: [...lineage, node] };
        }
        return null;
      }
      // branch
      const kids = node.children
        .map((child) => recurse(child, [...lineage, node]))
        .filter(Boolean);
      if (
        kids.length > 0 ||
        (!term &&
          filterGroup === "All" &&
          filterType === "All" &&
          filterCategory === "All")
      ) {
        return { ...node, children: kids, _lineage: [...lineage, node] };
      }
      return null;
    }
    return recurse(treeData);
  }, [treeData, searchTerm, filterGroup, filterType, filterCategory]);

  // --- Selection logic, always expand all by default
  const handleCrumb = useCallback((index) => {
    if (!selected || !selected._lineage) return;
    const node = selected._lineage[index];
    setSelected(node);
    setPath(selected._lineage.slice(0, index + 1));
  }, [selected]);
  const handleSelect = useCallback((node) => {
    setSelected(node);
    if (node._lineage) setPath(node._lineage);
    else setPath([]);
  }, []);

  // --- TreeNode: always open for every branch shown
  function TreeNode({ node, depth = 0, onSelect, searchTerm, selectedId }) {
    const hasChildren = node.children && node.children.length > 0;
    const isMatch = searchTerm
      ? node.name.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const isSelected = node.id === selectedId;
    const isLeaf = !hasChildren;
  
    return (
      <div style={{ marginLeft: depth * 16 }}>
        <div
          className={
            `flex items-center py-1 cursor-pointer select-none rounded 
            ${isMatch ? "bg-yellow-100" : ""} 
            ${isSelected ? "bg-blue-100 font-bold text-blue-900 ring-2 ring-blue-300" : ""}`
          }
          tabIndex={0}
          role="treeitem"
          aria-expanded={hasChildren ? true : undefined}
          onClick={() => onSelect(node)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") onSelect(node);
          }}
        >
          {hasChildren && <span className="mr-1">🔽</span>}
          <span className={isLeaf ? "italic" : ""}>
            {highlight(node.name, searchTerm)}
          </span>
        </div>
        {hasChildren &&
          node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              searchTerm={searchTerm}
              selectedId={selectedId}
            />
          ))}
      </div>
    );
  }

  // --- Info panel clickable links (funding, activity)
  function FundingLink({ fundingSourceText }) {
    return (
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-1 text-xs">
        {fundingSourceText}
      </span>
    );
  }
  function ActivityLink({ activity }) {
    return (
      <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full mr-1 text-xs" title={activity.Scope || ""}>
        {activity.Activity}
      </span>
    );
  }

  // --- Main render
  return (
    <div className="p-6 bg-white shadow rounded-lg">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">
        Support at Home - Linked Concept Wiki
      </h1>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm w-full">
          <div className="mb-2 md:hidden">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={() => setShowTree(true)}
              aria-label="Show service tree"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              Show Service List
            </button>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-1 pl-1" htmlFor="service-search">Search</label>
            <input
              id="service-search"
              type="text"
              placeholder="🔍 Search anything…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border px-3 py-1 rounded"
              aria-label="Search"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-1 pl-1" htmlFor="filter-group">Service Group</label>
            <select
              id="filter-group"
              className="border px-3 py-1 rounded"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              aria-label="Filter by group"
            >
              {groupOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-1 pl-1" htmlFor="filter-type">Service Type</label>
            <select
              id="filter-type"
              className="border px-3 py-1 rounded"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter by type"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-600 mb-1 pl-1" htmlFor="filter-category">Contribution Category</label>
            <select
              id="filter-category"
              className="border px-3 py-1 rounded"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filter by category"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex w-full h-[90vh]">
        {/* Left: tree panel (desktop) */}
        <div
          className={`
      hidden md:block
      flex-shrink-0
      bg-white border rounded p-2
      overflow-auto
    `}
          style={{ width: 340, maxHeight: "90vh", minWidth: 240 }}
          role="tree"
        >
          {filteredTree ? (
            <TreeNode
              node={filteredTree}
              onSelect={handleSelect}
              searchTerm={searchTerm}
              selectedId={selected?.id}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              No services match your search or filters.
            </div>
          )}
        </div>
        {/* Mobile tree drawer */}
        <div>
          {showTree && (
            <div
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              onClick={() => setShowTree(false)}
              aria-label="Close tree panel"
            />
          )}
          <div
            className={`
        fixed top-0 left-0 bottom-0 z-50 bg-white border-r w-10/12 max-w-xs p-2 overflow-auto
        transform transition-transform duration-300
        ${showTree ? "translate-x-0" : "-translate-x-full"}
        md:hidden
      `}
            style={{ maxHeight: "90vh" }}
            role="tree"
          >
            <button
              className="absolute top-2 right-2 text-lg text-blue-700 font-bold rounded-full p-2 hover:bg-blue-100"
              onClick={() => setShowTree(false)}
              aria-label="Close"
            >✕</button>
            {filteredTree ? (
              <TreeNode
                node={filteredTree}
                onSelect={node => {
                  handleSelect(node);
                  setShowTree(false);
                }}
                searchTerm={searchTerm}
                selectedId={selected?.id}
              />
            ) : (
              <div className="p-4 text-center text-gray-500">
                No services match your search or filters.
              </div>
            )}
          </div>
        </div>
        {/* Right: info panel */}
        <div className="flex-1 min-w-0 md:min-w-[500px] md:max-w-[calc(100%-360px)] overflow-auto">
          {selected && selected.meta && (
            <>
              {/* Breadcrumbs path */}
              {selected._lineage && (
                <Breadcrumbs path={selected._lineage} onCrumb={handleCrumb} />
              )}

              {/* Top full-width Service Details */}
              <InfoCard title="Service Details" className="mb-4">
                <dl>
                  <InfoRow label="Group">{highlight(selected.meta.serviceGroupText, searchTerm)}</InfoRow>
                  <InfoRow label="Type">{highlight(selected.meta.serviceTypeText, searchTerm)}</InfoRow>
                  <InfoRow label="Name">{highlight(selected.meta.serviceText, searchTerm)}</InfoRow>
                  <InfoRow label="ID">{selected.meta.serviceId}</InfoRow>
                  <InfoRow label="Contribution Category">
                    {highlight(selected.meta.participantContributionCategory, searchTerm)}
                  </InfoRow>
                  <InfoRow label="Unit">{highlight(selected.meta.unitType, searchTerm)}</InfoRow>
                </dl>
              </InfoCard>

              {/* Masonry grid, true gapless and ordered */}
              <Masonry
                breakpointCols={{ default: 2, 900: 1 }}
                className="flex gap-4"
                columnClassName="space-y-4"
              >
                {/* 1. Pricing */}
                <InfoCard title={
                  <span className="flex items-center gap-2">
                    <span>Linked Pricing</span>
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold">
                      ${getPrice(selected.meta)?.Median || "?"}
                    </span>
                  </span>
                }>
                  {(() => {
                    const p = getPrice(selected.meta);
                    if (!p)
                      return <span className="italic text-gray-400">No price found</span>;
                    return (
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Median: </span>
                          <span className="font-bold text-green-700">${p.Median?.toLocaleString()}</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-medium text-gray-500">Range: </span>
                          <span className="text-blue-700">${p.Min?.toLocaleString()} - ${p.Max?.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </InfoCard>

                {/* 2. Funding Sources */}
                {selected.meta._fundingSourceLinks?.length > 0 && (
                  <InfoCard title={
                    <span className="flex items-center gap-2">
                      <span>Linked Funding Sources</span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                        {selected.meta._fundingSourceLinks.length}
                      </span>
                    </span>
                  }>
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta._fundingSourceLinks.map((f, i) => (
                        <li key={i} className="flex items-center">
                          <span className="bg-blue-100 text-blue-900 rounded-full px-2 py-0.5 text-xs font-semibold mr-1">
                            {f.fundingSourceText}
                          </span>
                          {f.entryCategoryText &&
                            <span className="bg-cyan-100 text-cyan-700 rounded-full px-2 py-0.5 text-xs ml-1">{f.entryCategoryText}</span>}
                          {f.classificationText &&
                            <span className="bg-violet-100 text-violet-700 rounded-full px-2 py-0.5 text-xs ml-1">{f.classificationText}</span>}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}

                {/* 3. Item Categories */}
                {selected.meta.itemCategories?.length > 0 && (
                  <InfoCard title={
                    <span className="flex items-center gap-2">
                      <span>Item Categories</span>
                      <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-semibold">
                        {selected.meta.itemCategories.length}
                      </span>
                    </span>
                  }>
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta.itemCategories.map((item, i) => (
                        <li key={i}
                          className="bg-orange-50 text-orange-900 rounded-full px-3 py-1 text-xs font-medium">
                          {highlight(item.itemCategoryText, searchTerm)}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}

                {/* 4. Items */}
                {selected.meta.items?.length > 0 && (() => {
                  // De-duplicate items based on itemText
                  const seen = new Set();
                  const uniqueItems = selected.meta.items.filter(item => {
                    const text = item.itemText?.trim();
                    if (!text || seen.has(text)) return false;
                    seen.add(text);
                    return true;
                  });

                  return uniqueItems.length > 0 && (
                    <InfoCard title={
                      <span className="flex items-center gap-2">
                        <span>Items</span>
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                          {uniqueItems.length}
                        </span>
                      </span>
                    }>
                      <ul className="flex flex-wrap gap-2">
                        {uniqueItems.map((item, i) => (
                          <li key={i}
                            className="bg-amber-50 text-amber-900 rounded-full px-3 py-1 text-xs font-medium">
                            {highlight(item.itemText, searchTerm)}
                          </li>
                        ))}
                      </ul>
                    </InfoCard>
                  );
                })()}

                {/* 5. Classifications */}
                {selected.meta.classifications?.length > 0 && (
                  <InfoCard title={
                    <span className="flex items-center gap-2">
                      <span>Classifications</span>
                      <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-xs font-semibold">
                        {selected.meta.classifications.length}
                      </span>
                    </span>
                  }>
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta.classifications.map((c, i) => (
                        <li key={i}
                          className="bg-purple-50 text-purple-900 rounded-full px-3 py-1 text-xs font-medium flex items-center">
                          {highlight(c.classificationText, searchTerm)}
                          <span className="ml-2 text-purple-400">({c.classificationType})</span>
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}

                {/* Optional: other info cards, nice consistent "chip" layouts */}
                {selected.meta.healthProfessionalTypes?.length > 0 && (
                  <InfoCard title="Health Professional Types">
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta.healthProfessionalTypes.map((item, i) => (
                        <li key={i} className="bg-teal-50 text-teal-800 rounded-full px-3 py-1 text-xs font-medium">
                          {highlight(item.healthProfessionalTypeText, searchTerm)}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}
                {selected.meta.wraparoundServices?.length > 0 && (
                  <InfoCard title="Wraparound Services">
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta.wraparoundServices.map((item, i) => (
                        <li key={i} className="bg-lime-50 text-lime-800 rounded-full px-3 py-1 text-xs font-medium">
                          {highlight(item.wraparoundServiceText, searchTerm)}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}
                {selected.meta._careActivities?.length > 0 && (
                  <InfoCard title="Linked Care Management Activities">
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta._careActivities.map((a, i) => (
                        <li key={i} className="bg-amber-200 text-amber-900 rounded-full px-3 py-1 text-xs font-medium flex items-center">
                          <ActivityLink activity={a} />
                          {a.Category && (
                            <span className="ml-2 text-xs text-slate-600 italic">
                              ({a.Category})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}
                {selected.meta._restorativeActivities?.length > 0 && (
                  <InfoCard title="Linked Restorative Activities">
                    <ul className="flex flex-wrap gap-2">
                      {selected.meta._restorativeActivities.map((a, i) => (
                        <li key={i} className="bg-green-200 text-green-900 rounded-full px-3 py-1 text-xs font-medium flex items-center">
                          <ActivityLink activity={a} />
                          {a.Category && (
                            <span className="ml-2 text-xs text-slate-600 italic">
                              ({a.Category})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}
              </Masonry>
            </>
          )}
        </div>
      </div>
    </div>
  );
}