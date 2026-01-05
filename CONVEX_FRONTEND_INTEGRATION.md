# Convex Frontend Integration - Complete Guide

## Overview

Your React frontend is now fully connected to the Convex backend. This document explains the integration and how to use it.

## Architecture

```
┌─────────────────┐
│   React App     │
│   (Frontend)    │
└────────┬────────┘
         │
         │ WebSocket (Real-time)
         │
┌────────▼────────┐
│ Convex Backend  │
│ (Serverless DB) │
└─────────────────┘
```

## Files Modified

### 1. **index.tsx** - Entry Point
- Wraps the entire app with `ConvexClientProvider`
- Initializes the Convex connection

### 2. **components/ConvexClientProvider.tsx** - Convex Setup
- Initializes `ConvexReactClient` with the deployment URL
- Shows error if `VITE_CONVEX_URL` is not configured
- Provides the Convex context to all components

### 3. **components/JobHistoryList.tsx** - Real-time Job Tracking
- Uses `useQuery(api.publicJobs.listJobs)` for live job updates
- Displays job status, tokens, created dates
- Supports filtering by status (pending, processing, completed, failed)
- Implements pagination
- Shows job details modal

### 4. **components/PresetManager.tsx** - Cloud-based Presets
- Replaces localStorage with Convex database
- Uses `useQuery(api.publicPresets.listPresets)` to list presets
- Uses `useMutation(api.publicPresets.createPreset)` to save presets
- Uses `useMutation(api.publicPresets.deletePreset)` to delete presets
- Loads full preset details with `useQuery(api.publicPresets.getPreset)`

### 5. **App.tsx** - Main Application
- Integrated `PresetManager` component
- Removed old localStorage-based setup management
- Added `handleLoadPreset` to apply cloud presets to current config

## Environment Configuration

### .env.local
```bash
VITE_CONVEX_URL=https://resilient-loris-278.convex.cloud
CONVEX_DEPLOYMENT=dev:resilient-loris-278
```

**Important**: Restart your dev server after changing `.env.local`

## How to Use

### Running the Application

1. **Start Convex Backend**:
   ```bash
   npm run convex:dev
   ```

2. **Start Frontend** (in separate terminal):
   ```bash
   npm run dev
   ```

### Using Preset Management

#### Save Current Configuration
1. Click "Save Current" in the Preset Manager
2. Enter a unique preset name (e.g., "Japan Urban Style")
3. Click "Save"
4. Preset is stored in Convex database (available across all devices)

#### Load a Saved Preset
1. Click "Load Saved"
2. Browse available presets (synced in real-time)
3. Click on a preset name to load it
4. The configuration is applied to your current settings

#### Delete a Preset
1. Click "Load Saved"
2. Hover over a preset to reveal the "Delete" button
3. Click "Delete" to remove it from the database

### Viewing Job History

1. Click the "Job History" tab
2. View all processing jobs with real-time updates
3. Filter by status using the dropdown
4. Click "Details" to see full job information
5. Click "View" to see the generated image (if available)

## Real-Time Features

### Automatic Updates
- **Job list updates** when new jobs are created via API
- **Preset list updates** when presets are added/deleted
- **Status changes** reflect immediately across all connected clients
- **No manual refresh needed** - Convex handles WebSocket subscriptions

### Live Indicators
- Spinning loader icon when data is loading
- "Live updates" badge when connection is active
- Real-time token usage tracking

## Convex Hooks Used

### Queries (Read Data)
```typescript
// List jobs with filtering
const jobsData = useQuery(api.publicJobs.listJobs, {
  limit: 10,
  offset: 0,
  status: "completed"
});

// Get single job
const job = useQuery(api.publicJobs.getJob, { jobId });

// List presets
const presets = useQuery(api.publicPresets.listPresets);

// Get preset details
const preset = useQuery(api.publicPresets.getPreset, { name: "Japan Style" });
```

### Mutations (Write Data)
```typescript
// Create preset
const createPreset = useMutation(api.publicPresets.createPreset);
await createPreset({ name: "My Preset", config: {...} });

// Delete preset
const deletePreset = useMutation(api.publicPresets.deletePreset);
await deletePreset({ name: "My Preset" });

// Update preset
const updatePreset = useMutation(api.publicPresets.updatePreset);
await updatePreset({ name: "My Preset", config: {...} });
```

## Database Schema

### Jobs Table
```typescript
{
  _id: Id<"jobs">,
  batchId?: string,
  sourceUrl: string,
  presetName?: string,
  config: {...},
  status: "pending" | "processing" | "completed" | "failed",
  error?: string,
  generatedFileName?: string,
  generatedUrl?: string,
  totalTokens?: number,
  createdAt: number,
  completedAt?: number
}
```

### Presets Table
```typescript
{
  _id: Id<"presets">,
  name: string,
  targetCountry: string,
  additionalContext: string,
  removeBranding: boolean,
  addBrandingColors: boolean,
  brandingColor: string,
  addOwnLogo: boolean,
  ownLogoData?: string | null,
  filenameFindPattern: string,
  filenameReplacePattern: string,
  createdAt: number,
  updatedAt: number
}
```

## Available Convex Functions

### Public Queries (Frontend Can Call)

#### Jobs
- `api.publicJobs.listJobs` - List jobs with filtering
- `api.publicJobs.getJob` - Get single job by ID
- `api.publicJobs.getJobsByBatch` - Get all jobs in a batch
- `api.publicJobs.getBatchSummary` - Get batch statistics
- `api.publicJobs.getRecentJobsSummary` - Dashboard stats

#### Presets
- `api.publicPresets.listPresets` - List all presets (summary)
- `api.publicPresets.getPreset` - Get preset by name (full details)
- `api.publicPresets.getPresetById` - Get preset by ID
- `api.publicPresets.isPresetNameAvailable` - Check name availability

### Public Mutations (Frontend Can Call)

#### Presets
- `api.publicPresets.createPreset` - Create new preset
- `api.publicPresets.updatePreset` - Update existing preset
- `api.publicPresets.deletePreset` - Delete preset by name

## Error Handling

### Query Errors
```typescript
const data = useQuery(api.publicJobs.listJobs, {});

// data === undefined while loading
// data === null if error or not found
// data === {...} when successful
```

### Mutation Errors
```typescript
const createPreset = useMutation(api.publicPresets.createPreset);

try {
  await createPreset({ name: "Test", config: {...} });
  alert("Success!");
} catch (error: any) {
  alert(`Error: ${error.message}`);
}
```

## Common Patterns

### Skip Pattern (Conditional Queries)
```typescript
const [selectedName, setSelectedName] = useState<string | null>(null);

// Only fetch when selectedName is set
const preset = useQuery(
  api.publicPresets.getPreset,
  selectedName ? { name: selectedName } : "skip"
);
```

### Loading States
```typescript
const data = useQuery(api.publicJobs.listJobs, {});

if (data === undefined) {
  return <div>Loading...</div>;
}

return <div>{data.jobs.length} jobs</div>;
```

### Pagination
```typescript
const [page, setPage] = useState(1);
const pageSize = 10;

const jobsData = useQuery(api.publicJobs.listJobs, {
  limit: pageSize,
  offset: (page - 1) * pageSize
});

const totalPages = Math.ceil(jobsData?.total ?? 0 / pageSize);
```

## Benefits of Convex Integration

### 1. Real-Time Synchronization
- All clients see updates immediately
- No polling or manual refresh needed
- WebSocket-based live updates

### 2. Serverless Database
- No backend server to manage
- Automatic scaling
- Built-in type safety

### 3. Type Safety
- TypeScript types auto-generated from schema
- Compile-time validation
- IntelliSense support

### 4. Cloud Storage
- Presets stored in the cloud (not localStorage)
- Available across devices
- Multi-user support ready

### 5. Job Tracking
- Track all API processing jobs
- Monitor status and errors
- View token usage and costs

## Testing the Integration

### 1. Test Preset Creation
1. Configure some settings in the app
2. Save as a preset with a unique name
3. Check the "Job History" tab - you should see real-time updates
4. Open the app in another browser tab - preset should appear there too

### 2. Test Real-Time Updates
1. Open the app in two browser tabs
2. Create a preset in tab 1
3. Watch it appear in tab 2 instantly
4. Delete the preset in tab 2
5. Watch it disappear in tab 1

### 3. Test Job Tracking
1. Use the HTTP API to submit a processing job
2. Switch to "Job History" tab
3. Watch the job status update in real-time
4. Click "Details" to see full job information

## Deployment

### Production Build
```bash
npm run build
```

### Deploy Convex Backend
```bash
npm run convex:deploy
```

After deployment, update `.env.local` with production URL:
```bash
VITE_CONVEX_URL=https://your-production-url.convex.cloud
```

## Troubleshooting

### "VITE_CONVEX_URL not set" Error
- Check `.env.local` file exists
- Verify the URL is correct
- Restart dev server (`npm run dev`)

### Queries Return `undefined`
- Check Convex backend is running (`npm run convex:dev`)
- Verify network connection
- Check browser console for WebSocket errors

### Mutations Fail
- Check error message in catch block
- Verify data matches schema validators
- Check Convex logs in terminal

### Real-Time Updates Not Working
- Verify WebSocket connection in browser DevTools (Network tab)
- Check Convex backend is running
- Refresh the page to reconnect

## Next Steps

1. **Add more queries** for advanced filtering
2. **Implement batch operations** for bulk preset management
3. **Add user authentication** for multi-user support
4. **Create dashboard widgets** using `getRecentJobsSummary`
5. **Add preset sharing** between users

## Support

- **Convex Documentation**: https://docs.convex.dev
- **Convex Discord**: https://convex.dev/community
- **ConvexExamples.tsx**: See `components/ConvexExamples.tsx` for 10+ code examples

---

**Status**: ✅ Fully Integrated
**Last Updated**: 2026-01-05
**Convex URL**: https://resilient-loris-278.convex.cloud
