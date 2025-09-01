import React from "react";
import { RefreshCw, BarChart3, TrendingUp } from "lucide-react";

interface AnalyticsHeaderProps {
  onRefresh: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  onRefresh,
}) => {
  return (
    <div className="page-header no-bottom-margin">
      <div className="header-accent"></div>

      <div className="header-content justify-between">
        <div className="flex items-center space-x-4">
          <div className="header-icon-container">
            <div className="header-icon">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h1 className="header-title">Analytics & Insights</h1>
            <p className="header-subtitle">
              Monitor queue performance and operational metrics
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="group relative overflow-hidden bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-white/30"
        >
          <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
          <div className="relative flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
            <span className="text-sm">Refresh Data</span>
          </div>
        </button>
      </div>

      {/* Analytics Quick Stats Bar */}
      <div className="relative mt-4 flex items-center space-x-6 text-sm text-white/80">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-green-300" />
          <span>Real-time insights</span>
        </div>
        <div className="w-px h-4 bg-white/30"></div>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

