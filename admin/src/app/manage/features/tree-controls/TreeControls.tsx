import { ZoomIn, ZoomOut, Home, Plus, Save } from 'lucide-react'

interface TreeControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onCreateBranch: () => void
  onSaveLayout?: () => void
  canCreateBranch?: boolean // Made optional since we always show the button now
}

export const TreeControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onCreateBranch,
  onSaveLayout,
  canCreateBranch = true // Default to true
}: TreeControlsProps) => {
  return (
    <>
      {/* Floating Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2">
          <div className="flex flex-col gap-1">
            <button
              onClick={onZoomIn}
              disabled={zoom >= 3}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={onZoomOut}
              disabled={zoom <= 0.3}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={onResetView}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
              title="Reset View"
              aria-label="Reset view to center"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Always show the Add Branch button */}
        <button
          onClick={onCreateBranch}
          className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors text-white shadow-lg backdrop-blur-md"
          title="Create New Branch"
          aria-label="Create new branch"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Branch</span>
        </button>

        {/* Save Layout button */}
        {onSaveLayout && (
          <button
            onClick={onSaveLayout}
            className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors text-white shadow-lg backdrop-blur-md"
            title="Save Current Layout"
            aria-label="Save current node positions and viewport"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Save Layout</span>
          </button>
        )}
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2">
          <span className="text-sm text-white">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </>
  )
}
