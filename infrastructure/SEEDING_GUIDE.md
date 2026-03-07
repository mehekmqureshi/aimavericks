# Test Data Seeding Guide

This guide explains how to use the test data seeding script to populate the Green Passport platform with sample data.

## Overview

The seeding script (`seed-data.ts`) creates:
- **1 manufacturer** record (EcoTextiles Inc.)
- **5 product** records with varied carbon footprints
- **50 QR serial** records (10 per product)

## Product Test Data

| Product ID | Name | Category | Target Carbon | Expected Badge |
|------------|------|----------|---------------|----------------|
| PROD001 | Organic Cotton T-Shirt | Apparel | ~2 kg | Environment Friendly (green) |
| PROD002 | Recycled Polyester Jacket | Apparel | ~5 kg | Moderate Impact (yellow) |
| PROD003 | Wool Sweater | Apparel | ~8 kg | High Impact (red) |
| PROD004 | Bamboo Socks | Accessories | ~3 kg | Environment Friendly (green) |
| PROD005 | Hemp Tote Bag | Accessories | ~6 kg | Moderate Impact (yellow) |

## Prerequisites

1. **DynamoDB tables** must be provisioned:
   - Manufacturers
   - Products
   - ProductSerials

2. **Environment variables** must be set:
   ```bash
   export AWS_REGION=us-east-1
   export MANUFACTURERS_TABLE_NAME=Manufacturers
   export PRODUCTS_TABLE_NAME=Products
   export PRODUCT_SERIALS_TABLE_NAME=ProductSerials
   ```

3. **AWS credentials** must be configured with permissions to:
   - PutItem on all three tables
   - GetItem on all three tables (for verification)

## Running the Script

### Option 1: Using ts-node

```bash
cd infrastructure
npx ts-node seed-data.ts
```

### Option 2: Compile and run

```bash
# Compile TypeScript
npx tsc seed-data.ts

# Run compiled JavaScript
node seed-data.js
```

### Option 3: Using npm script

Add to `package.json`:
```json
{
  "scripts": {
    "seed": "ts-node infrastructure/seed-data.ts"
  }
}
```

Then run:
```bash
npm run seed
```

## Expected Output

```
============================================================
Green Passport Platform - Test Data Seeding
============================================================

Step 1: Creating manufacturer...
✓ Created manufacturer: MFG001

Step 2: Creating 5 products with varied carbon footprints...
✓ Created product: PROD001 (2.00 kg CO2, Environment Friendly)
✓ Created product: PROD002 (5.00 kg CO2, Moderate Impact)
✓ Created product: PROD003 (8.00 kg CO2, High Impact)
✓ Created product: PROD004 (3.00 kg CO2, Environment Friendly)
✓ Created product: PROD005 (6.00 kg CO2, Moderate Impact)

Step 3: Generating 50 QR serials (10 per product)...
✓ Generated 10 serials for product: PROD001
✓ Generated 10 serials for product: PROD002
✓ Generated 10 serials for product: PROD003
✓ Generated 10 serials for product: PROD004
✓ Generated 10 serials for product: PROD005

Step 4: Verifying badge assignments...
✓ Badge correct for PROD001: Environment Friendly (2.00 kg)
✓ Badge correct for PROD002: Moderate Impact (5.00 kg)
✓ Badge correct for PROD003: High Impact (8.00 kg)
✓ Badge correct for PROD004: Environment Friendly (3.00 kg)
✓ Badge correct for PROD005: Moderate Impact (6.00 kg)

Step 5: Verifying QR scanning (sample of 5 serials)...
✓ QR scan verified for serial: PROD001-0001
✓ QR scan verified for serial: PROD002-0001
✓ QR scan verified for serial: PROD003-0006
✓ QR scan verified for serial: PROD004-0001
✓ QR scan verified for serial: PROD005-0010

============================================================
Seeding Summary
============================================================
Manufacturers created: 1
Products created: 5
Serials generated: 50
Badge assignments: ✓ All correct
QR scanning: ✓ All verified

✓ Test data seeding completed successfully!

Product Summary:
  - Organic Cotton T-Shirt: 2.00 kg CO2 (Environment Friendly)
  - Recycled Polyester Jacket: 5.00 kg CO2 (Moderate Impact)
  - Wool Sweater: 8.00 kg CO2 (High Impact)
  - Bamboo Socks: 3.00 kg CO2 (Environment Friendly)
  - Hemp Tote Bag: 6.00 kg CO2 (Moderate Impact)
```

## Verification Steps

The script automatically verifies:

1. **Badge Assignment Correctness**
   - Checks that each product's badge matches the expected badge based on carbon footprint
   - Uses the BadgeEngine thresholds:
     - < 4 kg: Environment Friendly (green)
     - 4-7 kg: Moderate Impact (yellow)
     - > 7 kg: High Impact (red)

2. **QR Scanning Functionality**
   - Tests retrieval of serial records from DynamoDB
   - Tests retrieval of associated product data
   - Verifies digital signature integrity by recomputing and comparing

## Lifecycle Data Structure

Each product includes comprehensive structured lifecycle data:

### Materials Section
- Organic Cotton (95%, 0.15 kg, emission factor 2.1)
- Elastane (5%, 0.008 kg, emission factor 8.5)

### Manufacturing Section
- Factory location: Bangladesh
- Energy consumption: 2.5 kWh per piece
- Energy emission factor: 0.8 kg CO2/kWh
- Dyeing method: Natural Dyes
- Water consumption: 50 litres
- Waste generated: 0.02 kg

### Packaging Section
- Material type: Recycled Cardboard
- Weight: 0.05 kg
- Emission factor: 0.9 kg CO2/kg
- Recyclable: Yes

### Transport Section
- Mode: Ship
- Distance: Varies by product (adjusted to hit target carbon)
- Fuel type: Heavy Fuel Oil
- Emission factor: 0.015 kg CO2/km

### Usage Phase Section
- Average wash cycles: 50
- Wash temperature: 30°C
- Dryer use: No

### End of Life Section
- Recyclable: Yes
- Biodegradable: Yes
- Take-back program: Yes
- Disposal emission: 0.5 kg CO2

## Troubleshooting

### Error: "Table does not exist"
- Ensure DynamoDB tables are provisioned
- Check table names in environment variables
- Verify AWS region is correct

### Error: "Access Denied"
- Check AWS credentials are configured
- Verify IAM permissions include:
  - `dynamodb:PutItem`
  - `dynamodb:GetItem`
  - `dynamodb:Query`

### Error: "Badge mismatch"
- This indicates a bug in the BadgeEngine or CarbonCalculator
- Check the carbon footprint calculation logic
- Verify badge threshold rules

### Error: "Signature mismatch"
- This indicates a bug in the SignatureService
- Check that signature generation is deterministic
- Verify all signature inputs are consistent

## Cleaning Up Test Data

To remove seeded test data, use the AWS CLI or Console:

```bash
# Delete manufacturer
aws dynamodb delete-item \
  --table-name Manufacturers \
  --key '{"manufacturerId": {"S": "MFG001"}}'

# Delete products (repeat for PROD001-PROD005)
aws dynamodb delete-item \
  --table-name Products \
  --key '{"productId": {"S": "PROD001"}}'

# Delete serials (repeat for all 50 serials)
aws dynamodb delete-item \
  --table-name ProductSerials \
  --key '{"serialId": {"S": "PROD001-0001"}}'
```

Or use a batch delete script (create separately if needed).

## Integration with Deployment

The seeding script can be integrated into the deployment workflow:

```bash
# After infrastructure provisioning
npm run provision:all

# Seed test data
npm run seed

# Verify deployment
npm run verify:deployment
```

## Requirements Validation

This seeding script validates:

- **Requirement 26.1**: Creates 1 manufacturer record ✓
- **Requirement 26.2**: Creates 5 product records with varied carbon footprints ✓
- **Requirement 26.3**: Generates 50 QR serial records distributed across products ✓
- **Requirement 26.4**: Verifies carbon calculations produce correct badge assignments ✓
- **Requirement 26.5**: Verifies QR scanning retrieves correct product data ✓

## Next Steps

After seeding:

1. Test the Manufacturer Dashboard with seeded products
2. Test QR scanning with generated serial IDs
3. Verify API endpoints return correct data
4. Test consumer view with product display
5. Validate charts and visualizations render correctly
