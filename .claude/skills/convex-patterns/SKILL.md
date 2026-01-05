---
name: convex-patterns
description: Convex backend development patterns including schema design, functions, HTTP endpoints, and file storage. Use when building Convex applications, designing databases, or implementing serverless functions.
---

# Convex Development Patterns

## Function Syntax

### Always Use New Function Syntax
```typescript
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const myFunction = query({
  args: { id: v.id("tableName") },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, args) => {
    // Function body
    return { name: "result" };
  },
});
```

### Function Types
| Type | Use Case | Database Access | External APIs |
|------|----------|-----------------|---------------|
| `query` | Read data | ✅ Read only | ❌ |
| `mutation` | Write data | ✅ Read/Write | ❌ |
| `action` | External calls | Via runQuery/runMutation | ✅ |

### Internal Functions
```typescript
import { internalQuery, internalMutation, internalAction } from "./_generated/server";

// Private function - not exposed to clients
export const internalFunc = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    return null;
  },
});
```

## Validator Reference

| Type | Validator | Example |
|------|-----------|---------|
| String | `v.string()` | `name: v.string()` |
| Number | `v.number()` | `count: v.number()` |
| Boolean | `v.boolean()` | `active: v.boolean()` |
| ID | `v.id("table")` | `userId: v.id("users")` |
| Optional | `v.optional(v.x())` | `bio: v.optional(v.string())` |
| Array | `v.array(v.x())` | `tags: v.array(v.string())` |
| Object | `v.object({})` | `config: v.object({ key: v.string() })` |
| Union | `v.union(v.x(), v.y())` | Status enums |
| Literal | `v.literal("x")` | `type: v.literal("user")` |
| Null | `v.null()` | Return nothing |
| Record | `v.record(k, v)` | Dynamic keys |

## Schema Design

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  })
  .index("by_email", ["email"])
  .index("by_role", ["role"]),
});
```

### Index Naming Convention
- Single field: `by_fieldName`
- Multiple fields: `by_field1_and_field2`

### System Fields (Auto-added)
- `_id`: Document ID
- `_creationTime`: Creation timestamp

## Query Patterns

### Basic Query
```typescript
export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.union(v.object({ /* fields */ }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
```

### Query with Index
```typescript
export const getUserByEmail = query({
  args: { email: v.string() },
  returns: v.union(v.object({ /* fields */ }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .unique();
  },
});
```

### List with Pagination
```typescript
export const listUsers = query({
  args: { 
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    users: v.array(v.object({ /* fields */ })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("users")
      .order("desc")
      .paginate({ numItems: args.limit ?? 50, cursor: args.cursor ?? null });
    
    return {
      users: results.page,
      nextCursor: results.isDone ? undefined : results.continueCursor,
    };
  },
});
```

## Mutation Patterns

### Insert
```typescript
export const createUser = mutation({
  args: { name: v.string(), email: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: "user",
      createdAt: Date.now(),
    });
  },
});
```

### Update (Patch)
```typescript
export const updateUser = mutation({
  args: { userId: v.id("users"), name: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    
    await ctx.db.patch(args.userId, updates);
    return null;
  },
});
```

### Delete
```typescript
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.userId);
    return null;
  },
});
```

## Action Patterns

### External API Call
```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const callExternalAPI = action({
  args: { prompt: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const response = await fetch("https://api.example.com/...", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: args.prompt }),
    });
    
    const data = await response.json();
    return data.result;
  },
});
```

### Action Calling Mutations
```typescript
export const processAndStore = action({
  args: { input: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Do external work
    const result = await externalAPI(args.input);
    
    // Store result via mutation
    await ctx.runMutation(internal.storage.saveResult, { 
      data: result 
    });
    
    return null;
  },
});
```

## HTTP Endpoints

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/endpoint",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    
    // Validate
    if (!body.field) {
      return new Response(
        JSON.stringify({ error: "field required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Call internal function
    const result = await ctx.runMutation(internal.module.function, body);
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

export default http;
```

## File Storage

### Store File (in Action)
```typescript
const blob = new Blob([data], { type: "image/png" });
const fileId = await ctx.storage.store(blob);
const fileUrl = await ctx.storage.getUrl(fileId);
```

### Get File Metadata
```typescript
const metadata = await ctx.db.system.get(fileId);
// { _id, _creationTime, contentType, sha256, size }
```

## Function References

```typescript
import { api, internal } from "./_generated/api";

// Public function reference
api.module.publicFunction

// Internal function reference
internal.module.internalFunction
```

## Common Patterns

### Status Enum
```typescript
status: v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
)
```

### Timestamps
```typescript
createdAt: v.number(),    // Date.now()
updatedAt: v.number(),
completedAt: v.optional(v.number()),
```

### Config Object
```typescript
config: v.object({
  setting1: v.string(),
  setting2: v.boolean(),
  optional: v.optional(v.string()),
})
```
