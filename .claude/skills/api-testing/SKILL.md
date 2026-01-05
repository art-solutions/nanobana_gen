---
name: api-testing
description: API testing patterns including Postman collection generation, test case design, and HTTP endpoint validation. Use when testing APIs, creating test suites, or generating documentation.
---

# API Testing Patterns

## Postman Collection Structure

### Collection Schema v2.1
```json
{
  "info": {
    "name": "Collection Name",
    "description": "Description",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [],
  "item": []
}
```

### Environment Variables
```json
"variable": [
  {
    "key": "baseUrl",
    "value": "https://your-app.convex.site",
    "type": "string"
  },
  {
    "key": "presetName",
    "value": "test-preset",
    "type": "string"
  }
]
```

### Request Item
```json
{
  "name": "Create Resource",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"name\": \"value\"\n}"
    },
    "url": {
      "raw": "{{baseUrl}}/api/resource",
      "host": ["{{baseUrl}}"],
      "path": ["api", "resource"]
    }
  },
  "response": []
}
```

### Folder Organization
```json
{
  "name": "Presets",
  "item": [
    { "name": "Create Preset", ... },
    { "name": "List Presets", ... },
    { "name": "Get Preset", ... },
    { "name": "Update Preset", ... },
    { "name": "Delete Preset", ... }
  ]
}
```

## Test Scripts

### Status Code Validation
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Status code is 2xx", function () {
    pm.response.to.be.success;
});
```

### Response Structure
```javascript
pm.test("Response has success field", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("success", true);
});

pm.test("Response has data array", function () {
    const json = pm.response.json();
    pm.expect(json.data).to.be.an("array");
});
```

### Save Variables
```javascript
pm.test("Save ID for later tests", function () {
    const json = pm.response.json();
    pm.environment.set("resourceId", json.data.id);
});
```

### Response Time
```javascript
pm.test("Response time < 5s", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});
```

### JSON Schema Validation
```javascript
const schema = {
    type: "object",
    properties: {
        success: { type: "boolean" },
        data: { type: "object" }
    },
    required: ["success"]
};

pm.test("Schema is valid", function () {
    pm.response.to.have.jsonSchema(schema);
});
```

## Test Case Categories

### 1. Happy Path
- Valid inputs
- Expected outputs
- Correct status codes

### 2. Validation Errors
- Missing required fields
- Invalid field types
- Out of range values

### 3. Not Found
- Non-existent resources
- Invalid IDs

### 4. Edge Cases
- Empty strings
- Empty arrays
- Maximum length inputs
- Unicode characters

## HTTP Methods & Status Codes

### Standard Responses
| Method | Success | Not Found | Validation Error |
|--------|---------|-----------|------------------|
| GET | 200 | 404 | 400 |
| POST | 201 | - | 400 |
| PUT | 200 | 404 | 400 |
| DELETE | 200/204 | 404 | 400 |

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      { "field": "name", "message": "Required" }
    ]
  }
}
```

## cURL Templates

### GET Request
```bash
curl -X GET "{{baseUrl}}/api/resource" \
  -H "Content-Type: application/json"
```

### POST Request
```bash
curl -X POST "{{baseUrl}}/api/resource" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": "value2"
  }'
```

### PUT Request
```bash
curl -X PUT "{{baseUrl}}/api/resource/{{id}}" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "updated"
  }'
```

### DELETE Request
```bash
curl -X DELETE "{{baseUrl}}/api/resource/{{id}}"
```

### With Query Parameters
```bash
curl -X GET "{{baseUrl}}/api/resources?limit=10&status=completed"
```

## Test Report Template

```markdown
## API Test Results

### Summary
| Metric | Value |
|--------|-------|
| Total Tests | X |
| Passed | Y |
| Failed | Z |
| Duration | N ms |

### Results by Endpoint

#### POST /api/resource
| Test Case | Status | Time |
|-----------|--------|------|
| Happy path | ✅ | 150ms |
| Missing field | ✅ | 80ms |
| Invalid type | ✅ | 75ms |

#### GET /api/resources
| Test Case | Status | Time |
|-----------|--------|------|
| List all | ✅ | 200ms |
| With filter | ✅ | 180ms |
| Empty result | ✅ | 90ms |

### Failed Tests
None

### Notes
- All endpoints respond within acceptable time
- Error messages are descriptive
```

## Pre-request Scripts

### Generate Timestamp
```javascript
pm.variables.set("timestamp", Date.now());
```

### Generate UUID
```javascript
pm.variables.set("uuid", pm.variables.replaceIn("{{$guid}}"));
```

### Dynamic Data
```javascript
pm.variables.set("randomName", "test_" + Math.random().toString(36).substr(2, 9));
```

## Collection Runner

### Run Order
1. Setup (create test data)
2. Main tests
3. Cleanup (delete test data)

### Data Files
```json
[
  { "name": "Test 1", "value": "A" },
  { "name": "Test 2", "value": "B" }
]
```

## Best Practices

1. **Use Variables** - Never hardcode URLs or IDs
2. **Test Both Success and Failure** - Cover error cases
3. **Validate Response Structure** - Not just status codes
4. **Chain Requests** - Use saved variables
5. **Document Expected Behavior** - In test descriptions
6. **Keep Tests Independent** - Each can run standalone
7. **Clean Up Test Data** - Don't pollute database
