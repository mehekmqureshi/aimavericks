# Test Data Seeding Implementation Summary

## Task Completed: 44. Create test data seeding script

### Files Created

1. **`infrastructure/seed-data.ts`** - Main seeding script
   - Creates 1 manufacturer record (EcoTextiles Inc.)
   - Creates 5 products with varied carbon footprints (2kg, 5kg, 8kg, 3kg, 6kg)
   - Generates 50 QR serial records (10 per product)
   - Verifies badge assignments are correct
   - Verifies QR scanning retrieves correct product data

2. **`infrastructure/SEEDING_GUIDE.md`** - Comprehensive documentation
   - Detailed usage instructions
   - Product specifications table
   - Prerequisites and setup
   - Expected output examples
   - Troubleshooting guide
   - Integration with deployment workflow

3. **`infrastructure/SEED_QUICKSTART.md`** - Quick reference
   - Fast setup instructions
   - Common commands
   - Quick troubleshooting

### Package.json Updates

Added npm script:
```json
"seed": "ts-node infrastructure/seed-data.ts"
```

Added dependency:
```json
"@aws-sdk/util-dynamodb": "^3.490.0"
```

## Implementation Details

### Manufacturer Data
- **ID**: MFG001
- **Name**: EcoTextiles Inc.
- **Location**: Portland, Oregon, USA
- **Certifications**: GOTS, Fair Trade, B Corp, Carbon Neutral
- **Contact**: contact@ecotextiles.example.com

### Product Data

| Product | Carbon | Badge | Serials |
|---------|--------|-------|---------|
| PROD001: Organic Cotton T-Shirt | ~2 kg | Environment Friendly (green) | 0001-0010 |
| PROD002: Recycled Polyester Jacket | ~5 kg | Moderate Impact (yellow) | 0001-0010 |
| PROD003: Wool Sweater | ~8 kg | High Impact (red) | 0001-0010 |
| PROD004: Bamboo Socks | ~3 kg | Environment Friendly (green) | 0001-0010 |
| PROD005: Hemp Tote Bag | ~6 kg | Moderate Impact (yellow) | 0001-0010 |

### Lifecycle Data Structure

Each product includes complete structured lifecycle data:

**Materials Section**
- Organic Cotton (95%, 0.15 kg, emission factor 2.1 kg CO2/kg)
- Elastane (5%, 0.008 kg, emission factor 8.5 kg CO2/kg)

**Manufacturing Section**
- Factory: Bangladesh
- Energy: 2.5 kWh per piece
- Energy emission factor: 0.8 kg CO2/kWh
- Dyeing: Natural Dyes
- Water: 50 litres
- Waste: 0.02 kg

**Packaging Section**
- Material: Recycled Cardboard
- Weight: 0.05 kg
- Emission factor: 0.9 kg CO2/kg
- Recyclable: Yes

**Transport Section**
- Mode: Ship
- Distance: Varies (adjusted to hit target carbon)
- Fuel: Heavy Fuel Oil
- Emission factor: 0.015 kg CO2/km

**Usage Phase Section**
- Wash cycles: 50
- Temperature: 30°C
- Dryer: No

**End of Life Section**
- Recyclable: Yes
- Biodegradable: Yes
- Take-back program: Yes
- Disposal emission: 0.5 kg CO2

### Verification Logic

The script includes automated verification:

1. **Badge Assignment Verification**
   - Compares assigned badge with expected badge based on carbon footprint
   - Uses BadgeEngine thresholds:
     - < 4 kg: Environment Friendly (green)
     - 4-7 kg: Moderate Impact (yellow)
     - > 7 kg: High Impact (red)

2. **QR Scanning Verification**
   - Tests 5 sample serials (one from each product)
   - Retrieves serial from DynamoDB
   - Retrieves associated product data
   - Recomputes digital signature
   - Compares stored vs computed signature

### Services Used

- **CarbonCalculator**: Computes carbon footprint from lifecycle data
- **BadgeEngine**: Assigns sustainability badges based on thresholds
- **SignatureService**: Generates SHA256 digital signatures
- **ProductRepository**: Stores products in DynamoDB
- **ManufacturerRepository**: Stores manufacturer in DynamoDB (via direct PutItem)
- **SerialRepository**: Stores serials in DynamoDB

## Usage

### Basic Usage
```bash
npm run seed
```

### With Custom Environment
```bash
export AWS_REGION=us-west-2
export MANUFACTURERS_TABLE_NAME=MyManufacturers
export PRODUCTS_TABLE_NAME=MyProducts
export PRODUCT_SERIALS_TABLE_NAME=MySerials
npm run seed
```

### Programmatic Usage
```typescript
import { seedData } from './infrastructure/seed-data';

await seedData();
```

## Requirements Validation

✓ **Requirement 26.1**: Creates 1 manufacturer record with name, location, certifications
✓ **Requirement 26.2**: Creates 5 product records with varied carbon footprints (2kg, 5kg, 8kg, 3kg, 6kg)
✓ **Requirement 26.3**: Generates 50 QR serial records distributed across 5 products (10 per product)
✓ **Requirement 26.4**: Verifies carbon calculations produce correct badge assignments
✓ **Requirement 26.5**: Verifies QR scanning retrieves correct product data

## Testing

The seeding script can be tested by:

1. Running with provisioned DynamoDB tables
2. Checking console output for verification results
3. Querying DynamoDB tables to confirm data exists
4. Using AWS Console to inspect created records
5. Testing API endpoints with seeded data

## Integration Points

The seeded data can be used to test:

- Manufacturer Dashboard product listing
- Product creation workflow (compare with seeded products)
- QR code generation (compare with seeded serials)
- Consumer view product display
- QR scanning and verification
- Carbon footprint calculations
- Badge assignment logic
- API endpoints (GET /products, GET /products/:id, etc.)
- Frontend charts and visualizations

## Next Steps

After seeding:

1. Test Manufacturer Dashboard with seeded products
2. Test Consumer View with seeded serial IDs
3. Verify API endpoints return correct data
4. Test QR scanning functionality
5. Validate charts render correctly with lifecycle data
6. Test product updates and recalculations
7. Verify digital signature validation

## Notes

- The script uses deterministic carbon calculation (not ML) for consistent test data
- Transport distance is adjusted per product to achieve target carbon footprint
- All products use the same base lifecycle structure with varied transport
- Digital signatures are generated using SHA256 hash
- Serial IDs follow format: {productId}-{paddedIndex} (e.g., PROD001-0001)
- QR code URLs are placeholder S3 paths (actual QR images not generated)
- Scan statistics start at 0 for all serials

## Troubleshooting

See [SEEDING_GUIDE.md](./SEEDING_GUIDE.md) for detailed troubleshooting steps.

Common issues:
- Table not found → Run `npm run provision:dynamodb`
- Access denied → Check AWS credentials and IAM permissions
- Badge mismatch → Check CarbonCalculator and BadgeEngine logic
- Signature mismatch → Check SignatureService determinism
