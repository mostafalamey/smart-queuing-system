import React from "react";
import { Calendar, Filter, Building2, Users } from "lucide-react";
import { TimeRange, Branch, Department } from "../../types";

interface AnalyticsFiltersProps {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  selectedBranch: string;
  setSelectedBranch: (branchId: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (deptId: string) => void;
  branches: Branch[];
  departments: Department[];
  loading: boolean;
}

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  timeRange,
  setTimeRange,
  selectedBranch,
  setSelectedBranch,
  selectedDepartment,
  setSelectedDepartment,
  branches,
  departments,
  loading,
}) => {
  const timeRangeOptions = [
    { value: "today", label: "Today" },
    { value: "week", label: "Last 7 Days" },
    { value: "month", label: "Last 30 Days" },
  ];

  return (
    <div className="analytics-card p-6 mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="select-field"
            aria-label="Select time range"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4 inline mr-1" />
            Branch
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={loading || branches.length === 0}
            className="select-field disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Select branch"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Department
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            disabled={loading || !selectedBranch || departments.length === 0}
            className="select-field disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Select department"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Indicator */}
        <div className="flex items-end">
          <div className="w-full">
            <div className="text-sm text-gray-600 mb-2">Status</div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
              <div
                className={`w-2 h-2 rounded-full ${
                  loading ? "bg-yellow-400 animate-pulse" : "bg-green-400"
                }`}
              ></div>
              <span className="text-sm font-medium text-green-700">
                {loading ? "Loading..." : "Live Data"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

