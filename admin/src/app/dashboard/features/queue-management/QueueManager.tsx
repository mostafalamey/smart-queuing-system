import { Users } from "lucide-react";
import { Branch, Department, Service, QueueData } from "../shared/types";

interface QueueManagerProps {
  selectedBranch: string;
  setSelectedBranch: (branchId: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (departmentId: string) => void;
  selectedService: string;
  setSelectedService: (serviceId: string) => void;
  branches: Branch[];
  departments: Department[];
  services: Service[];
  queueData: QueueData | null;
  loading: boolean;
  onSkipTicket: () => void;
  onCompleteTicket: () => void;
  showWarning: (
    title: string,
    message: string,
    action?: { label: string; onClick: () => void }
  ) => void;
  showInfo: (
    title: string,
    message: string,
    action?: { label: string; onClick: () => void }
  ) => void;
  // Role-based props
  canSelectBranch?: boolean;
  canSelectDepartment?: boolean;
  currentUserRole?: string | null;
  assignedDepartmentName?: string | null;
}

export const QueueManager = ({
  selectedBranch,
  setSelectedBranch,
  selectedDepartment,
  setSelectedDepartment,
  selectedService,
  setSelectedService,
  branches,
  departments,
  services,
  queueData,
  loading,
  onSkipTicket,
  onCompleteTicket,
  showWarning,
  showInfo,
  canSelectBranch = true,
  canSelectDepartment = true,
  currentUserRole,
  assignedDepartmentName,
}: QueueManagerProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white to-celestial-50 rounded-2xl shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group">
      {/* Animated Background Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-celestial-200/30 to-french-200/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellowgreen-200/20 to-citrine-200/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>

      <div className="relative p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative group/icon">
            <div className="absolute inset-0 bg-gradient-to-br from-celestial-400 to-french-500 rounded-2xl blur-sm opacity-70 group-hover/icon:opacity-100 transition-opacity duration-300"></div>
            <div className="relative w-14 h-14 bg-gradient-to-br from-celestial-500 to-french-600 rounded-2xl flex items-center justify-center shadow-lg group-hover/icon:shadow-xl group-hover/icon:scale-105 transition-all duration-300">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1">
              Queue Manager
            </h2>
            <p className="text-gray-600 text-lg">
              Control and monitor queue operations
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Reduced from space-y-8 to space-y-5 */}
          {/* Enhanced Branch Selection - Hidden for non-admin users */}
          {canSelectBranch && (
            <div className="space-y-2">
              {/* Reduced from space-y-3 to space-y-2 */}
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {/* Reduced from mb-2 to mb-1 */}
                Select Branch
              </label>
              <div className="relative group">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-celestial-200 focus:border-celestial-500 transition-all duration-200 appearance-none cursor-pointer hover:border-celestial-300 hover:shadow-md text-gray-900 font-medium"
                  aria-label="Select Branch"
                >
                  <option value="">Choose a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.address}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-celestial-500 group-hover:text-celestial-600 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Department Selection - Hidden for employee users */}
          {canSelectDepartment && (
            <div className="space-y-2">
              {/* Reduced from space-y-3 to space-y-2 */}
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {/* Reduced from mb-2 to mb-1 */}
                Select Department
              </label>
              <div className="relative group">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-celestial-200 focus:border-celestial-500 transition-all duration-200 appearance-none cursor-pointer hover:border-celestial-300 hover:shadow-md text-gray-900 font-medium"
                  aria-label="Select Department"
                >
                  <option value="">Choose a department...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-celestial-500 group-hover:text-celestial-600 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Employee Department Badge */}
          {currentUserRole === "employee" && assignedDepartmentName && (
            <div className="bg-gradient-to-r from-celestial-500 to-french-600 text-white px-6 py-3 rounded-xl shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div>
                  <p className="text-sm font-medium opacity-90">Department</p>
                  <p className="text-lg font-bold">{assignedDepartmentName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Service Selection */}
          {selectedDepartment && services.length > 0 && (
            <div className="space-y-2">
              {/* Reduced from space-y-3 to space-y-2 */}
              <label className="block text-sm font-bold text-gray-700 mb-1">
                {/* Reduced from mb-2 to mb-1 */}
                Select Service
              </label>
              <div className="relative group">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-celestial-200 focus:border-celestial-500 transition-all duration-200 appearance-none cursor-pointer hover:border-celestial-300 hover:shadow-md text-gray-900 font-medium"
                  aria-label="Select Service"
                >
                  <option value="">All Services</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.estimated_time}min)
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-celestial-500 group-hover:text-celestial-600 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Currently Serving Banner */}
          {queueData && (
            <div
              className={`relative overflow-hidden rounded-2xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 ${
                queueData.currentServing
                  ? "bg-gradient-to-r from-amber-100 via-orange-100 to-red-100 border-amber-300 ring-2 ring-amber-200 shadow-amber-200/50"
                  : "bg-gradient-to-r from-caramel-100 to-citrine-100 border-caramel-200"
              }`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-caramel-200/30 to-citrine-200/20 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="relative">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-3">
                  {/* Reduced from mb-4 to mb-3 */}
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                        queueData.currentServing
                          ? "bg-gradient-to-br from-amber-500 to-orange-500 animate-pulse"
                          : "bg-gradient-to-br from-caramel-500 to-citrine-500"
                      }`}
                    >
                      <span className="text-white text-base font-bold">
                        {queueData.currentServing ? "🔥" : "📢"}
                      </span>
                    </div>
                    <span
                      className={`font-bold text-xl ${
                        queueData.currentServing
                          ? "text-amber-900"
                          : "text-caramel-800"
                      }`}
                    >
                      Currently Serving
                    </span>
                  </div>

                  {queueData.currentServing && (
                    <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-bounce shadow-lg">
                      ACTION REQUIRED
                    </div>
                  )}
                </div>

                {/* Ticket Information */}
                <div className="mb-4">
                  {/* Reduced from mb-6 to mb-4 */}
                  <p
                    className={`font-bold text-xl mb-1 ${
                      /* Reduced text size from text-2xl to text-xl and mb-2 to mb-1 */
                      queueData.currentServing
                        ? "text-amber-800"
                        : "text-caramel-700"
                    }`}
                  >
                    {queueData.currentServing
                      ? `Ticket ${queueData.currentServing}`
                      : "No ticket currently being served"}
                  </p>
                  {queueData.service && (
                    <p
                      className={`text-sm ${
                        /* Reduced from text-base to text-sm */
                        queueData.currentServing
                          ? "text-amber-700"
                          : "text-caramel-600"
                      }`}
                    >
                      Service: {queueData.service.name} (
                      {queueData.service.estimated_time}min)
                    </p>
                  )}
                </div>

                {/* Action Buttons - Full width on separate row */}
                {queueData.currentServing && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Reduced gap from gap-4 to gap-3 */}
                    <button
                      onClick={() => {
                        showInfo(
                          "Skip Current Customer?",
                          `This will mark ticket ${queueData.currentServing} as cancelled and clear the current serving status. You can then call the next customer.`,
                          {
                            label: "Skip Customer",
                            onClick: () => onSkipTicket(),
                          }
                        );
                      }}
                      disabled={loading}
                      className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-3 rounded-xl text-base font-bold transition-all duration-200 disabled:opacity-50 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] disabled:transform-none"
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <div className="relative flex items-center justify-center space-x-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span>Skip Customer</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        showInfo(
                          "Complete Current Customer?",
                          `This will mark ticket ${queueData.currentServing} as completed and clear the current serving status. You can then call the next customer.`,
                          {
                            label: "Complete Service",
                            onClick: () => onCompleteTicket(),
                          }
                        );
                      }}
                      disabled={loading}
                      className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-xl text-base font-bold transition-all duration-200 disabled:opacity-50 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] disabled:transform-none"
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <div className="relative flex items-center justify-center space-x-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Complete Service</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
