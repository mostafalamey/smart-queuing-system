import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Globe } from "lucide-react";
import { Country, COUNTRIES, getCountryByName } from "../shared/countries";

interface CountrySelectorProps {
  selectedCountry: string;
  selectedCountryCode: string;
  onCountryChange: (country: string, countryCode: string) => void;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  selectedCountryCode,
  onCountryChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search term
  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.includes(searchTerm)
  );

  // Get current country object
  const currentCountry = getCountryByName(selectedCountry) || COUNTRIES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleCountrySelect = (country: Country) => {
    onCountryChange(country.name, country.code);
    setIsOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm("");
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
        <Globe className="w-4 h-4" />
        <span>Country & Phone Code</span>
      </label>

      {/* Selected Country Display */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex items-center justify-between ${
          disabled
            ? "bg-gray-50 cursor-not-allowed text-gray-700"
            : "hover:border-gray-400"
        }`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{currentCountry.flag}</span>
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {currentCountry.name}
            </div>
            <div className="text-sm text-gray-500">{currentCountry.code}</div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-72 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.name}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors flex items-center space-x-3 ${
                    currentCountry.name === country.name
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-900"
                  }`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{country.name}</div>
                    <div className="text-sm text-gray-500">{country.code}</div>
                  </div>
                  {currentCountry.name === country.name && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <div className="text-sm">No countries found</div>
                <div className="text-xs text-gray-400 mt-1">
                  Try a different search term
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
