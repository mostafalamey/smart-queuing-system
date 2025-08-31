import React, { useState, useEffect } from "react";
import { Phone, Smartphone } from "lucide-react";

interface PhoneInputWithCountryProps {
  organizationId: string;
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  organizationId,
  phoneNumber,
  onPhoneChange,
  disabled = false,
  className = "",
}) => {
  const [countryCode, setCountryCode] = useState("+20");
  const [countryName, setCountryName] = useState("Egypt");
  const [loading, setLoading] = useState(true);

  // Fetch organization's country on mount
  useEffect(() => {
    const fetchOrganizationCountry = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/organization/country?organizationId=${organizationId}`
        );
        const data = await response.json();

        if (data.success) {
          setCountryCode(data.countryCode || "+20");
          setCountryName(data.country || "Egypt");

          // If phone number is empty or doesn't start with the country code, prefill it
          if (!phoneNumber || !phoneNumber.startsWith(data.countryCode)) {
            if (!phoneNumber) {
              onPhoneChange(data.countryCode);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching organization country:", error);
        // Use defaults
        setCountryCode("+20");
        setCountryName("Egypt");
        if (!phoneNumber) {
          onPhoneChange("+20");
        }
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchOrganizationCountry();
    } else {
      setLoading(false);
    }
  }, [organizationId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Ensure the phone number always starts with the country code
    if (value && !value.startsWith(countryCode)) {
      // If user is typing a local number, prepend the country code
      if (value.match(/^[0-9]/)) {
        value = countryCode + value;
      }
    }

    onPhoneChange(value);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <Phone className="w-4 h-4" />
          <span>Phone Number</span>
        </label>
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        <Phone className="w-4 h-4" />
        <span>Phone Number</span>
      </label>

      {/* Country Code Display */}
      <div className="flex items-center text-xs text-gray-500 mb-1">
        <Smartphone className="w-3 h-3 mr-1" />
        {countryName} ({countryCode})
      </div>

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={`${countryCode}123456789`}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
          disabled ? "bg-gray-50 cursor-not-allowed" : ""
        } ${className}`}
      />

      <p className="text-xs text-gray-500">
        Enter your phone number for queue notifications. Country code (
        {countryCode}) is automatically added.
      </p>
    </div>
  );
};
