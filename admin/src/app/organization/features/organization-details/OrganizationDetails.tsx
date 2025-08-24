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
  MessageSquare,
} from "lucide-react";
import { ColorPreview } from "@/components/ColorPreview";
import { Organization, OrganizationForm } from "../shared/types";

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
  // Helper function to get input props with read-only logic
  const getInputProps = (field: keyof OrganizationForm) => ({
    readOnly,
    className: `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Basic Information Card - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 analytics-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Basic Information
              </h2>
              <p className="text-sm text-gray-500">
                Essential organization details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4" />
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
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                value={orgForm.phone}
                {...getInputProps("phone")}
                placeholder="+1234567890"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4" />
                <span>Website</span>
              </label>
              <input
                type="url"
                value={orgForm.website}
                {...getInputProps("website")}
                placeholder="https://company.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4" />
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
                  <ColorPreview color={orgForm.primary_color} />
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

      {/* Customer Experience Card - Full width */}
      <div className="analytics-card p-6 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Customer Experience
            </h2>
            <p className="text-sm text-gray-500">
              Welcome message and customer-facing settings
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Welcome Message
          </label>
          <p className="text-sm text-gray-500 mb-3">
            This message will be displayed to customers when they first access
            the queue system
          </p>
          <textarea
            value={orgForm.welcome_message}
            {...getInputProps("welcome_message")}
            rows={3}
            placeholder="Welcome to our smart queue system. Please take your number and wait for your turn."
          />
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
