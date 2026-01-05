# Convex Frontend Integration - Quick Start

## 5-Minute Setup

### 1. Start the Backend
```bash
npm run convex:dev
```

Leave this terminal running. You should see:
```
✓ Convex deployed and serving at https://resilient-loris-278.convex.cloud
```

### 2. Start the Frontend
In a **new terminal**:
```bash
npm run dev
```

Open `http://localhost:5173`

### 3. Test the Connection

**Test Presets:**
1. Click "Save Current" in Preset Manager
2. Enter name: "Test Preset"
3. Click "Save"
4. You should see success message
5. Click "Load Saved" - your preset should appear

**Test Job History:**
1. Click "Job History" tab
2. You should see the job list (may be empty)
3. Notice "Live updates" indicator

**Done!** 🎉 Your app is connected to Convex.

---

## What Changed?

### Old Setup (localStorage)
```
Browser Storage ━━> Your Computer Only
```

### New Setup (Convex)
```
                  ┌─────────────┐
All Browsers ━━━━▶│   Convex    │◀━━━━ API Clients
All Devices  ━━━━▶│  Database   │◀━━━━ Other Users
                  └─────────────┘
     Real-time sync, always up-to-date
```

---

## How to Use in Components

### Read Data (useQuery)
```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MyComponent() {
  const presets = useQuery(api.publicPresets.listPresets);

  if (presets === undefined) return <div>Loading...</div>;

  return (
    <ul>
      {presets.map(p => <li key={p._id}>{p.name}</li>)}
    </ul>
  );
}
```

### Write Data (useMutation)
```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function MyComponent() {
  const createPreset = useMutation(api.publicPresets.createPreset);

  const handleCreate = async () => {
    await createPreset({
      name: "Japan Style",
      config: { targetCountry: "Japan", ... }
    });
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

---

## Common Tasks

### Create a Preset
```typescript
const createPreset = useMutation(api.publicPresets.createPreset);

await createPreset({
  name: "My Preset",
  config: {
    targetCountry: "Japan",
    additionalContext: "Urban, modern",
    removeBranding: false,
    addBrandingColors: true,
    brandingColor: "#3B82F6",
    addOwnLogo: false,
    filenameFindPattern: "^.*-([^-.]+)\\..*$",
    filenameReplacePattern: "output_$1.png"
  }
});
```

### Load a Preset
```typescript
const preset = useQuery(api.publicPresets.getPreset, {
  name: "My Preset"
});

if (preset) {
  // Use preset.targetCountry, preset.brandingColor, etc.
}
```

### List Jobs
```typescript
const jobsData = useQuery(api.publicJobs.listJobs, {
  limit: 20,
  status: "completed"  // or "pending", "processing", "failed"
});

// jobsData.jobs => array of job objects
// jobsData.total => total count
```

---

## Real-Time Updates

Convex uses **WebSockets** for instant updates:

```typescript
// This query automatically updates when data changes
const jobs = useQuery(api.publicJobs.listJobs, {});

// No need to poll or refresh!
// When a new job is created, jobs array updates automatically
```

**Example:**
1. Open app in 2 browser tabs
2. Create a preset in tab 1
3. **Instantly appears** in tab 2
4. Delete it in tab 2
5. **Instantly disappears** in tab 1

---

## File Structure

```
src/
├── index.tsx                          # App entry (wrapped with ConvexProvider)
├── App.tsx                            # Main app (uses PresetManager)
└── components/
    ├── ConvexClientProvider.tsx       # Convex setup
    ├── PresetManager.tsx              # Cloud preset management
    ├── JobHistoryList.tsx             # Real-time job tracking
    └── ConvexExamples.tsx             # 10+ usage examples

convex/
├── schema.ts                          # Database schema
├── publicJobs.ts                      # Job queries
└── publicPresets.ts                   # Preset queries & mutations
```

---

## Available Functions

### Presets
| Function | Type | Description |
|----------|------|-------------|
| `listPresets` | Query | Get all presets (summary) |
| `getPreset` | Query | Get full preset by name |
| `createPreset` | Mutation | Create new preset |
| `updatePreset` | Mutation | Update existing preset |
| `deletePreset` | Mutation | Delete preset |

### Jobs
| Function | Type | Description |
|----------|------|-------------|
| `listJobs` | Query | List jobs (filter, paginate) |
| `getJob` | Query | Get single job by ID |
| `getJobsByBatch` | Query | Get all jobs in batch |
| `getBatchSummary` | Query | Batch statistics |
| `getRecentJobsSummary` | Query | Dashboard stats |

---

## Troubleshooting

### "VITE_CONVEX_URL not set"
1. Check `.env.local` exists
2. Verify it contains: `VITE_CONVEX_URL=https://resilient-loris-278.convex.cloud`
3. Restart dev server

### Queries return `undefined`
- Check Convex backend is running (`npm run convex:dev`)
- Check browser console for errors

### Real-time updates not working
- Refresh the page
- Check Network tab for WebSocket connection
- Verify Convex backend is running

### TypeScript errors
```bash
npm run build
```
If build succeeds, TypeScript is happy.

---

## Environment Variables

### .env.local
```bash
# Convex deployment URL (REQUIRED)
VITE_CONVEX_URL=https://resilient-loris-278.convex.cloud

# Convex deployment name (for CLI)
CONVEX_DEPLOYMENT=dev:resilient-loris-278
```

**Note**: `VITE_` prefix is required for Vite to expose it to the frontend.

---

## Development Workflow

### Daily Development
```bash
# Terminal 1: Convex backend
npm run convex:dev

# Terminal 2: Frontend
npm run dev
```

### Making Schema Changes
1. Edit `convex/schema.ts`
2. Convex auto-reloads and migrates data
3. Types in `_generated/` update automatically

### Adding New Queries
1. Create function in `convex/publicX.ts`
2. Export it
3. Use in frontend: `useQuery(api.publicX.myNewQuery)`

### Adding New Mutations
1. Create function in `convex/publicX.ts`
2. Export it
3. Use in frontend: `useMutation(api.publicX.myNewMutation)`

---

## Examples

See `components/ConvexExamples.tsx` for 10 complete examples:
1. ✅ Display job history
2. ✅ Filter jobs by status
3. ✅ Get single job details
4. ✅ Batch summary dashboard
5. ✅ Preset CRUD operations
6. ✅ Load and apply presets
7. ✅ Dashboard stats widget
8. ✅ Pagination
9. ✅ Error handling
10. ✅ Conditional queries (skip pattern)

---

## Next Steps

1. **Test the integration**: Follow `TESTING_CHECKLIST.md`
2. **Read full guide**: See `CONVEX_FRONTEND_INTEGRATION.md`
3. **Explore examples**: Check `components/ConvexExamples.tsx`
4. **Deploy**: When ready, run `npm run convex:deploy`

---

## Support

- **Convex Docs**: https://docs.convex.dev/quickstart/react
- **TypeScript Guide**: https://docs.convex.dev/typescript
- **Deployment**: https://docs.convex.dev/production/hosting

**Status**: ✅ Ready to use
**Deployment**: https://resilient-loris-278.convex.cloud
