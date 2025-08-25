import { Phone, Users } from "lucide-react";
import { QueueData } from "../shared/types";

interface QueueStatusProps {
  queueData: QueueData | null;
  loading: boolean;
  onCallNext: () => void;
  onShowResetModal: () => void;
  canResetQueue?: boolean;
  currentTicketHandled?: boolean;
}

export const QueueStatus = ({
  queueData,
  loading,
  onCallNext,
  onShowResetModal,
  canResetQueue = true,
  currentTicketHandled = false,
}: QueueStatusProps) => {
  if (!queueData) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-celestial-500 to-french-600 rounded-2xl p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 group h-full">
      {/* Animated Background Elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-110 transition-transform duration-500"></div>

      <div className="relative h-full flex flex-col">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl">Queue Status</span>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="text-9xl font-black mb-3 text-white drop-shadow-lg leading-none">
              {queueData.waitingCount || 0}
            </div>
            <div className="text-celestial-100 text-2xl font-bold">
              Customers Waiting
            </div>
          </div>
          <div className="space-y-4">
            {/* Enhanced Call Next Button - Main Action - Significantly Larger */}
            <button
              onClick={onCallNext}
              disabled={
                !queueData.waitingCount ||
                loading ||
                (!!queueData.currentServing && !currentTicketHandled)
              }
              className="w-full relative overflow-hidden bg-gradient-to-r from-yellowgreen-500 to-citrine-500 hover:from-yellowgreen-600 hover:to-citrine-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-12 rounded-2xl font-black text-2xl transition-all duration-200 shadow-2xl hover:shadow-3xl disabled:shadow-none group/btn transform hover:scale-105 disabled:transform-none min-h-[120px]"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"></div>
              <div className="relative flex items-center justify-center">
                <Phone className="w-10 h-10 mr-4 group-hover/btn:rotate-12 transition-transform duration-200" />
                <span className="text-2xl font-extrabold">
                  {loading
                    ? "Calling..."
                    : !!queueData.currentServing && !currentTicketHandled
                    ? "Skip or Complete Current Ticket First"
                    : "Call Next Customer"}
                </span>
              </div>
            </button>

            {/* Helper message when button is disabled due to unhandled current ticket */}
            {!!queueData.currentServing &&
              !currentTicketHandled &&
              !loading && (
                <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center space-x-2 text-amber-800">
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span className="font-semibold text-sm">
                      Please handle the current customer (
                      {queueData.currentServing}) first
                    </span>
                  </div>
                  <p className="text-amber-700 text-xs mt-1">
                    Use the Skip or Complete buttons in the Currently Serving
                    section
                  </p>
                </div>
              )}
            {/* Secondary Action Buttons */}
            {canResetQueue && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={onShowResetModal}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl group/btn"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"></div>
                  <span className="relative">Reset Queue</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
