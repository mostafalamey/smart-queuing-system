import {
  Building2,
  Upload,
  X,
  Users,
  Palette,
  Globe,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { ColorPreview } from "@/components/ColorPreview";
import { Organization, OrganizationForm } from "../shared/types";
import { CountrySelector } from "./CountrySelector";

interface OrganizationDetailsProps {
  orgForm: OrganizationForm;
  setOrgForm: (form: OrganizationForm) => void;
  loading: boolean;
  uploading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  readOnly?: boolean;
}

export const OrganizationDetails = ({
  orgForm,
  setOrgForm,
  loading,
  uploading,
  onSubmit,
  onLogoUpload,
  onRemoveLogo,
  readOnly = false,
}: OrganizationDetailsProps) => {
  // Ref for brand preview background
  const brandPreviewRef = useRef<HTMLDivElement>(null);

  // Update brand preview background when color changes
  useEffect(() => {
    if (brandPreviewRef.current) {
      brandPreviewRef.current.style.backgroundColor = orgForm.primary_color;
    }
  }, [orgForm.primary_color]);

  // Helper function to get input props with read-only logic
  const getInputProps = (field: keyof OrganizationForm) => ({
    readOnly,
    className: `input-field ${
      readOnly ? "bg-gray-50 cursor-not-allowed text-gray-700" : ""
    }`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      !readOnly && setOrgForm({ ...orgForm, [field]: e.target.value }),
  });
  return (
    <div className="max-w-7xl mx-auto">
      {readOnly && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>View Mode:</strong> You can view organization details but
              cannot make changes. Contact your administrator to modify these
              settings.
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout - Responsive card system */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 relative z-10">
        {/* Basic Information Card - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 analytics-card p-5">
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Basic Information
              </h2>
              <p className="text-xs text-gray-500">
                Essential organization details
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Organization Name - Full width with compact styling */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Organization Name *
              </label>
              <input
                type="text"
                value={orgForm.name}
                {...getInputProps("name")}
                placeholder="Enter organization name"
                required
              />
            </div>

            {/* Contact Info - Two columns for desktop, stacked for mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span>Contact Email</span>
                </label>
                <input
                  type="email"
                  value={orgForm.contact_email}
                  {...getInputProps("contact_email")}
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={orgForm.phone}
                  {...getInputProps("phone")}
                  placeholder="+201015554028"
                />
              </div>
            </div>

            {/* Country Selector with Website */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CountrySelector
                  selectedCountry={orgForm.country}
                  selectedCountryCode={orgForm.country_code}
                  onCountryChange={(country, countryCode) => {
                    if (!readOnly) {
                      setOrgForm({
                        ...orgForm,
                        country,
                        country_code: countryCode,
                      });
                    }
                  }}
                  disabled={readOnly}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default country for customer phone entry
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-gray-500" />
                  <span>Website</span>
                </label>
                <input
                  type="url"
                  value={orgForm.website}
                  {...getInputProps("website")}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            {/* Address - Full width */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>Address</span>
              </label>
              <textarea
                value={orgForm.address}
                {...getInputProps("address")}
                rows={2}
                placeholder="Enter organization address"
              />
            </div>
          </div>
        </div>

        {/* Branding Card */}
        <div className="analytics-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Branding</h2>
              <p className="text-sm text-gray-500">Visual identity</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Logo Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Organization Logo
              </label>

              {/* Horizontal Layout: Logo + Controls */}
              <div className="flex items-start space-x-12">
                {/* Logo Preview - Left Side */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200 relative">
                    {orgForm.logo_url ? (
                      <>
                        <img
                          src={orgForm.logo_url}
                          alt="Organization Logo"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {orgForm.logo_url && !readOnly && (
                          <button
                            onClick={onRemoveLogo}
                            disabled={uploading}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg"
                            title="Remove logo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-orange-500 rounded-lg opacity-30"></div>
                    )}
                  </div>
                </div>

                {/* Upload Controls - Right Side */}
                <div className="flex-1 space-y-3">
                  {!readOnly && (
                    <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center space-x-2 border border-blue-200 hover:border-blue-300 disabled:opacity-50">
                      <Upload className="w-4 h-4" />
                      <span>
                        {uploading
                          ? "Uploading..."
                          : orgForm.logo_url
                          ? "Change Logo"
                          : "Upload Logo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onLogoUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}

                  {/* Status Messages */}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      PNG, JPG, SVG • Max 10MB
                      <br />
                      Recommended: 200×200px
                    </p>
                    {orgForm.logo_url && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Logo uploaded successfully
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100"></div>

            {/* Brand Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Brand Color
              </label>
              <p className="text-xs text-gray-500 mb-4 text-center">
                Primary color for customer app
              </p>

              {/* Color Picker - Better Layout */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  {/* Custom Brand Preview with Logo and Name */}
                  <div
                    ref={brandPreviewRef}
                    className="w-42 h-16 rounded-lg shadow-sm flex items-center justify-center px-8 py-3"
                  >
                    <div className="flex items-center space-x-3">
                      {orgForm.logo_url ? (
                        <img
                          src={orgForm.logo_url}
                          alt="Logo"
                          className="w-7 h-7 object-cover rounded"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-white bg-opacity-20 rounded flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-white text-sm font-medium truncate">
                        {orgForm.name || "Organization"}
                      </span>
                    </div>
                  </div>

                  <input
                    type="color"
                    value={orgForm.primary_color}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, primary_color: e.target.value })
                    }
                    className="w-12 h-10 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                    title="Brand color picker"
                  />
                </div>
                <p className="text-sm font-mono text-gray-700 text-center bg-white px-3 py-1.5 rounded-md border">
                  {orgForm.primary_color}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar - Normal flow, not sticky */}
      {!readOnly && (
        <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onSubmit}
            disabled={loading || uploading}
            className="btn-primary px-8 py-3 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
