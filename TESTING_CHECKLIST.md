# Convex Integration Testing Checklist

## Pre-Testing Setup

- [ ] Convex backend is running (`npm run convex:dev`)
- [ ] Frontend is running (`npm run dev`)
- [ ] `.env.local` has `VITE_CONVEX_URL=https://resilient-loris-278.convex.cloud`
- [ ] Browser console has no errors

## 1. ConvexClientProvider Tests

### Test: Proper Initialization
- [ ] App loads without errors
- [ ] No "VITE_CONVEX_URL not set" error message
- [ ] WebSocket connection established (check Network tab)

### Test: Error Handling
- [ ] Temporarily remove `VITE_CONVEX_URL` from `.env.local`
- [ ] Restart dev server
- [ ] Verify red error message appears
- [ ] Restore `.env.local` and restart

## 2. PresetManager Component Tests

### Test: List Presets
- [ ] Open app
- [ ] Click "Load Saved" in Preset Manager
- [ ] Verify preset list appears (may be empty initially)
- [ ] Check for loading spinner while fetching

### Test: Create Preset
- [ ] Configure settings (change country, context, etc.)
- [ ] Click "Save Current"
- [ ] Enter preset name: "Test Japan Style"
- [ ] Click "Save"
- [ ] Verify success alert
- [ ] Click "Load Saved"
- [ ] Verify preset appears in list

### Test: Load Preset
- [ ] Create a preset with specific settings (e.g., Brazil, red branding)
- [ ] Change settings to something else
- [ ] Click "Load Saved"
- [ ] Click the preset name
- [ ] Verify settings are restored to preset values
- [ ] Verify load menu closes automatically

### Test: Delete Preset
- [ ] Click "Load Saved"
- [ ] Hover over a preset
- [ ] Click the "Delete" button that appears
- [ ] Confirm deletion in browser prompt
- [ ] Verify preset disappears from list

### Test: Real-Time Sync
- [ ] Open app in two browser tabs
- [ ] In tab 1: Create a new preset
- [ ] In tab 2: Verify preset appears without refresh
- [ ] In tab 2: Delete the preset
- [ ] In tab 1: Verify preset disappears without refresh

### Test: Validation
- [ ] Click "Save Current"
- [ ] Leave name empty, click "Save"
- [ ] Verify error message
- [ ] Create a preset "Test1"
- [ ] Try to create another preset named "Test1"
- [ ] Verify duplicate name error

## 3. JobHistoryList Component Tests

### Test: Initial Load
- [ ] Click "Job History" tab
- [ ] Verify component loads
- [ ] If no jobs: See "No jobs found" message
- [ ] If has jobs: See job list table

### Test: Job Display
- [ ] Verify columns: Status, Source, Preset, Tokens, Created, Actions
- [ ] Check status badges have correct colors:
  - Completed: Green
  - Failed: Red
  - Processing: Orange
  - Pending: Gray

### Test: Status Filter
- [ ] Use status dropdown to filter by "Completed"
- [ ] Verify only completed jobs show
- [ ] Change to "Failed"
- [ ] Verify filter updates
- [ ] Set to "All Status"
- [ ] Verify all jobs show

### Test: Pagination
- [ ] If total jobs > 10:
  - [ ] Verify "Next" button is enabled
  - [ ] Click "Next"
  - [ ] Verify page number increments
  - [ ] Verify different jobs appear
  - [ ] Click "Previous"
  - [ ] Verify page number decrements
  - [ ] On page 1, "Previous" is disabled
  - [ ] On last page, "Next" is disabled

### Test: Job Details Modal
- [ ] Click "Details" on any job
- [ ] Verify modal opens
- [ ] Verify displays:
  - [ ] Status badge
  - [ ] Job ID
  - [ ] Batch ID (if present)
  - [ ] Source URL (clickable)
  - [ ] Preset name
  - [ ] Output filename
  - [ ] Token usage
  - [ ] Created and completed timestamps
  - [ ] Error message (if failed)
  - [ ] Generated image (if completed)
- [ ] Click X to close modal
- [ ] Verify modal closes

### Test: Real-Time Job Updates
- [ ] Use HTTP API to create a test job (see API docs)
- [ ] Verify new job appears in list without refresh
- [ ] Verify job status updates automatically
- [ ] Verify "Live updates" badge shows

## 4. Integration with Main App

### Test: Tab Switching
- [ ] Click "Gallery View" tab
- [ ] Verify gallery view shows
- [ ] Click "API Integration" tab
- [ ] Verify API docs show
- [ ] Click "Job History" tab
- [ ] Verify job history shows
- [ ] All tabs work without errors

### Test: Preset Loading into Config
- [ ] Create preset with specific values:
  - Country: France
  - Context: "Sunset lighting"
  - Branding: Red (#FF0000)
  - Remove branding: Checked
- [ ] Change all settings to different values
- [ ] Load the preset
- [ ] Verify all config fields match preset:
  - [ ] Country dropdown = France
  - [ ] Context textarea = "Sunset lighting"
  - [ ] Branding color = #FF0000
  - [ ] Remove branding = Checked

### Test: No Breaking Changes
- [ ] Upload images to gallery
- [ ] Verify upload still works
- [ ] Process images
- [ ] Verify processing still works
- [ ] Download results
- [ ] Verify download still works

## 5. Error Handling Tests

### Test: Network Disconnection
- [ ] Open DevTools Network tab
- [ ] Go offline (throttle to "Offline")
- [ ] Try to load presets
- [ ] Verify graceful error handling
- [ ] Go back online
- [ ] Verify auto-reconnection

### Test: Invalid Data
- [ ] Open browser console
- [ ] Call mutation with invalid data
- [ ] Verify error is caught and displayed

### Test: Database Empty
- [ ] Delete all presets
- [ ] Click "Load Saved"
- [ ] Verify "No saved presets yet" message
- [ ] Verify no errors in console

## 6. Performance Tests

### Test: Initial Load Time
- [ ] Clear cache
- [ ] Reload page
- [ ] Verify loads in < 3 seconds
- [ ] Check for unnecessary re-renders in React DevTools

### Test: Real-Time Performance
- [ ] Open 3 browser tabs
- [ ] Create/delete presets in one tab
- [ ] Verify updates propagate to other tabs quickly (< 1 second)

### Test: Large Dataset
- [ ] Create 20+ presets
- [ ] Verify list scrolling is smooth
- [ ] Verify filtering is responsive
- [ ] Verify no performance degradation

## 7. Cross-Browser Tests

- [ ] Test in Chrome/Edge
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Verify all features work in each browser

## 8. Build Tests

### Test: Production Build
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] Warning about chunk size is expected (ignore)

### Test: Preview Build
```bash
npm run preview
```
- [ ] Preview server starts
- [ ] App loads correctly
- [ ] Convex connection works in build
- [ ] All features work as in dev

## Issue Tracking

### Found Issues
| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Example: Slow load | Low | Fixed | Optimized query |

### Expected Behavior Confirmed
- ✅ Real-time updates working
- ✅ Presets sync across tabs
- ✅ Job history shows live data
- ✅ Error handling works
- ✅ TypeScript types correct

## Sign-Off

- [ ] All critical tests passed
- [ ] No console errors
- [ ] Real-time features working
- [ ] Ready for deployment

**Tested By**: _________________
**Date**: _________________
**Convex URL**: https://resilient-loris-278.convex.cloud
**Frontend Version**: _________________

## Notes

Use this space for additional observations:

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete
