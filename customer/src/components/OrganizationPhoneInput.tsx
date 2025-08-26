import React, { useState, useEffect } from "react";
import { Phone, Globe, AlertCircle } from "lucide-react";

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

// Phone validation patterns for different countries
const phoneValidationPatterns: {
  [key: string]: { pattern: RegExp; length: number; example: string };
} = {
  "+20": { pattern: /^[0-9]{10}$/, length: 10, example: "1012345678" }, // Egypt: 10 digits
  "+1": { pattern: /^[0-9]{10}$/, length: 10, example: "2345678900" }, // US/Canada: 10 digits
  "+44": { pattern: /^[0-9]{10,11}$/, length: 10, example: "7700900123" }, // UK: 10-11 digits
  "+971": { pattern: /^[0-9]{8,9}$/, length: 8, example: "501234567" }, // UAE: 8-9 digits
  "+966": { pattern: /^[0-9]{9}$/, length: 9, example: "501234567" }, // Saudi Arabia: 9 digits
};

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
  const [localPhoneNumber, setLocalPhoneNumber] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");

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

          // If value already contains a full phone number, extract the local part
          if (value && data.countryCode && value.startsWith(data.countryCode)) {
            const localPart = value.substring(data.countryCode.length).trim();
            setLocalPhoneNumber(localPart);
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

  // Validate phone number based on country
  const validatePhoneNumber = (phoneNumber: string, countryCode: string) => {
    if (!phoneNumber.trim()) {
      return { isValid: true, message: "" }; // Empty is valid (not required check)
    }

    const validation = phoneValidationPatterns[countryCode];
    if (!validation) {
      // Default validation for unknown countries
      const isValid = /^[0-9]{8,15}$/.test(phoneNumber);
      return {
        isValid,
        message: isValid
          ? ""
          : "Please enter a valid phone number (8-15 digits)",
      };
    }

    const isValid = validation.pattern.test(phoneNumber);
    const message = isValid
      ? ""
      : `Phone number should be ${validation.length} digits (e.g., ${validation.example})`;

    return { isValid, message };
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Only allow numbers
    const numericValue = inputValue.replace(/[^0-9]/g, "");

    setLocalPhoneNumber(numericValue);

    // Validate the phone number
    if (countryData?.countryCode) {
      const validation = validatePhoneNumber(
        numericValue,
        countryData.countryCode
      );
      setIsValid(validation.isValid);
      setValidationMessage(validation.message);

      // Update parent with full phone number (country code + local number)
      const fullPhoneNumber = numericValue
        ? `${countryData.countryCode}${numericValue}`
        : "";
      onChange(fullPhoneNumber);
    }
  };

  const getPhonePlaceholder = () => {
    if (countryData?.countryCode) {
      const validation = phoneValidationPatterns[countryData.countryCode];
      return validation ? validation.example : "123456789";
    }
    return placeholder || "123456789";
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
        </div>
      )}

      {/* Phone Input with Country Code Label */}
      <div className="relative">
        {countryData && !loading && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
            <span className="text-gray-700 font-medium bg-gray-50 px-3 py-2 border border-gray-300 rounded-l-lg text-sm border-r border-r-gray-300">
              {countryData.countryCode}
            </span>
          </div>
        )}

        <input
          type="tel"
          value={localPhoneNumber}
          onChange={handlePhoneChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            countryData ? "pl-20" : "pl-3"
          } ${
            !isValid ? "border-red-500 focus:ring-red-500" : "border-gray-300"
          } ${className}`}
          placeholder={getPhonePlaceholder()}
          required={required}
        />
      </div>

      {/* Validation Message */}
      {!isValid && validationMessage && (
        <div className="flex items-center space-x-1 mt-1 text-red-500 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>{validationMessage}</span>
        </div>
      )}

      <p className="text-sm text-gray-500 mt-1">
        Required for push notifications and WhatsApp updates
        {countryData && (
          <>
            <br />
            <span className="text-xs">
              Enter your local phone number without the country code (
              {countryData.countryCode})
            </span>
          </>
        )}
      </p>
    </div>
  );
};
