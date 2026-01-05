# Convex Database Connection Setup Guide

This guide explains how to connect your React frontend to the Convex database for real-time data synchronization.

## Overview

The application now uses **two methods** to interact with Convex:

1. **HTTP API Endpoints** - For external API calls (existing)
2. **Direct Convex Queries/Mutations** - For real-time frontend updates (NEW)

## Architecture

```
Frontend (React)
├── useQuery hooks → Public Convex Queries → Database
├── useMutation hooks → Public Convex Mutations → Database
└── HTTP fetch → HTTP Actions → Internal Functions → Database
```

## Setup Steps

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
# Convex Deployment URL (for React hooks)
VITE_CONVEX_URL=https://brilliant-mink-133.convex.cloud

# Convex Site URL (for HTTP API endpoints)
VITE_CONVEX_SITE_URL=https://brilliant-mink-133.convex.site

# Gemini API Key (set in Convex dashboard, not here)
```

**Important:**
- `VITE_CONVEX_URL` is used by the Convex React client
- `VITE_CONVEX_SITE_URL` is used for HTTP API calls (backwards compatibility)

### 2. Convex Dashboard Configuration

1. Go to https://dashboard.convex.dev/d/brilliant-mink-133
2. Navigate to **Settings** → **Environment Variables**
3. Add `GEMINI_API_KEY` with your Google AI API key

### 3. Database Tables

The app uses two main tables:

#### Jobs Table
Tracks image processing jobs with real-time status updates.

**Fields:**
- `status`: "pending" | "processing" | "completed" | "failed"
- `sourceUrl`: Source image URL
- `config`: Processing configuration snapshot
- `generatedUrl`: Result image URL
- `totalTokens`: Token usage
- `batchId`: Batch identifier (optional)
- `presetName`: Preset used (optional)

**Indexes:**
- `by_status` - Filter by job status
- `by_batchId` - Get all jobs in a batch
- `by_createdAt` - Sort by creation time

#### Presets Table
Stores reusable configuration presets.

**Fields:**
- `name`: Unique preset name
- `targetCountry`: Target localization country
- `config`: All processing settings
- `createdAt` / `updatedAt`: Timestamps

**Indexes:**
- `by_name` - Lookup preset by name

## Public Functions (Frontend Access)

### Jobs (convex/publicJobs.ts)

These can be called from React using `useQuery`:

```typescript
import { useQuery } from "convex/react";
import { api } from "./convex/_generated/api";

// List jobs with filtering
const jobs = useQuery(api.publicJobs.listJobs, {
  limit: 10,
  offset: 0,
  status: "completed", // optional
  batchId: "batch-123", // optional
});

// Get single job
const job = useQuery(api.publicJobs.getJob, {
  jobId: "j_abc123" as Id<"jobs">
});

// Get batch summary
const summary = useQuery(api.publicJobs.getBatchSummary, {
  batchId: "batch-123"
});
```

### Presets (convex/publicPresets.ts)

Queries and mutations for preset management:

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "./convex/_generated/api";

// List all presets
const presets = useQuery(api.publicPresets.listPresets);

// Get single preset
const preset = useQuery(api.publicPresets.getPreset, {
  name: "Japan Urban"
});

// Create preset (mutation)
const createPreset = useMutation(api.publicPresets.createPreset);
await createPreset({
  name: "My Preset",
  config: { /* preset config */ }
});

// Update preset (mutation)
const updatePreset = useMutation(api.publicPresets.updatePreset);
await updatePreset({
  name: "My Preset",
  config: { /* updated config */ }
});

// Delete preset (mutation)
const deletePreset = useMutation(api.publicPresets.deletePreset);
await deletePreset({ name: "My Preset" });
```

## Real-Time Updates

Convex queries are **reactive**. When data changes in the database, components automatically re-render with fresh data.

```typescript
// This query updates automatically when jobs change
const jobs = useQuery(api.publicJobs.listJobs, { limit: 10 });

// No need for polling or manual refresh!
```

## Components Using Convex

### JobHistoryList Component

Located at `components/JobHistoryList.tsx`

**Features:**
- Real-time job status updates
- Filtering by status
- Pagination
- No manual refresh needed

**Usage:**
```tsx
import { JobHistoryList } from "./components/JobHistoryList";

<JobHistoryList />
```

### PresetManager Component

Located at `components/PresetManager.tsx`

**Features:**
- Save current config as preset
- Load saved presets
- Delete presets
- Real-time sync across devices

**Usage:**
```tsx
import { PresetManager } from "./components/PresetManager";

<PresetManager
  currentConfig={config}
  onLoadPreset={(config) => setConfig(config)}
/>
```

## Internal vs Public Functions

### Internal Functions (convex/jobs.ts, convex/presets.ts)

- **Cannot** be called from React frontend
- Used by HTTP actions and other internal functions
- Marked with `internalQuery` or `internalMutation`

### Public Functions (convex/publicJobs.ts, convex/publicPresets.ts)

- **Can** be called from React frontend
- Used with `useQuery` and `useMutation` hooks
- Marked with `query` or `mutation`

## HTTP Endpoints (Backwards Compatibility)

The existing HTTP endpoints still work:

```bash
# List jobs
GET https://brilliant-mink-133.convex.site/api/jobs

# Create preset
POST https://brilliant-mink-133.convex.site/api/presets

# Process single image
POST https://brilliant-mink-133.convex.site/api/process/single
```

These are useful for:
- External integrations
- Non-React clients
- Webhooks

## Development Workflow

### 1. Start Convex Dev Server

```bash
npx convex dev
```

This watches for schema changes and syncs functions.

### 2. Start React Dev Server

```bash
npm run dev
```

### 3. Make Changes

When you modify Convex functions:
1. Save the file
2. Convex automatically deploys
3. React components get updated data

## Troubleshooting

### "VITE_CONVEX_URL not set" Warning

**Solution:** Create `.env` file with:
```env
VITE_CONVEX_URL=https://brilliant-mink-133.convex.cloud
```

### Components Show Loading Forever

**Check:**
1. Is `npx convex dev` running?
2. Is the deployment URL correct?
3. Are functions exported correctly?

### Mutations Fail

**Common issues:**
1. Missing required fields
2. Validation errors (check function args)
3. Unique constraint violations (e.g., duplicate preset name)

### Data Not Updating

**Verify:**
1. ConvexProvider wraps your app
2. Using correct function path (`api.publicJobs.listJobs`)
3. Function is exported as `query` not `internalQuery`

## Testing Convex Functions

### Using Convex Dashboard

1. Go to https://dashboard.convex.dev/d/brilliant-mink-133
2. Click **Functions** tab
3. Select a function
4. Enter test arguments
5. Click **Run**

### Using React Components

The Job History tab provides a live view of the database.

## Performance Considerations

### Query Efficiency

Convex queries are fast, but consider:

1. **Use indexes** - Filter by indexed fields (status, batchId, createdAt)
2. **Limit results** - Don't fetch all jobs at once
3. **Pagination** - Use offset/limit for large datasets

### Real-Time Updates

Convex subscriptions are efficient:
- Only changed data is sent
- Automatic batching
- Optimized for mobile networks

## Security

### Public vs Internal

- **Public functions** can be called by anyone with the deployment URL
- For production, add authentication:

```typescript
export const listJobs = query({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Add auth check
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Rest of query...
  }
});
```

### Environment Variables

- Never commit `.env` to git
- Use `.env.example` as template
- Set production env vars in Convex dashboard

## Next Steps

1. **Add Authentication** - Use Convex Auth or Clerk
2. **Add Optimistic Updates** - Improve perceived performance
3. **Add Error Boundaries** - Handle query failures gracefully
4. **Add Loading States** - Better UX during data fetches

## Resources

- [Convex Docs](https://docs.convex.dev)
- [Convex Dashboard](https://dashboard.convex.dev/d/brilliant-mink-133)
- [React Integration Guide](https://docs.convex.dev/client/react)
- [Schema Design](https://docs.convex.dev/database/schemas)
