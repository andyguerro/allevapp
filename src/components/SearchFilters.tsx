import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import MultiSelect, { Option } from './MultiSelect';

interface FilterOption {
  id: string;
  label: string;
  options: Option[];
}

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: FilterOption[];
  selectedFilters: Record<string, Option[]>;
  onFilterChange: (filterId: string, selected: Option[]) => void;
  onClearFilters: () => void;
  placeholder?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  selectedFilters,
  onFilterChange,
  onClearFilters,
  placeholder = 'Cerca...'
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const hasActiveFilters = Object.values(selectedFilters).some(options => options.length > 0);
  
  const activeFiltersCount = Object.values(selectedFilters)
    .reduce((count, options) => count + options.length, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-4 md:p-6">
      <div className="flex flex-col space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray" size={18} />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
          />
        </div>
        
        {/* Filters Toggle */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-2 text-brand-blue hover:text-brand-red transition-colors"
          >
            <Filter size={18} />
            <span className="font-medium">Filtri avanzati</span>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {hasActiveFilters && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-brand-gray">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro attivo' : 'filtri attivi'}
              </span>
              <button
                onClick={onClearFilters}
                className="text-brand-red hover:text-brand-red-dark transition-colors flex items-center space-x-1"
              >
                <X size={16} />
                <span className="text-sm">Cancella tutti</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Expanded Filters */}
        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <label className="block text-sm font-medium text-brand-blue">
                  {filter.label}
                </label>
                <MultiSelect
                  options={filter.options}
                  value={selectedFilters[filter.id] || []}
                  onChange={(selected) => onFilterChange(filter.id, selected)}
                  placeholder={`Seleziona ${filter.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;