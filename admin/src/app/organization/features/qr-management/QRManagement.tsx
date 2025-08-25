import { useState } from "react";
import {
  QrCode,
  Download,
  Share,
  Copy,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Organization, Branch, Department, QRCodeData } from "../shared/types";

interface QRManagementProps {
  organization: Organization | null;
  branches: Branch[];
  departments: Department[];
  qrCodeUrl: string;
  branchQrCodes: QRCodeData;
  departmentQrCodes: QRCodeData;
  qrGenerating: boolean;
  userProfile: any;
  onGenerateQR: () => void;
  onDownloadQR: () => void;
  onCopyQRUrl: () => void;
  onPrintQR: () => void;
  onDownloadBranchQR: (branchId: string, branchName: string) => void;
  onCopyBranchQRUrl: (branchId: string, branchName?: string) => void;
  onPrintBranchQR: (branchId: string, branchName: string) => void;
  onRefreshBranchQR: (branchId: string, branchName: string) => void;
  onDownloadDepartmentQR: (
    departmentId: string,
    departmentName: string
  ) => void;
  onCopyDepartmentQRUrl: (
    departmentId: string,
    departmentName?: string,
    branchId?: string
  ) => void;
  onPrintDepartmentQR: (
    departmentId: string,
    departmentName: string,
    branchId: string
  ) => void;
  onRefreshDepartmentQR: (
    departmentId: string,
    departmentName: string,
    branchId: string
  ) => void;
}

export const QRManagement = ({
  organization,
  branches,
  departments,
  qrCodeUrl,
  branchQrCodes,
  departmentQrCodes,
  qrGenerating,
  userProfile,
  onGenerateQR,
  onDownloadQR,
  onCopyQRUrl,
  onPrintQR,
  onDownloadBranchQR,
  onCopyBranchQRUrl,
  onPrintBranchQR,
  onRefreshBranchQR,
  onDownloadDepartmentQR,
  onCopyDepartmentQRUrl,
  onPrintDepartmentQR,
  onRefreshDepartmentQR,
}: QRManagementProps) => {
  const [activeQrTab, setActiveQrTab] = useState("general");

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-6">
        <QrCode className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold">QR Codes for Customer Access</h2>
      </div>
      <p className="text-gray-600 mb-6">
        Generate QR codes that customers can scan to access your queue system
      </p>

      {/* QR Code Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveQrTab("general")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeQrTab === "general"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          General Access
        </button>
        <button
          onClick={() => setActiveQrTab("branch")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeQrTab === "branch"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Branch-Specific ({branches.length})
        </button>
        <button
          onClick={() => setActiveQrTab("department")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeQrTab === "department"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Department-Specific ({departments.length})
        </button>
      </div>

      {/* General Access Tab */}
      {activeQrTab === "general" && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            General Access QR Code
          </h3>
          <p className="text-blue-700 mb-4">
            This QR code allows customers to access{" "}
            {organization?.name || "your organization"} and choose from all
            available branches. Perfect when branches are within the same
            location.
          </p>

          <div className="text-center">
            {qrCodeUrl ? (
              <div className="mx-auto mb-4 w-72 h-72 max-w-full border border-gray-200 rounded overflow-hidden">
                <img
                  src={qrCodeUrl}
                  alt="General Access QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : qrGenerating ? (
              <div className="mx-auto mb-4 w-72 h-72 max-w-full border border-gray-200 rounded bg-blue-50 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-12 h-12 text-blue-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-blue-600">Generating QR Code...</p>
                </div>
              </div>
            ) : organization?.name ? (
              <div className="mx-auto mb-4 w-72 h-72 max-w-full border border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">QR Code not available</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click refresh to generate
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto mb-4 w-72 h-72 max-w-full border border-gray-200 rounded bg-yellow-50 flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                  <p className="text-yellow-700">
                    Waiting for organization data...
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={onDownloadQR}
                disabled={!qrCodeUrl}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={onPrintQR}
                disabled={!qrCodeUrl}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Share className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={onCopyQRUrl}
                disabled={!qrCodeUrl}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Copy className="w-4 h-4" />
                <span>Copy URL</span>
              </button>
              <button
                onClick={onGenerateQR}
                disabled={qrGenerating || !organization?.name}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${qrGenerating ? "animate-spin" : ""}`}
                />
                <span>{qrGenerating ? "Generating..." : "Refresh"}</span>
              </button>
            </div>

            <div className="mt-4 p-3 analytics-card">
              <p className="text-xs text-gray-500 break-all">
                {typeof window !== "undefined" &&
                  `${
                    process.env.NEXT_PUBLIC_CUSTOMER_URL ||
                    "http://localhost:3002"
                  }?org=${userProfile?.organization_id}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branch-Specific Tab */}
      {activeQrTab === "branch" && (
        <div>
          {branches.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Branches Available
              </h3>
              <p className="text-gray-600 mb-4">
                Create branches in the Tree View to generate branch-specific QR
                codes
              </p>
              <button
                onClick={() => (window.location.href = "/tree")}
                className="btn-primary"
              >
                Go to Tree View
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch) => (
                <div key={branch.id} className="analytics-card p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">
                      {branch.name}
                    </h4>
                  </div>

                  {branch.address && (
                    <p className="text-sm text-gray-600 mb-4">
                      {branch.address}
                    </p>
                  )}

                  <div className="text-center">
                    {branchQrCodes[branch.id] ? (
                      <div className="mx-auto mb-4 w-48 h-48 max-w-full border border-gray-200 rounded overflow-hidden">
                        <img
                          src={branchQrCodes[branch.id]}
                          alt={`QR Code for ${branch.name}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto mb-4 w-48 h-48 max-w-full border border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            QR Code not available
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click refresh to generate
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col space-y-2">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={() =>
                            onDownloadBranchQR(branch.id, branch.name)
                          }
                          disabled={!branchQrCodes[branch.id]}
                          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() =>
                            onPrintBranchQR(branch.id, branch.name)
                          }
                          disabled={!branchQrCodes[branch.id]}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Share className="w-3 h-3" />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() =>
                            onCopyBranchQRUrl(branch.id, branch.name)
                          }
                          disabled={!branchQrCodes[branch.id]}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </button>
                        <button
                          onClick={() =>
                            onRefreshBranchQR(branch.id, branch.name)
                          }
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500 break-all">
                        {typeof window !== "undefined" &&
                          `${
                            process.env.NEXT_PUBLIC_CUSTOMER_URL ||
                            "http://localhost:3002"
                          }?org=${userProfile?.organization_id}&branch=${
                            branch.id
                          }`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Department-Specific Tab */}
      {activeQrTab === "department" && (
        <div>
          {departments.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Departments Available
              </h3>
              <p className="text-gray-600 mb-4">
                Create departments in the Tree View to generate
                department-specific QR codes
              </p>
              <button
                onClick={() => (window.location.href = "/tree")}
                className="btn-primary"
              >
                Go to Tree View
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((department) => (
                <div key={department.id} className="analytics-card p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <QrCode className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">
                      {department.name}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {department.branches?.name || "Unknown Branch"}
                    </span>
                  </div>

                  {department.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {department.description}
                    </p>
                  )}

                  <div className="text-center">
                    {departmentQrCodes[department.id] ? (
                      <div className="mx-auto mb-4 w-48 h-48 max-w-full border border-gray-200 rounded overflow-hidden">
                        <img
                          src={departmentQrCodes[department.id]}
                          alt={`QR Code for ${department.name}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto mb-4 w-48 h-48 max-w-full border border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            QR Code not available
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Click refresh to generate
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col space-y-2">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={() =>
                            onDownloadDepartmentQR(
                              department.id,
                              department.name
                            )
                          }
                          disabled={!departmentQrCodes[department.id]}
                          className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() =>
                            onPrintDepartmentQR(
                              department.id,
                              department.name,
                              department.branch_id
                            )
                          }
                          disabled={!departmentQrCodes[department.id]}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Share className="w-3 h-3" />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() =>
                            onCopyDepartmentQRUrl(
                              department.id,
                              department.name,
                              department.branch_id
                            )
                          }
                          disabled={!departmentQrCodes[department.id]}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </button>
                        <button
                          onClick={() =>
                            onRefreshDepartmentQR(
                              department.id,
                              department.name,
                              department.branch_id
                            )
                          }
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500 break-all">
                        {typeof window !== "undefined" &&
                          `${
                            process.env.NEXT_PUBLIC_CUSTOMER_URL ||
                            "http://localhost:3002"
                          }?org=${userProfile?.organization_id}&branch=${
                            department.branch_id
                          }&department=${department.id}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
