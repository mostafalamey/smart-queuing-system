# Dashboard Features Structure

This directory contains a refactored dashboard with features organized in a modular structure for better maintainability and debugging.

## Directory Structure

```structure
dashboard/
├── features/
│   ├── dashboard-header/          # Dashboard header with refresh and cleanup buttons
│   │   ├── DashboardHeader.tsx
│   │   └── index.ts
│   ├── queue-management/          # Branch, Department, and Service selectors
│   │   ├── QueueManager.tsx
│   │   └── index.ts
│   ├── queue-status/              # Queue statistics and main action buttons
│   │   ├── QueueStatus.tsx
│   │   └── index.ts
│   ├── queue-controls/            # Business logic for queue operations
│   │   ├── useQueueOperations.ts
│   │   └── index.ts
│   └── shared/                    # Shared types, hooks, and components
│       ├── types.ts
│       ├── useDashboardData.ts
│       ├── useRealtimeSubscriptions.ts
│       ├── ConnectionErrorBanner.tsx
│       └── index.ts
├── page.tsx                       # Main dashboard page (refactored)
├── page-original-backup.tsx       # Original monolithic file (backup)
└── README.md                      # This documentation
```

## Features Overview

### 1. Dashboard Header (`dashboard-header/`)

- Displays page title and cleanup information
- Contains refresh and cleanup action buttons
- Handles automated cleanup notifications

### 2. Queue Management (`queue-management/`)

- Branch selection dropdown
- Department selection dropdown
- Service selection dropdown (when available)
- Currently serving ticket display with skip/complete actions

### 3. Queue Status (`queue-status/`)

- Large waiting count display
- Call Next Customer button (main action)
- Reset Queue button
- Real-time queue statistics

### 4. Queue Controls (`queue-controls/`)

- Business logic for all queue operations:
  - `callNext()` - Call the next customer in line
  - `skipCurrentTicket()` - Skip current serving ticket
  - `completeCurrentTicket()` - Mark current ticket as completed
  - `resetQueue()` - Reset entire queue (with optional cleanup)
  - `performCleanup()` - Clean up old completed/cancelled tickets

### 5. Shared (`shared/`)

- **Types**: TypeScript interfaces for all data structures
- **useDashboardData**: Main data management hook with state and fetch functions
- **useRealtimeSubscriptions**: Real-time updates via Supabase subscriptions
- **ConnectionErrorBanner**: Error state display component

## Benefits of This Structure

### 1. **Separation of Concerns**

- UI components are separated from business logic
- Data management is isolated in custom hooks
- Each feature has a single responsibility

### 2. **Maintainability**

- Easy to locate and fix bugs in specific features
- Components are smaller and more focused
- Clear boundaries between different functionalities

### 3. **Reusability**

- Shared types and hooks can be used across features
- Components can be easily tested in isolation
- Business logic can be reused in different contexts

### 4. **Debugging**

- Smaller files make debugging easier
- Clear component boundaries help isolate issues
- Business logic is separated from UI rendering

### 5. **Scalability**

- Easy to add new features without modifying existing ones
- Clear patterns for adding new queue operations
- Modular structure supports team development

## Usage

### Adding a New Queue Operation

1. Add the operation function to `queue-controls/useQueueOperations.ts`
2. Export it from the hook's return object
3. Use it in the main dashboard page
4. Add UI elements to the appropriate feature component

### Adding a New UI Feature

1. Create a new directory under `features/`
2. Create the component file and index.ts
3. Import and use in the main dashboard page
4. Add any shared types to `shared/types.ts`

### Modifying Existing Features

- Find the specific feature directory
- Modify only the relevant component or hook
- Shared changes go in the `shared/` directory

## Performance Considerations

- Real-time subscriptions are managed in a separate hook
- Data fetching is optimized with useCallback and proper dependencies
- Component re-renders are minimized through proper state management

## Testing Strategy

Each feature can be tested independently:

- Unit tests for individual components
- Integration tests for custom hooks
- E2E tests for complete user workflows

This modular structure makes the codebase much more manageable and easier to debug compared to the original 1364-line monolithic file.
