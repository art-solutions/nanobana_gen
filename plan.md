# CultureShift AI - Convex Backend Integration Plan

## 📋 Overview

Transform CultureShift AI from a frontend-only application into a full-stack solution with Convex backend for:
- **Preset Management** - Store and retrieve reusable configuration presets
- **Job Processing** - Track image localization jobs with status
- **File Storage** - Store generated images long-term in Convex storage
- **Public API** - Headless HTTP endpoints for external integrations
- **Job History UI** - Display job list in frontend with status indicators

### Key Decisions
| Aspect | Decision |
|--------|----------|
| Source Files | NOT stored (processed from URLs) |
| Generated Files | Stored in Convex + returned immediately |
| Processing | Synchronous (wait for result) |
| Authentication | Public API (no auth) |
| Frontend | Add job history list (keep existing flow) |
| Rate Limiting | None |
| Batch Output | ZIP file |
| Single Output | Direct image |

---

## 🗄️ Database Schema Design

### Table: `presets`
Stores reusable configuration presets for reproducible outputs.

```typescript
presets: defineTable({
  name: v.string(),                    // Unique preset identifier
  // Cultural Parameters
  targetCountry: v.string(),
  additionalContext: v.string(),
  // Branding Identity
  removeBranding: v.boolean(),
  addBrandingColors: v.boolean(),
  brandingColor: v.string(),           // Hex color code
  addOwnLogo: v.boolean(),
  ownLogoData: v.optional(v.string()), // Base64 logo data
  // Output Logic
  filenameFindPattern: v.string(),     // Regex pattern
  filenameReplacePattern: v.string(),  // Replacement pattern
  // Model Config (Pro features)
  modelVersion: v.optional(v.string()),
  aspectRatio: v.optional(v.string()), // e.g., "1:1", "16:9"
  imageSize: v.optional(v.string()),   // e.g., "1K", "2K", "4K"
  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_name", ["name"])
```

### Table: `jobs`
Tracks processing jobs and their results.

```typescript
jobs: defineTable({
  // Job Identity
  batchId: v.optional(v.string()),     // Groups batch jobs together
  sourceUrl: v.string(),               // Original image URL
  // Configuration (snapshot at job creation)
  presetName: v.optional(v.string()),  // Reference to preset used
  config: v.object({                   // Full config snapshot
    targetCountry: v.string(),
    additionalContext: v.string(),
    removeBranding: v.boolean(),
    addBrandingColors: v.boolean(),
    brandingColor: v.string(),
    addOwnLogo: v.boolean(),
    ownLogoData: v.optional(v.string()),
    filenameFindPattern: v.string(),
    filenameReplacePattern: v.string(),
    modelVersion: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    imageSize: v.optional(v.string()),
  }),
  // Status
  status: v.string(),                  // "pending" | "processing" | "completed" | "failed"
  error: v.optional(v.string()),
  // Results
  generatedFileId: v.optional(v.id("_storage")),
  generatedFileName: v.optional(v.string()),
  generatedUrl: v.optional(v.string()),
  // Token Usage
  promptTokens: v.optional(v.number()),
  candidateTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  // Timestamps
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
}).index("by_batchId", ["batchId"])
  .index("by_status", ["status"])
  .index("by_createdAt", ["createdAt"])
```

---

## 🌐 API Endpoints Design (11 Endpoints)

### Base URL Structure
```
https://<deployment>.convex.site/
```

---

### Processing Endpoints

#### POST `/api/process/single`
Process a single image with a preset name. Returns direct image data.

**Request:**
```json
{
  "url": "https://example.com/image.jpg",
  "presetName": "japan-urban"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "j123abc",
  "generatedUrl": "https://convex.site/storage/...",
  "generatedFileName": "neonLED_mintgreen_1704567890.png",
  "usage": {
    "promptTokens": 1500,
    "candidateTokens": 800,
    "totalTokens": 2300
  }
}
```

---

#### POST `/api/process/single-with-config`
Process a single image with inline configuration (no preset).

**Request:**
```json
{
  "url": "https://example.com/image.jpg",
  "config": {
    "targetCountry": "Brazil",
    "additionalContext": "beach vibes, sunset",
    "removeBranding": true,
    "addBrandingColors": true,
    "brandingColor": "#FF5733",
    "addOwnLogo": false,
    "ownLogoData": null,
    "filenameFindPattern": "^.*-([^-.]+)\\..*$",
    "filenameReplacePattern": "brazil_$1_TIMESTAMP.png"
  }
}
```

---

#### POST `/api/process/batch`
Process multiple images with a preset name. Returns ZIP file with all generated images.

**Request:**
```json
{
  "urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ],
  "presetName": "japan-urban"
}
```

**Response:**
```json
{
  "success": true,
  "batchId": "batch_abc123",
  "zipUrl": "https://convex.site/storage/batch_abc123.zip",
  "results": [
    {
      "jobId": "j1",
      "sourceUrl": "https://example.com/image1.jpg",
      "generatedUrl": "https://convex.site/storage/...",
      "generatedFileName": "neonLED_image1_1704567890.png",
      "status": "completed"
    },
    {
      "jobId": "j2",
      "sourceUrl": "https://example.com/image2.jpg",
      "generatedUrl": "https://convex.site/storage/...",
      "generatedFileName": "neonLED_image2_1704567891.png",
      "status": "completed"
    }
  ],
  "summary": {
    "total": 3,
    "completed": 3,
    "failed": 0,
    "totalTokens": 6900
  }
}
```

---

#### POST `/api/process/batch-with-config`
Process multiple images with inline configuration. Returns ZIP file.

**Request:**
```json
{
  "urls": ["https://...", "https://..."],
  "config": { /* full config object */ }
}
```

---

### Preset Endpoints

#### POST `/api/presets`
Create a new preset.

**Request:**
```json
{
  "name": "japan-urban",
  "targetCountry": "Japan",
  "additionalContext": "Tokyo street style, neon lights",
  "removeBranding": true,
  "addBrandingColors": true,
  "brandingColor": "#E91E63",
  "addOwnLogo": false,
  "ownLogoData": null,
  "filenameFindPattern": "^.*-([^-.]+)\\..*$",
  "filenameReplacePattern": "japan_$1_TIMESTAMP.png"
}
```

**Response:**
```json
{
  "success": true,
  "preset": {
    "name": "japan-urban",
    "createdAt": 1704567890
  }
}
```

---

#### GET `/api/presets`
List all presets.

**Response:**
```json
{
  "presets": [
    { "name": "japan-urban", "targetCountry": "Japan", "createdAt": 1704567890 },
    { "name": "brazil-beach", "targetCountry": "Brazil", "createdAt": 1704567800 }
  ]
}
```

---

#### GET `/api/presets/:name`
Get a specific preset by name.

**Response:**
```json
{
  "preset": {
    "name": "japan-urban",
    "targetCountry": "Japan",
    "additionalContext": "Tokyo street style",
    "removeBranding": true,
    "addBrandingColors": true,
    "brandingColor": "#E91E63",
    "addOwnLogo": false,
    "ownLogoData": null,
    "filenameFindPattern": "^.*-([^-.]+)\\..*$",
    "filenameReplacePattern": "japan_$1_TIMESTAMP.png",
    "createdAt": 1704567890,
    "updatedAt": 1704567890
  }
}
```

---

#### PUT `/api/presets/:name`
Update an existing preset. Allows loading a preset, modifying it, and saving changes.

**Request:**
```json
{
  "targetCountry": "Japan",
  "additionalContext": "Updated: Tokyo cyberpunk style",
  "removeBranding": true,
  "addBrandingColors": true,
  "brandingColor": "#00FF00",
  "addOwnLogo": false,
  "ownLogoData": null,
  "filenameFindPattern": "^.*-([^-.]+)\\..*$",
  "filenameReplacePattern": "japan_cyber_$1_TIMESTAMP.png"
}
```

**Response:**
```json
{
  "success": true,
  "preset": {
    "name": "japan-urban",
    "updatedAt": 1704568000
  }
}
```

---

#### DELETE `/api/presets/:name`
Delete a preset.

**Response:**
```json
{
  "success": true,
  "deleted": "japan-urban"
}
```

---

### Job History Endpoints

#### GET `/api/jobs`
List all jobs with status. Supports pagination and filtering.

**Query Parameters:**
- `limit` (optional): Number of jobs to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status ("pending", "processing", "completed", "failed")
- `batchId` (optional): Filter by batch ID

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "j123",
      "batchId": null,
      "sourceUrl": "https://example.com/image.jpg",
      "presetName": "japan-urban",
      "status": "completed",
      "generatedFileName": "neonLED_image_1704567890.png",
      "generatedUrl": "https://convex.site/storage/...",
      "totalTokens": 2300,
      "createdAt": 1704567890,
      "completedAt": 1704567895
    },
    {
      "jobId": "j124",
      "batchId": "batch_abc",
      "sourceUrl": "https://example.com/image2.jpg",
      "presetName": "brazil-beach",
      "status": "processing",
      "createdAt": 1704567900
    },
    {
      "jobId": "j125",
      "batchId": null,
      "sourceUrl": "https://example.com/image3.jpg",
      "presetName": null,
      "status": "failed",
      "error": "Image URL not accessible",
      "createdAt": 1704567910
    }
  ],
  "total": 125,
  "limit": 50,
  "offset": 0
}
```

---

#### GET `/api/jobs/:jobId`
Get single job details and result.

---

#### GET `/api/jobs/batch/:batchId`
Get all jobs in a batch.

---

## 🎨 Frontend Integration: Job History List

Add a new section to the frontend displaying job history with color-coded status indicators.

### Status Color Scheme
| Status | Color | Indicator |
|--------|-------|-----------|
| `completed` | 🟢 Green | Success |
| `failed` | 🔴 Red | Error |
| `processing` | 🟠 Orange | In Progress |
| `pending` | ⚪ Gray | Queued |

### Component: `JobHistoryList.tsx`
```tsx
// New component to display job history
// - Fetches from GET /api/jobs
// - Real-time updates using Convex subscription
// - Color-coded status badges
// - Click to view job details
// - Filter by status
```

### UI Placement
Add as a new tab alongside existing "Gallery View" and "API Integration" tabs:
- **Gallery View** - Current image processing
- **API Integration** - API documentation
- **Job History** - NEW: List of all API jobs with status

---

## 📁 File Storage Strategy

### Generated Images
1. After Gemini returns base64 image data:
   - Convert to `Blob`
   - Store in Convex file storage via `ctx.storage.store(blob)`
   - Generate filename using `generateOutputFilename()` utility
   - Get public URL via `ctx.storage.getUrl(fileId)`
2. Store reference in `jobs` table:
   - `generatedFileId`: Storage ID
   - `generatedFileName`: Custom filename
   - `generatedUrl`: Public access URL

### Batch ZIP Creation
For batch processing:
1. Process all images and store individually
2. Create ZIP file containing all generated images
3. Store ZIP in Convex storage
4. Return ZIP URL in response

### Filename Generation
Reuse existing logic from `utils/filenameUtils.ts`:
```typescript
generateOutputFilename(originalName, findPattern, replacePattern)
// Input: "product-sunset-mintgreen.jpg"
// Output: "neonLED_mintgreen_1704567890.png"
```

---

## 🧪 Testing Strategy

### Test Images Location
```
images_test/
├── test-image-1.jpg
├── test-image-2.jpg
└── test-image-3.jpg
```

### Test Scenarios
1. **Single Image Processing**
   - Input: Single URL + preset name
   - Output: Direct image URL
   
2. **Single Image with Config**
   - Input: Single URL + inline config
   - Output: Direct image URL

3. **Batch Processing**
   - Input: 3 test image URLs + preset name
   - Output: ZIP file containing all generated images

4. **Batch with Config**
   - Input: 3 test image URLs + inline config
   - Output: ZIP file

5. **Preset CRUD**
   - Create, Read, Update, Delete operations

6. **Job History**
   - List jobs with pagination
   - Filter by status

### Postman Collection
Generate comprehensive Postman collection with:
- All 11 endpoints
- Example requests/responses
- Environment variables for base URL
- Test scripts for validation

---

## 🛠️ Implementation Steps

### Phase 1: Convex Setup
1. Initialize Convex in project (`npx convex dev`)
2. Create schema (`convex/schema.ts`)
3. Configure environment variables for Gemini API

### Phase 2: Core Functions
1. Port `geminiService.ts` logic to Convex action
2. Port `filenameUtils.ts` to Convex
3. Create preset CRUD mutations/queries
4. Create job management mutations/queries

### Phase 3: HTTP Endpoints
1. Create `convex/http.ts` router
2. Implement all 11 endpoints
3. Add error handling and validation
4. Implement ZIP generation for batch

### Phase 4: Frontend Update
1. Create `JobHistoryList.tsx` component
2. Add new tab to App.tsx
3. Integrate Convex client for real-time updates

### Phase 5: Testing
1. Create API tester agent
2. Generate Postman collection
3. Run integration tests with test images
4. Validate ZIP output for batch

---

## 🤖 Agents & Skills to Create

### Agent 1: `convex-schema-designer`
**Purpose**: Design and validate Convex database schemas
**Skills**: 
- Convex schema syntax
- Index optimization
- Type validation patterns

### Agent 2: `convex-api-architect`
**Purpose**: Design HTTP endpoints and function signatures
**Skills**:
- HTTP routing patterns
- Request/response validation
- Error handling conventions

### Agent 3: `convex-queue-manager`
**Purpose**: Manage job processing and status tracking
**Skills**:
- Job state machine design
- Batch processing patterns
- Storage integration
- ZIP file generation

### Agent 4: `api-tester`
**Purpose**: Test API endpoints and generate documentation
**Skills**:
- HTTP request construction
- Postman collection generation
- Test case design
- Image upload testing

---

## 📦 Deliverables

### Convex Files
```
convex/
├── schema.ts           # Database schema
├── http.ts             # HTTP endpoints router
├── presets.ts          # Preset CRUD functions
├── jobs.ts             # Job management functions
├── processing.ts       # Image processing action
└── utils/
    └── filenameUtils.ts # Ported filename logic
```

### Frontend Files
```
components/
└── JobHistoryList.tsx  # NEW: Job history component
```

### Agent Files
```
agents/
├── convex-schema-designer.md
├── convex-api-architect.md
├── convex-queue-manager.md
└── api-tester.md
```

### Skill Files
```
skills/
├── convex-patterns/
│   └── SKILL.md
└── api-testing/
    └── SKILL.md
```

### Test Assets
```
images_test/           # Already exists with 3 test images
postman/
└── CultureShift-API.postman_collection.json
```

---

## ✅ Acceptance Criteria

1. **Presets**: Can create, read, update, delete presets via API
2. **Single Processing**: Can process one image with preset OR inline config
3. **Batch Processing**: Can process multiple images and receive ZIP output
4. **Storage**: Generated images persist in Convex storage with custom filenames
5. **Job History**: API returns job list with status, viewable in frontend
6. **Status Indicators**: Frontend shows green/red/orange status badges
7. **Responses**: All endpoints return consistent JSON structure
8. **Testing**: Postman collection can successfully test all endpoints

---

## 🗓️ Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Schema Design | 1 session | Pending |
| Core Functions | 2 sessions | Pending |
| HTTP Endpoints | 1 session | Pending |
| Frontend Update | 1 session | Pending |
| Testing & Docs | 1 session | Pending |

---

## ✅ PLAN APPROVED

*Plan created: January 2025*
*Status: APPROVED - Ready for implementation*
