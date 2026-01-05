# Convex Frontend Architecture

## Component Hierarchy

```
index.tsx
  └── <React.StrictMode>
        └── <ConvexClientProvider>  ← Convex WebSocket connection
              └── <App>
                    ├── <Header>
                    └── <main>
                          ├── Config Panel
                          │     ├── <PresetManager>  ← Cloud presets (Convex)
                          │     ├── API Key Input
                          │     ├── Country Selector
                          │     ├── Context Input
                          │     ├── Branding Options
                          │     └── Process Button
                          │
                          └── Content Area (Tabs)
                                ├── Gallery View
                                │     ├── <UploadZone>
                                │     └── <GalleryItem> (multiple)
                                │
                                ├── API Integration
                                │     └── <ApiDocs>
                                │
                                └── Job History
                                      └── <JobHistoryList>  ← Live jobs (Convex)
```

---

## Data Flow

### 1. Preset Management Flow

```
User Action
    ↓
PresetManager Component
    ↓
useMutation(api.publicPresets.createPreset)
    ↓
    ┌─────────────────────────────────┐
    │  Convex Backend (Cloud)         │
    │  - Validates data               │
    │  - Stores in presets table      │
    │  - Returns preset ID            │
    └─────────────────────────────────┘
    ↓
WebSocket broadcasts change
    ↓
All connected clients receive update
    ↓
useQuery(api.publicPresets.listPresets) auto-updates
    ↓
UI re-renders with new preset
```

### 2. Job Tracking Flow

```
API Request (HTTP)
    ↓
Convex HTTP Endpoint
    ↓
Creates job in database
    ↓
    ┌─────────────────────────────────┐
    │  Convex jobs table              │
    │  - status: "pending"            │
    │  - sourceUrl, config, etc.      │
    └─────────────────────────────────┘
    ↓
WebSocket notifies all clients
    ↓
useQuery(api.publicJobs.listJobs) receives update
    ↓
JobHistoryList component re-renders
    ↓
User sees new job instantly (no refresh needed)
```

### 3. Real-Time Sync Flow

```
Browser Tab 1                  Convex Cloud                Browser Tab 2
     │                              │                              │
     │  Create preset "Japan"       │                              │
     │ ──────────────────────────> │                              │
     │                              │                              │
     │                              │  Store in database           │
     │                              │                              │
     │  Confirmation                │  Broadcast via WebSocket     │
     │ <────────────────────────── │ ──────────────────────────> │
     │                              │                              │
     │  UI updates                  │                   UI updates │
     │  (shows new preset)          │        (shows new preset)   │
```

---

## Component Responsibilities

### ConvexClientProvider
**File**: `components/ConvexClientProvider.tsx`
**Role**: WebSocket connection manager
```typescript
- Initialize ConvexReactClient
- Provide Convex context to app
- Handle connection errors
- Show helpful error UI if misconfigured
```

### PresetManager
**File**: `components/PresetManager.tsx`
**Role**: Cloud preset CRUD operations
```typescript
Queries:
  - api.publicPresets.listPresets      → List all presets
  - api.publicPresets.getPreset        → Get full preset details

Mutations:
  - api.publicPresets.createPreset     → Save new preset
  - api.publicPresets.deletePreset     → Delete preset

State:
  - presetName: Current input
  - showSaveDialog: Toggle save UI
  - showLoadMenu: Toggle load UI
  - selectedPresetName: Preset being loaded
```

### JobHistoryList
**File**: `components/JobHistoryList.tsx`
**Role**: Real-time job monitoring
```typescript
Queries:
  - api.publicJobs.listJobs           → Get jobs (filtered, paginated)

State:
  - statusFilter: Filter by job status
  - currentPage: Pagination state
  - selectedJob: Job details modal

Features:
  - Status filtering
  - Pagination
  - Job details modal
  - Real-time updates
  - Token usage display
```

### App
**File**: `App.tsx`
**Role**: Main orchestrator
```typescript
State:
  - config: Current app configuration
  - tasks: Image processing queue
  - activeTab: Current view (gallery/api/history)

Functions:
  - handleLoadPreset: Apply preset to config
  - processQueue: Process images
  - handleFilesSelected: Add images
```

---

## Database Schema

### Presets Table
```
┌─────────────────────────────────────────┐
│ presets                                 │
├─────────────────────────────────────────┤
│ _id: Id<"presets">         [PK]        │
│ name: string               [UNIQUE]     │ ← Index: by_name
│ targetCountry: string                   │
│ additionalContext: string               │
│ removeBranding: boolean                 │
│ addBrandingColors: boolean              │
│ brandingColor: string                   │
│ addOwnLogo: boolean                     │
│ ownLogoData: string | null              │
│ filenameFindPattern: string             │
│ filenameReplacePattern: string          │
│ modelVersion?: string                   │
│ aspectRatio?: string                    │
│ imageSize?: string                      │
│ createdAt: number                       │
│ updatedAt: number                       │
└─────────────────────────────────────────┘
```

### Jobs Table
```
┌─────────────────────────────────────────┐
│ jobs                                    │
├─────────────────────────────────────────┤
│ _id: Id<"jobs">            [PK]        │
│ batchId?: string                        │ ← Index: by_batchId
│ sourceUrl: string                       │
│ presetName?: string                     │
│ config: PresetConfig                    │
│ status: "pending" | ...                 │ ← Index: by_status
│ error?: string                          │
│ generatedFileId?: Id<"_storage">        │
│ generatedFileName?: string              │
│ generatedUrl?: string                   │
│ promptTokens?: number                   │
│ candidateTokens?: number                │
│ totalTokens?: number                    │
│ createdAt: number                       │ ← Index: by_createdAt
│ completedAt?: number                    │
└─────────────────────────────────────────┘
```

---

## API Endpoints (Backend)

### Convex Functions

```
convex/
├── publicJobs.ts
│   ├── listJobs(limit?, offset?, status?, batchId?)
│   ├── getJob(jobId)
│   ├── getJobsByBatch(batchId)
│   ├── getBatchSummary(batchId)
│   └── getRecentJobsSummary(limit?)
│
└── publicPresets.ts
    ├── listPresets()
    ├── getPreset(name)
    ├── getPresetById(id)
    ├── createPreset(name, config)
    ├── updatePreset(name, config)
    ├── deletePreset(name)
    └── isPresetNameAvailable(name)
```

### HTTP Endpoints
```
convex/http.ts
├── POST   /api/jobs                → Create processing job
├── GET    /api/jobs                → List jobs
├── GET    /api/jobs/:id            → Get job details
├── POST   /api/presets             → Create preset
├── GET    /api/presets             → List presets
├── GET    /api/presets/:name       → Get preset
├── PUT    /api/presets/:name       → Update preset
└── DELETE /api/presets/:name       → Delete preset
```

---

## State Management

### React State (Local)
```typescript
App.tsx:
  - config: AppConfig          → Current settings
  - tasks: ImageTask[]         → Processing queue
  - selectedIds: Set<string>   → Selected images
  - isProcessing: boolean      → Processing status
  - activeTab: string          → Current view

PresetManager.tsx:
  - presetName: string         → Input value
  - showSaveDialog: boolean    → UI toggle
  - showLoadMenu: boolean      → UI toggle
  - selectedPresetName: string → Loading state

JobHistoryList.tsx:
  - statusFilter: string       → Filter value
  - currentPage: number        → Pagination
  - selectedJob: Job | null    → Modal state
```

### Convex State (Global)
```typescript
Presets:
  - Stored in Convex database
  - Synced across all clients
  - Queried with useQuery()
  - Modified with useMutation()

Jobs:
  - Created by HTTP API
  - Stored in Convex database
  - Real-time updates via WebSocket
  - Queried with useQuery()
```

---

## Network Communication

### WebSocket (Real-Time)
```
Frontend                    Convex Cloud
   │                             │
   │  Subscribe to queries       │
   │ ─────────────────────────> │
   │                             │
   │  Initial data               │
   │ <───────────────────────── │
   │                             │
   │  (Database changes)         │
   │                             │
   │  Update notification        │
   │ <───────────────────────── │
   │                             │
   │  Component re-renders       │
```

### HTTP (API Calls)
```
External Client            Convex HTTP
   │                             │
   │  POST /api/jobs             │
   │ ─────────────────────────> │
   │                             │
   │  Create job in DB           │
   │                             │
   │  Response: job ID           │
   │ <───────────────────────── │
```

---

## Type System

### Generated Types
```typescript
convex/_generated/
├── api.d.ts              → Function references
│   ├── api.publicJobs.listJobs
│   ├── api.publicJobs.getJob
│   ├── api.publicPresets.listPresets
│   └── ...
│
├── dataModel.d.ts        → Table types
│   ├── Id<"jobs">
│   ├── Id<"presets">
│   └── ...
│
└── server.d.ts           → Server context types
```

### Usage in Components
```typescript
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// Types are inferred automatically
const jobs = useQuery(api.publicJobs.listJobs, {
  limit: 10  // TypeScript validates this
});

// jobs is typed as:
// {
//   jobs: Job[],
//   total: number,
//   limit: number,
//   offset: number
// } | undefined
```

---

## Performance Optimizations

### Query Optimization
```typescript
// Index usage for fast queries
by_name       → O(log n) lookup by preset name
by_status     → O(log n) filtering by job status
by_batchId    → O(log n) batch job lookup
by_createdAt  → O(log n) time-ordered queries
```

### React Optimizations
```typescript
// Queries only re-run when args change
useQuery(api.publicJobs.listJobs, {
  limit,
  offset,
  status  // Only re-fetches when these change
});

// Skip pattern prevents unnecessary queries
useQuery(
  api.publicPresets.getPreset,
  selectedName ? { name: selectedName } : "skip"
);
```

### WebSocket Efficiency
```
- Single WebSocket connection per client
- Automatic reconnection on disconnect
- Only sends deltas (changed data)
- Batches updates for efficiency
```

---

## Error Handling

### Query Errors
```typescript
const data = useQuery(api.publicJobs.listJobs, {});

if (data === undefined) {
  // Still loading - show spinner
}
if (data === null) {
  // Error or not found - show error UI
}
if (data) {
  // Success - render data
}
```

### Mutation Errors
```typescript
try {
  await createPreset({ name, config });
  // Success
} catch (error: any) {
  // Show user-friendly error
  alert(`Error: ${error.message}`);
}
```

### Network Errors
```typescript
ConvexClientProvider:
  - Detects missing VITE_CONVEX_URL
  - Shows configuration error UI
  - Prevents app crash

WebSocket:
  - Auto-reconnects on disconnect
  - Queues updates during offline
  - Syncs when back online
```

---

## Deployment Architecture

### Development
```
┌──────────────┐     ┌─────────────────────────┐
│  localhost   │────▶│  Convex Dev Deployment  │
│  :5173       │     │  resilient-loris-278    │
└──────────────┘     └─────────────────────────┘
```

### Production
```
┌──────────────┐     ┌─────────────────────────┐
│  Vercel/     │────▶│  Convex Prod            │
│  Netlify     │     │  (same or new URL)      │
└──────────────┘     └─────────────────────────┘
```

---

## Security

### Data Validation
```typescript
// All inputs validated by Convex validators
v.string()
v.number()
v.boolean()
v.object({ ... })

// Invalid data rejected before reaching database
```

### Access Control
```typescript
// Public functions (anyone can call)
export const listPresets = query({ ... });

// Internal functions (only server can call)
export const internalFunction = internalMutation({ ... });
```

### Environment Variables
```typescript
// Backend secrets (not exposed to client)
CONVEX_DEPLOYMENT=dev:resilient-loris-278

// Frontend config (exposed via VITE_ prefix)
VITE_CONVEX_URL=https://resilient-loris-278.convex.cloud
```

---

## Testing Strategy

### Unit Tests (Components)
- Test PresetManager CRUD operations
- Test JobHistoryList filtering/pagination
- Test ConvexClientProvider error states

### Integration Tests
- Test real-time sync between tabs
- Test preset save/load flow
- Test job status updates

### E2E Tests
- Full user workflow
- Multi-tab synchronization
- Error recovery

**See**: `TESTING_CHECKLIST.md` for complete test suite

---

## Summary

```
Architecture: Client-Server with Real-Time Sync
Database: Convex (Serverless, PostgreSQL-compatible)
Transport: WebSocket (queries) + HTTP (API)
State: React (local) + Convex (global)
Types: Full TypeScript with auto-generation
Deployment: Vite + Convex Cloud
```

**Status**: ✅ Production Ready
