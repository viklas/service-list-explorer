import React, { useState } from 'react';
import ServiceExplorer from './components/ServiceListExplorer';
import ActivitiesExplorer from './components/ActivitiesExplorer';
import RestorativeExplorer from './components/RestorativeExplorer';
import FundingSourcesExplorer from './components/FundingSourcesExplorer';
import ServiceHierarchyExplorer from './components/ServiceHierarchyExplorer';
import BudgetCodeExplorer from './components/BudgetCodeExplorer';


const tabs = [
  { key: 'services', label: 'Service List' },
  { key: 'activities', label: 'Care Management' },
  { key: 'restorative', label: 'Restorative Care Management' },
  { key: 'funding', label: 'Funding Sources' },
  { key: 'budget', label: 'Budget Codes' },
  { key: 'wiki', label: 'Wiki' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('services');

  return (
    <div className="relative p-4">
      {/* Header */}
      <header className="mb-4 relative">
        {/* Tabs nav: column on mobile, row on sm+ */}
        <nav className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-lg flex-shrink-0
                ${activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-slate-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* GitHub icon: stacked on mobile, absolute on sm+ */}
        <div className="mt-2 sm:mt-0 sm:absolute sm:top-0 sm:right-0">
          <a
            href="https://github.com/viklas/service-list-explorer"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 16 16"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 
                7.59c.4.07.55-.17.55-.38 0-.19-.01-.82
                -.01-1.49-2 .37-2.53-.49-2.69-.94
                -.09-.23-.48-.94-.82-1.13-.28-.15
                -.68-.52-.01-.53.63-.01 1.08.58 1.23.82
                .72 1.2 1.87.86 2.33.66.07-.52.28
                -.86.5-1.06-1.78-.2-3.64-.89
                -3.64-3.95 0-.87.31-1.59.82-2.15
                -.08-.2-.36-1.01.08-2.1 0 0 .67
                -.21 2.2.82a7.6 7.6 0 012-.27c.68
                0 1.36.09 2 .27 1.53-1.04 2.2
                -.82 2.2-.82.44 1.09.16 1.9.08 
                2.1.51.56.82 1.28.82 2.15 0
                3.07-1.87 3.75-3.65 3.95.29
                .25.54.73.54 1.48 0 1.07
                -.01 1.93-.01 2.2 0 .21.15.46
                .55.38A8.01 8.01 0 0016 8c0
                -4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'services' && <ServiceExplorer />}
        {activeTab === 'activities' && <ActivitiesExplorer />}
        {activeTab === 'restorative' && <RestorativeExplorer />}
        {activeTab === 'funding' && <FundingSourcesExplorer />}
        {activeTab === 'budget' && <BudgetCodeExplorer />}
        {activeTab === 'wiki' && <ServiceHierarchyExplorer />}
      </div>
    </div>
  );
}