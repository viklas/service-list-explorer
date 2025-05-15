# 🧭 Support at Home - Service List Explorer

A lightweight, interactive React-based explorer for navigating aged care service types, units, categories, and indicative pricing—based on the **Support at Home** reform data.

![screenshot](https://github.com/viklas/service-list-explorer/assets/banner-placeholder.png)

> ⚡ Powered by React, TailwindCSS, and Fuse.js for fast search and filtering.

---

## 🔗 Live Demo

👉 [https://service-list-explorer.vercel.app/](https://service-list-explorer.vercel.app/)

---

## 🚀 Features

- 🔍 **Free-text search** across service names, classifications, units, and IDs.
- 📚 **Filter** by:
  - Service Group
  - Service Type (with definitions)
  - Unit Type
  - Category
- 💡 **Inline average pricing** sourced from public reference data.
- 🧾 **Expandable detail cards** for items, wraparounds, categories, and health professionals.
- 🧠 **Fuzzy matching** of price estimates via Fuse.js.
- 📂 Local JSON + CSV loading via [`fetch()`].

---

## 🛠️ Tech Stack

- **React** + Hooks
- **Tailwind CSS** for design
- **Fuse.js** for fuzzy matching
- **PapaParse** for CSV parsing

---

## 📁 Data Sources Used
- Defined Service List for Support at Home (Last updated 15th May, 2025)
- Published indicative pricing from Department (March 2025)
- Definitions of Service Types from Support at Home published resources (May 2025)
