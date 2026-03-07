# QR Scan Flow Test Guide

## Test Scenario 1: Scan QR Code Generated from QR Management

### QR Payload (JSON):
```json
{
  "serialId": "PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001",
  "productId": "PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "manufacturerId": "MFG-12345",
  "signature": "abc123def456...",
  "productName": "Organic Cotton T-Shirt",
  "category": "Apparel",
  "carbonFootprint": 2.5,
  "materialSummary": "95% Organic Cotton, 5% Elastane",
  "ecoScore": "A+"
}
```

### Expected Flow:
1. ✅ Camera scans QR code
2. ✅ `extractSerialId()` parses JSON
3. ✅ Extracts: `"PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001"`
4. ✅ Navigates to: `/product/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001`
5. ✅ API calls: `GET /verify/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001`
6. ✅ Product data loads and displays

### Previous Behavior (BROKEN):
- ❌ JSON string didn't match regex `^[A-Z0-9]+-\d+$`
- ❌ Error: "Invalid QR code format"

---

## Test Scenario 2: Manual Entry with UUID-based Serial

### Input:
```
PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001
```

### Expected Flow:
1. ✅ User enters serial in input field
2. ✅ Validates against: `/^[A-Z0-9]+-[A-Z0-9\-]+$/`
3. ✅ Validation passes
4. ✅ Navigates to: `/product/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001`
5. ✅ API calls: `GET /verify/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001`
6. ✅ Product data loads and displays

### Previous Behavior (BROKEN):
- ❌ Regex `^[A-Z0-9]+-\d+$` rejected UUID format
- ❌ Error: "Not in proper format"

---

## Test Scenario 3: Manual Entry with Simple Serial

### Input:
```
PROD001-0001
```

### Expected Flow:
1. ✅ User enters serial in input field
2. ✅ Validates against: `/^[A-Z0-9]+-[A-Z0-9\-]+$/`
3. ✅ Validation passes
4. ✅ Navigates to: `/product/PROD001-0001`
5. ✅ API calls: `GET /verify/PROD001-0001`
6. ✅ Product data loads and displays

---

## Test Scenario 4: Scan QR with URL Format

### QR Payload (Plain Text):
```
https://example.com/product/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001
```

### Expected Flow:
1. ✅ Camera scans QR code
2. ✅ `extractSerialId()` tries JSON parse (fails)
3. ✅ Matches URL regex: `/\/product\/([A-Z0-9\-]+)/`
4. ✅ Extracts: `"PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001"`
5. ✅ Navigates to: `/product/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001`
6. ✅ Product data loads and displays

---

## Test Scenario 5: Invalid Serial Format

### Input:
```
INVALID_FORMAT
```

### Expected Flow:
1. ✅ User enters invalid serial
2. ✅ Validates against: `/^[A-Z0-9]+-[A-Z0-9\-]+$/`
3. ✅ Validation fails (no dash)
4. ✅ Error: "Invalid serial number format. Expected format: PROD-xxx-0001 or PROD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-0001"

---

## Test Scenario 6: Non-existent Serial

### Input:
```
PROD-nonexistent-0001
```

### Expected Flow:
1. ✅ User enters valid format serial
2. ✅ Validation passes
3. ✅ Navigates to: `/product/PROD-nonexistent-0001`
4. ✅ API calls: `GET /verify/PROD-nonexistent-0001`
5. ✅ Backend returns 404
6. ✅ Error displayed: "Product not found. Please check the serial number and try again."

---

## Backend Verification (No Changes Needed)

The backend already handles all serial formats correctly:

```typescript
// verifySerial.ts
const serialId = event.pathParameters?.serialId;
// No format validation - accepts any string
```

```typescript
// VerificationService.ts
async verifySerial(serialId: string): Promise<VerificationResult> {
  const serial = await this.serialRepository.getSerial(serialId);
  // Looks up by exact serialId - no format restrictions
}
```

---

## Summary of Changes

### ✅ Fixed
1. JSON payload parsing for QR codes
2. UUID-based serial number validation
3. Flexible regex patterns for all serial formats
4. Clear error messages with format examples

### ✅ Maintained
1. Backward compatibility with simple serials (PROD001-0001)
2. URL format support
3. Backend API compatibility
4. Error handling for invalid/non-existent serials

### ✅ Supported Formats
- Simple: `PROD001-0001`
- UUID: `PROD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-0001`
- Mixed: `PROD-ABC123-0001`
- Any: `[A-Z0-9]+-[A-Z0-9\-]+`
