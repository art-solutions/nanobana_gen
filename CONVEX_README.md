# Convex Database Integration

## Overview

This application uses **Convex** as its backend database and real-time sync engine. All job processing data and configuration presets are stored in Convex and sync across all connected clients in real-time.

## What is Convex?

Convex is a backend-as-a-service platform that provides:
- **Real-time database** - Changes sync instantly to all clients
- **Type-safe queries** - Full TypeScript support
- **Serverless functions** - Run backend logic without managing servers
- **Built-in auth** - User authentication (not yet implemented)
- **File storage** - Store generated images

## Deployment Information

- **Deployment URL:** https://brilliant-mink-133.convex.cloud
- **Dashboard:** https://dashboard.convex.dev/d/brilliant-mink-133
- **HTTP API Base:** https://brilliant-mink-133.convex.site

## Documentation

Start here based on your goal:

### I want to run the app locally
→ See `QUICKSTART.md`

### I want to understand the architecture
→ See `CONVEX_SETUP.md`

### I want to see code examples
→ See `components/ConvexExamples.tsx`

### I want to know what changed
→ See `IMPLEMENTATION_SUMMARY.md`

## Quick Setup

1. Copy `.env.example` to `.env`
2. Run `npx convex dev` in one terminal
3. Run `npm run dev` in another terminal
4. Open http://localhost:5173

## Database Tables

### Jobs Table
Tracks image processing jobs with real-time status updates.

```typescript
{
  _id: Id<"jobs">,
  status: "pending" | "processing" | "completed" | "failed",
  sourceUrl: string,
  config: {...},
  generatedUrl?: string,
  totalTokens?: number,
  createdAt: number,
  completedAt?: number
}
```

**Indexes:**
- `by_status` - Filter by job status
- `by_batchId` - Group jobs by batch
- `by_createdAt` - Sort by creation time

### Presets Table
Stores reusable configuration presets.

```typescript
{
  _id: Id<"presets">,
  name: string,
  targetCountry: string,
  config: {...},
  createdAt: number,
  updatedAt: number
}
```

**Indexes:**
- `by_name` - Unique preset lookup

## API Access Methods

### Method 1: React Hooks (Recommended for Frontend)

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "./convex/_generated/api";

// Query (read)
const jobs = useQuery(api.publicJobs.listJobs, { limit: 10 });

// Mutation (write)
const createPreset = useMutation(api.publicPresets.createPreset);
await createPreset({ name: "Test", config: {...} });
```

**Benefits:**
- Real-time updates
- Type-safe
- Auto-loading states
- No manual polling

### Method 2: HTTP API (For External Services)

```bash
# List jobs
GET https://brilliant-mink-133.convex.site/api/jobs

# Create preset
POST https://brilliant-mink-133.convex.site/api/presets
Content-Type: application/json
{
  "name": "My Preset",
  "config": {...}
}

# Process image
POST https://brilliant-mink-133.convex.site/api/process/single
```

**Benefits:**
- Works from any language/platform
- RESTful interface
- Compatible with existing tools

## Key Features

### Real-Time Job Status Updates

Open the Job History tab to see jobs update automatically as they process. No manual refresh needed!

### Preset Management

Save your configuration presets to the cloud and access them from any device:

```typescript
// Save current config
const createPreset = useMutation(api.publicPresets.createPreset);
await createPreset({ name: "Japan Urban", config: currentConfig });

// Load preset on another device
const presets = useQuery(api.publicPresets.listPresets);
const preset = useQuery(api.publicPresets.getPreset, { name: "Japan Urban" });
```

### Batch Processing Tracking

Track all jobs in a batch with summary statistics:

```typescript
const summary = useQuery(api.publicJobs.getBatchSummary, {
  batchId: "batch-123"
});

// Returns: { total, completed, failed, pending, processing, totalTokens }
```

## Components

### JobHistoryList
Real-time job history with filtering and pagination.

```tsx
import { JobHistoryList } from './components/JobHistoryList';

<JobHistoryList />
```

### PresetManager
Cloud-based preset management (replacement for localStorage).

```tsx
import { PresetManager } from './components/PresetManager';

<PresetManager
  currentConfig={config}
  onLoadPreset={(config) => setConfig(config)}
/>
```

## Environment Variables

Required in `.env`:

```env
# For React hooks (useQuery/useMutation)
VITE_CONVEX_URL=https://brilliant-mink-133.convex.cloud

# For HTTP API endpoints (optional)
VITE_CONVEX_SITE_URL=https://brilliant-mink-133.convex.site
```

Required in Convex Dashboard (Settings → Environment Variables):

```env
GEMINI_API_KEY=your-google-ai-api-key
```

## Development Workflow

### 1. Start Convex Dev Server

```bash
npx convex dev
```

This watches for changes to Convex functions and syncs them to the cloud.

### 2. Start React Dev Server

```bash
npm run dev
```

### 3. Make Changes

Edit Convex functions in `convex/` directory. They'll automatically deploy.

### 4. Test in Browser

Open http://localhost:5173 and check the Job History tab.

## Production Deployment

### Deploy Convex Functions

```bash
npx convex deploy
```

### Deploy Frontend

Set environment variables in your hosting platform:
- `VITE_CONVEX_URL` → Production Convex URL
- `VITE_CONVEX_SITE_URL` → Production site URL

Then deploy normally:
```bash
npm run build
```

## Monitoring

### Convex Dashboard

https://dashboard.convex.dev/d/brilliant-mink-133

**Features:**
- View all database tables
- See function logs
- Monitor performance
- Test functions
- Manage environment variables

### Function Logs

All `console.log()` statements in Convex functions appear in the dashboard under "Logs".

## Testing

### Test Queries in Dashboard

1. Go to Convex Dashboard
2. Click "Functions"
3. Select a function (e.g., `publicJobs:listJobs`)
4. Enter arguments
5. Click "Run"

### Test Real-Time Updates

1. Open app in two browser tabs
2. Create a job via API or dashboard
3. Watch it appear in both tabs instantly

## Troubleshooting

### Components Show "Loading..." Forever

**Check:**
- Is `npx convex dev` running?
- Is `.env` configured correctly?
- Are there errors in browser console?

### Changes Don't Sync

**Check:**
- Is ConvexProvider wrapping your app?
- Is the function exported as `query` or `mutation` (not `internalQuery`)?
- Is the function path correct? (`api.publicJobs.listJobs`)

### HTTP API Returns Errors

**Check:**
- Is the endpoint URL correct?
- Is the request body valid JSON?
- Are all required fields provided?

See `CONVEX_SETUP.md` for detailed troubleshooting.

## Migration from HTTP-Only

If you have existing components using HTTP fetch:

**Before:**
```typescript
const [jobs, setJobs] = useState([]);
useEffect(() => {
  fetch(`${apiUrl}/api/jobs`)
    .then(res => res.json())
    .then(data => setJobs(data.jobs));
}, []);
```

**After:**
```typescript
const jobsData = useQuery(api.publicJobs.listJobs);
const jobs = jobsData?.jobs ?? [];
```

## Security Notes

### Public Functions

Functions in `publicJobs.ts` and `publicPresets.ts` can be called by anyone with the deployment URL.

**For production**, add authentication:
```typescript
export const listJobs = query({
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Rest of function...
  }
});
```

### Internal Functions

Functions in `jobs.ts` and `presets.ts` are marked `internal` and can only be called from:
- HTTP actions
- Other Convex functions
- Scheduled functions

They cannot be called directly from the frontend.

## Best Practices

1. **Use indexes** - Query by indexed fields (status, batchId, createdAt)
2. **Limit results** - Don't fetch all data at once
3. **Handle errors** - Wrap mutations in try/catch
4. **Type everything** - Use generated types from `_generated/`
5. **Test in dashboard** - Verify queries before using in components

## Learn More

- [Convex Docs](https://docs.convex.dev)
- [React Integration](https://docs.convex.dev/client/react)
- [Schema Design](https://docs.convex.dev/database/schemas)
- [Best Practices](https://docs.convex.dev/production/best-practices)

## Support

For questions about this integration:
1. Check documentation files in this repo
2. Review code examples in `components/ConvexExamples.tsx`
3. Test queries in Convex Dashboard
4. Check dashboard logs for errors

For Convex-specific questions:
- [Convex Discord](https://discord.gg/convex)
- [Convex Docs](https://docs.convex.dev)
