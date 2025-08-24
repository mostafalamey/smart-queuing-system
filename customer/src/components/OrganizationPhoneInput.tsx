import React, { useState, useEffect } from "react";
import { Phone, Globe } from "lucide-react";

interface OrganizationPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  organizationId: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

interface OrganizationCountryData {
  success: boolean;
  country: string;
  countryCode: string;
  organizationName: string;
}

export const OrganizationPhoneInput: React.FC<OrganizationPhoneInputProps> = ({
  value,
  onChange,
  organizationId,
  placeholder,
  required = false,
  className = "input-field text-gray-900",
}) => {
  const [countryData, setCountryData] =
    useState<OrganizationCountryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizationCountry = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/organization/country?organizationId=${organizationId}`
        );
        const data = await response.json();

        if (data.success) {
          setCountryData(data);

          // Auto-prefill country code if phone number is empty
          if (!value.trim() && data.countryCode) {
            onChange(`${data.countryCode} `);
          }
        }
      } catch (error) {
        console.error("Error fetching organization country:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationCountry();
  }, [organizationId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // If user is backspacing and removes the country code, re-add it
    if (
      countryData?.countryCode &&
      !inputValue.startsWith(countryData.countryCode)
    ) {
      // Only auto-add if the input is completely empty or they're typing a number
      if (!inputValue.trim() || /^\d/.test(inputValue)) {
        inputValue = `${countryData.countryCode} ${inputValue}`;
      }
    }

    onChange(inputValue);
  };

  const getPhonePlaceholder = () => {
    if (countryData?.countryCode) {
      // Create a sample phone number for the country
      const sampleNumber =
        countryData.countryCode === "+20"
          ? "101 555 4028" // Egypt format
          : countryData.countryCode === "+1"
          ? "234 567 8900" // US/Canada format
          : "123 456 7890"; // Generic format

      return `${countryData.countryCode} ${sampleNumber}`;
    }
    return placeholder || "+1 234 567 8900";
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Phone className="inline w-4 h-4 mr-1" />
        Phone Number {required && <span className="text-red-500">*</span>}
      </label>

      {/* Country Information Display */}
      {countryData && !loading && (
        <div className="flex items-center space-x-2 mb-2 text-xs text-gray-500">
          <Globe className="w-3 h-3" />
          <span>
            {countryData.organizationName} is based in {countryData.country}
          </span>
          <span className="font-mono bg-gray-100 px-1 rounded">
            {countryData.countryCode}
          </span>
        </div>
      )}

      <input
        type="tel"
        value={value}
        onChange={handlePhoneChange}
        className={className}
        placeholder={getPhonePlaceholder()}
        required={required}
      />

      <p className="text-sm text-gray-500 mt-1">
        Required for push notifications and WhatsApp updates
        {countryData && (
          <>
            <br />
            <span className="text-xs">
              Phone format for {countryData.country}: {countryData.countryCode}{" "}
              XXX XXX XXXX
            </span>
          </>
        )}
      </p>
    </div>
  );
};
