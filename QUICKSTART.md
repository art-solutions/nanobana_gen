# Quick Start Guide - Convex Frontend Connection

## Setup (5 minutes)

### Step 1: Create Environment File

Copy the example and update it:

```bash
cp .env.example .env
```

Your `.env` should contain:
```env
VITE_CONVEX_URL=https://brilliant-mink-133.convex.cloud
VITE_CONVEX_SITE_URL=https://brilliant-mink-133.convex.site
```

### Step 2: Install Dependencies (if not already done)

```bash
npm install
```

### Step 3: Start Convex Dev Server

In one terminal:
```bash
npx convex dev
```

Keep this running - it watches for changes and syncs functions.

### Step 4: Start React Dev Server

In another terminal:
```bash
npm run dev
```

### Step 5: Open Browser

Navigate to: http://localhost:5173

## Verify It's Working

### 1. Check Job History Tab

Click the "Job History" tab. You should see:
- "Live updates" indicator (green text)
- Empty state: "Jobs will appear here when you process images via the API"

### 2. Test Real-Time Updates

**Option A: Using HTTP API**

In a new terminal or Postman:
```bash
curl -X POST https://brilliant-mink-133.convex.site/api/process/single \
  -H "Content-Type: application/json" \
  -d '{
    "sourceUrl": "https://example.com/test.jpg",
    "config": {
      "targetCountry": "Japan",
      "additionalContext": "Test",
      "removeBranding": false,
      "addBrandingColors": false,
      "brandingColor": "#3B82F6",
      "addOwnLogo": false,
      "filenameFindPattern": "^.*-([^-.]+)\\..*$",
      "filenameReplacePattern": "test_$1.png"
    }
  }'
```

Watch the Job History tab - the new job should appear automatically!

**Option B: Using Convex Dashboard**

1. Go to: https://dashboard.convex.dev/d/brilliant-mink-133
2. Click "Functions"
3. Find `jobs:create` (internal function)
4. Click "Run" and enter test data
5. Watch it appear in your app!

### 3. Test Filtering

In the Job History tab:
- Use the status dropdown to filter
- Data updates immediately
- No page refresh needed

## Common Issues

### "VITE_CONVEX_URL not set" Warning

**Fix:** Create `.env` file with the correct URL (see Step 1)

### Components Show Loading Forever

**Check:**
1. Is `npx convex dev` running?
2. Is the `.env` file in the root directory?
3. Browser console for errors

### No Jobs Appear

**This is normal** if you haven't processed any images yet. Jobs are created by:
- Using the HTTP API (`POST /api/process/single`)
- Using the frontend upload feature (if implemented)
- Running test data in Convex Dashboard

## Next Steps

### Option 1: Test with Example Component

Add to your App.tsx:
```tsx
import { JobHistoryExample } from './components/ConvexExamples';

// Add to your JSX
<JobHistoryExample />
```

### Option 2: Replace Setup Manager

Replace the localStorage-based setup manager with the new PresetManager:

```tsx
import { PresetManager } from './components/PresetManager';

// Replace existing setup manager section with:
<PresetManager
  currentConfig={config}
  onLoadPreset={(loadedConfig) => setConfig(loadedConfig)}
/>
```

### Option 3: Add Dashboard Widget

Create a stats widget:
```tsx
import { DashboardSummaryExample } from './components/ConvexExamples';

<DashboardSummaryExample />
```

## Testing Real-Time Updates

### Open Two Browser Windows

1. Open app in Window 1
2. Open app in Window 2
3. In Window 1, create a job via API
4. Watch it appear in Window 2 automatically
5. Filter in Window 2
6. Watch Window 1 update

This demonstrates the real-time sync capability!

## Architecture Overview

```
Your Browser
    ↓
React App (useQuery hooks)
    ↓
WebSocket Connection
    ↓
Convex Cloud (brilliant-mink-133.convex.cloud)
    ↓
Database (jobs, presets tables)
```

Changes in the database automatically flow to all connected clients in real-time.

## Files You Need to Know

### Main Implementation
- `components/JobHistoryList.tsx` - Job history with real-time updates
- `components/PresetManager.tsx` - Preset CRUD operations
- `convex/publicJobs.ts` - Public query functions for jobs
- `convex/publicPresets.ts` - Public query/mutation functions for presets

### Documentation
- `CONVEX_SETUP.md` - Comprehensive setup guide
- `IMPLEMENTATION_SUMMARY.md` - What was implemented
- `components/ConvexExamples.tsx` - 10 usage examples

### Configuration
- `.env` - Environment variables (create this)
- `.env.example` - Template with your deployment URLs

## Key Concepts

### Queries (Read Data)

```tsx
const jobs = useQuery(api.publicJobs.listJobs, { limit: 10 });
// Auto-updates when data changes
```

### Mutations (Write Data)

```tsx
const createPreset = useMutation(api.publicPresets.createPreset);
await createPreset({ name: "Test", config: {...} });
// Triggers re-render of components using queries
```

### Loading States

```tsx
const data = useQuery(api.publicJobs.listJobs);

if (data === undefined) {
  return <div>Loading...</div>;
}

// data is available
```

## Performance Tips

1. **Use indexes** - Queries on status, batchId, createdAt are fast
2. **Limit results** - Don't fetch all jobs at once
3. **Pagination** - Use offset/limit for large datasets
4. **Skip queries** - Use conditional queries when possible

## Support

If you run into issues:

1. Check browser console for errors
2. Check `npx convex dev` terminal for backend errors
3. Review `CONVEX_SETUP.md` troubleshooting section
4. Check Convex Dashboard logs

## Success Criteria

You'll know it's working when:
- ✅ Job History tab loads without errors
- ✅ Shows "Live updates" indicator
- ✅ Creating a job via API makes it appear automatically
- ✅ Filtering works without page refresh
- ✅ Opening in two tabs shows same data

## Ready to Go!

Your app now has:
- Real-time database connection
- Live job status updates
- Preset management
- Type-safe queries and mutations
- Comprehensive documentation

Start by navigating to the Job History tab and exploring the real-time updates!
