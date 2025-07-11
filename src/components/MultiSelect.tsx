import React from 'react';
import Select, { MultiValue, StylesConfig } from 'react-select';

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
  className?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  className = '',
  isSearchable = true,
  isClearable = true
}) => {
  const customStyles: StylesConfig<Option, true> = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? '#E31E24' : '#e5e7eb',
      boxShadow: state.isFocused ? '0 0 0 1px #E31E24' : 'none',
      '&:hover': {
        borderColor: '#E31E24',
      },
      borderRadius: '0.5rem',
      padding: '2px',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'rgba(227, 30, 36, 0.1)',
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#E31E24',
      fontWeight: 500,
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#E31E24',
      '&:hover': {
        backgroundColor: '#E31E24',
        color: 'white',
      },
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#E31E24' 
        : state.isFocused 
          ? 'rgba(227, 30, 36, 0.1)' 
          : 'white',
      color: state.isSelected ? 'white' : '#333',
      '&:active': {
        backgroundColor: state.isSelected ? '#E31E24' : 'rgba(227, 30, 36, 0.2)',
      },
    }),
  };

  const handleChange = (selectedOptions: MultiValue<Option>) => {
    onChange(selectedOptions as Option[]);
  };

  return (
    <Select
      isMulti
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      classNamePrefix="select"
      isSearchable={isSearchable}
      isClearable={isClearable}
      styles={customStyles}
    />
  );
};

export default MultiSelect;