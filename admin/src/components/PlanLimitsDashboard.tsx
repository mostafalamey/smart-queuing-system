import {
  Crown,
  Building2,
  Users,
  Archive,
  Zap,
  TrendingUp,
  Settings,
} from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useEffect, useRef } from "react";

interface PlanLimitsDashboardProps {
  className?: string;
}

export const PlanLimitsDashboard = ({
  className = "",
}: PlanLimitsDashboardProps) => {
  const { planLimits, loading, error, getUsagePercentage, isUnlimited } =
    usePlanLimits();

  // Progress bar component to handle CSS custom property
  const ProgressBar = ({
    percentage,
    colorClass,
  }: {
    percentage: number;
    colorClass: string;
  }) => {
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (progressRef.current) {
        progressRef.current.style.setProperty(
          "--progress-width",
          `${Math.min(percentage, 100)}%`
        );
      }
    }, [percentage]);

    return (
      <div
        ref={progressRef}
        className={`h-2 rounded-full progress-bar ${colorClass}`}
      ></div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !planLimits) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <p className="text-red-600 text-sm">
          {error || "Unable to load plan information"}
        </p>
      </div>
    );
  }

  const planColors = {
    starter: "text-blue-600 bg-blue-50 border-blue-200",
    growth: "text-green-600 bg-green-50 border-green-200",
    business: "text-purple-600 bg-purple-50 border-purple-200",
    enterprise: "text-yellow-600 bg-yellow-50 border-yellow-200",
  };

  const planIcons = {
    starter: Zap,
    growth: TrendingUp,
    business: Building2,
    enterprise: Crown,
  };

  const PlanIcon = planIcons[planLimits.plan] || Zap;
  const planColorClass = planColors[planLimits.plan] || planColors.starter;

  const usageItems = [
    {
      label: "Branches",
      current: planLimits.current_branches,
      max: planLimits.max_branches,
      icon: Building2,
      color: "blue",
    },
    {
      label: "Departments",
      current: planLimits.current_departments,
      max: planLimits.max_departments,
      icon: Archive,
      color: "green",
    },
    {
      label: "Services",
      current: planLimits.current_services,
      max: planLimits.max_services,
      icon: Settings,
      color: "indigo",
    },
    {
      label: "Team Members",
      current: planLimits.current_staff,
      max: planLimits.max_staff,
      icon: Users,
      color: "purple",
    },
  ];

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${planColorClass}`}>
              <PlanIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {planLimits.plan} Plan
              </h3>
              <p className="text-sm text-gray-500">
                Organization: {planLimits.name}
              </p>
            </div>
          </div>
          {planLimits.plan !== "enterprise" && (
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md">
              Upgrade Plan
            </button>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="px-6 pb-6">
        <div className="space-y-4">
          {usageItems.map((item) => {
            // Map display labels to hook parameter names
            const typeMap: Record<
              string,
              "branch" | "department" | "service" | "staff"
            > = {
              Branches: "branch",
              Departments: "department",
              Services: "service",
              "Team Members": "staff",
            };
            const type = typeMap[item.label];
            const percentage = getUsagePercentage(type);
            const isItemUnlimited = isUnlimited(type);
            const Icon = item.icon;

            return (
              <div key={item.label} className="flex items-center gap-4">
                <div
                  className={`p-2 rounded-lg bg-${item.color}-50 text-${item.color}-600`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>
                    <span className="text-sm text-gray-500">
                      {item.current}
                      {isItemUnlimited ? "" : `/${item.max}`}
                    </span>
                  </div>

                  {!isItemUnlimited && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <ProgressBar
                        percentage={percentage}
                        colorClass={getUsageColor(percentage)}
                      />
                    </div>
                  )}

                  {isItemUnlimited && (
                    <div className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-gray-500">Unlimited</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade Suggestion */}
        {planLimits.plan === "starter" &&
          (getUsagePercentage("branch") > 50 ||
            getUsagePercentage("department") > 50 ||
            getUsagePercentage("service") > 50 ||
            getUsagePercentage("staff") > 50) && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Consider Upgrading
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    You're using more than half of your current plan's
                    resources. Upgrade to Growth plan for 3x more branches, 3x
                    more departments, 3x more services, and 4x more team
                    members.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Plan Features Preview */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Current Plan Features
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>
                {planLimits.max_branches === -1
                  ? "Unlimited"
                  : planLimits.max_branches}{" "}
                branches
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>
                {planLimits.max_departments === -1
                  ? "Unlimited"
                  : planLimits.max_departments}{" "}
                departments
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>
                {planLimits.max_services === -1
                  ? "Unlimited"
                  : planLimits.max_services}{" "}
                services
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>
                {planLimits.max_staff === -1
                  ? "Unlimited"
                  : planLimits.max_staff}{" "}
                team members
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>
                {planLimits.ticket_cap === -1
                  ? "Unlimited"
                  : `${planLimits.ticket_cap.toLocaleString()}`}{" "}
                tickets/month
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
