# Seed Data Quick Start

Quick reference for seeding test data into the Green Passport platform.

## Prerequisites

1. DynamoDB tables provisioned (Manufacturers, Products, ProductSerials)
2. AWS credentials configured
3. Dependencies installed: `npm install`

## Run Seeding

```bash
npm run seed
```

## What Gets Created

- **1 Manufacturer**: EcoTextiles Inc. (MFG001)
- **5 Products** with different carbon footprints:
  - PROD001: Organic Cotton T-Shirt (~2 kg CO2) → Environment Friendly
  - PROD002: Recycled Polyester Jacket (~5 kg CO2) → Moderate Impact
  - PROD003: Wool Sweater (~8 kg CO2) → High Impact
  - PROD004: Bamboo Socks (~3 kg CO2) → Environment Friendly
  - PROD005: Hemp Tote Bag (~6 kg CO2) → Moderate Impact
- **50 Serials**: 10 per product (PROD001-0001 through PROD005-0010)

## Environment Variables

Set these before running:

```bash
export AWS_REGION=us-east-1
export MANUFACTURERS_TABLE_NAME=Manufacturers
export PRODUCTS_TABLE_NAME=Products
export PRODUCT_SERIALS_TABLE_NAME=ProductSerials
```

Or use defaults (shown above).

## Verification

The script automatically verifies:
- ✓ Badge assignments match carbon footprint thresholds
- ✓ QR scanning retrieves correct product data
- ✓ Digital signatures are valid

## Troubleshooting

**Table not found?**
```bash
npm run provision:dynamodb
```

**Access denied?**
Check AWS credentials have DynamoDB permissions.

**Badge mismatch?**
Check CarbonCalculator and BadgeEngine logic.

## See Also

- Full documentation: [SEEDING_GUIDE.md](./SEEDING_GUIDE.md)
- Requirements: 26.1, 26.2, 26.3, 26.4, 26.5
