/**
 * QR Validation Fix Test Suite
 * Tests the extractSerialId logic with various input formats
 */

// Simulate the extractSerialId function from QRScanner.tsx
function extractSerialId(data: string): string | null {
  try {
    // Try parsing as JSON first (QR Management format)
    const parsed = JSON.parse(data);
    if (parsed.serialId) {
      return parsed.serialId;
    }
  } catch (e) {
    // Not JSON, try other formats
  }
  
  // QR code might contain full URL
  // Capture everything after /product/ until whitespace or end of string
  const urlMatch = data.match(/\/product\/([^\s]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Check if data is already in serial ID format
  // Supports alphanumeric (upper/lowercase) and dashes, must contain at least one dash
  const serialMatch = data.match(/^[A-Za-z0-9]+[A-Za-z0-9\-]*[A-Za-z0-9]+$/);
  if (serialMatch && data.includes('-')) {
    return data;
  }
  
  return null;
}

// Simulate manual entry validation
function validateManualEntry(input: string): { valid: boolean; error?: string } {
  if (!input.trim()) {
    return { valid: false, error: 'Please enter a serial number' };
  }
  
  const trimmedInput = input.trim();
  
  // Validate serial format (supports both simple and UUID-based formats)
  // Must start with alphanumeric, contain at least one dash, end with alphanumeric
  // Supports uppercase, lowercase, and numbers
  const serialPattern = /^[A-Za-z0-9]+[A-Za-z0-9\-]*[A-Za-z0-9]+$/;
  
  if (!serialPattern.test(trimmedInput) || !trimmedInput.includes('-')) {
    return { 
      valid: false, 
      error: 'Invalid serial number format. Expected format: PROD-xxx-0001 or PROD-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-0001' 
    };
  }
  
  return { valid: true };
}

// Test cases
interface TestCase {
  name: string;
  input: string;
  expectedOutput: string | null;
  description: string;
}

const testCases: TestCase[] = [
  // JSON Payload Tests
  {
    name: 'JSON Payload - UUID Serial',
    input: JSON.stringify({
      serialId: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
      productId: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      manufacturerId: 'MFG-12345',
      signature: 'abc123def456',
      productName: 'Organic Cotton T-Shirt',
      category: 'Apparel',
      carbonFootprint: 2.5
    }),
    expectedOutput: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
    description: 'QR Management generated QR with full JSON payload'
  },
  {
    name: 'JSON Payload - Simple Serial',
    input: JSON.stringify({
      serialId: 'PROD001-0001',
      productId: 'PROD001',
      manufacturerId: 'MFG-001',
      signature: 'xyz789'
    }),
    expectedOutput: 'PROD001-0001',
    description: 'QR with simple serial format in JSON'
  },
  
  // URL Format Tests
  {
    name: 'URL Format - UUID Serial',
    input: 'https://example.com/product/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
    expectedOutput: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
    description: 'QR containing full URL with UUID serial'
  },
  {
    name: 'URL Format - Simple Serial',
    input: '/product/PROD001-0001',
    expectedOutput: 'PROD001-0001',
    description: 'QR containing relative URL path'
  },
  
  // Plain Serial Tests
  {
    name: 'Plain Serial - UUID Format',
    input: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
    expectedOutput: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
    description: 'Plain UUID-based serial'
  },
  {
    name: 'Plain Serial - Simple Format',
    input: 'PROD001-0001',
    expectedOutput: 'PROD001-0001',
    description: 'Plain simple serial'
  },
  {
    name: 'Plain Serial - Mixed Format',
    input: 'PROD-ABC123-0001',
    expectedOutput: 'PROD-ABC123-0001',
    description: 'Plain mixed alphanumeric serial'
  },
  
  // Invalid Format Tests
  {
    name: 'Invalid - No Dash',
    input: 'PROD0010001',
    expectedOutput: null,
    description: 'Serial without dash separator'
  },
  {
    name: 'Invalid - Special Characters',
    input: 'PROD@001-0001',
    expectedOutput: null,
    description: 'Serial with invalid special characters'
  },
  {
    name: 'Invalid - Empty String',
    input: '',
    expectedOutput: null,
    description: 'Empty input'
  }
];

// Manual Entry Test Cases
interface ManualTestCase {
  name: string;
  input: string;
  shouldPass: boolean;
  description: string;
}

const manualTestCases: ManualTestCase[] = [
  {
    name: 'Valid - UUID Serial',
    input: 'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
    shouldPass: true,
    description: 'UUID-based serial manual entry'
  },
  {
    name: 'Valid - Simple Serial',
    input: 'PROD001-0001',
    shouldPass: true,
    description: 'Simple serial manual entry'
  },
  {
    name: 'Valid - Mixed Serial',
    input: 'PROD-ABC-123-0001',
    shouldPass: true,
    description: 'Mixed format serial manual entry'
  },
  {
    name: 'Invalid - No Dash',
    input: 'PROD0010001',
    shouldPass: false,
    description: 'Serial without dash'
  },
  {
    name: 'Invalid - Special Chars',
    input: 'PROD@001-0001',
    shouldPass: false,
    description: 'Serial with special characters'
  },
  {
    name: 'Invalid - Empty',
    input: '',
    shouldPass: false,
    description: 'Empty input'
  },
  {
    name: 'Invalid - Whitespace Only',
    input: '   ',
    shouldPass: false,
    description: 'Whitespace only'
  }
];

// Run tests
console.log('🧪 QR Validation Fix Test Suite\n');
console.log('=' .repeat(80));
console.log('\n📋 PART 1: QR Code Extraction Tests\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  const result = extractSerialId(testCase.input);
  const passed = result === testCase.expectedOutput;
  
  if (passed) {
    passedTests++;
    console.log(`✅ Test ${index + 1}: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expectedOutput}`);
    console.log(`   Got: ${result}`);
  } else {
    failedTests++;
    console.log(`❌ Test ${index + 1}: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expectedOutput}`);
    console.log(`   Got: ${result}`);
  }
  console.log('');
});

console.log('=' .repeat(80));
console.log('\n📋 PART 2: Manual Entry Validation Tests\n');

let passedManualTests = 0;
let failedManualTests = 0;

manualTestCases.forEach((testCase, index) => {
  const result = validateManualEntry(testCase.input);
  const passed = result.valid === testCase.shouldPass;
  
  if (passed) {
    passedManualTests++;
    console.log(`✅ Test ${index + 1}: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Result: ${result.valid ? 'PASS' : 'FAIL'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  } else {
    failedManualTests++;
    console.log(`❌ Test ${index + 1}: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Input: "${testCase.input}"`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Result: ${result.valid ? 'PASS' : 'FAIL'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  console.log('');
});

// Summary
console.log('=' .repeat(80));
console.log('\n📊 TEST SUMMARY\n');
console.log(`QR Code Extraction Tests:`);
console.log(`  ✅ Passed: ${passedTests}/${testCases.length}`);
console.log(`  ❌ Failed: ${failedTests}/${testCases.length}`);
console.log('');
console.log(`Manual Entry Validation Tests:`);
console.log(`  ✅ Passed: ${passedManualTests}/${manualTestCases.length}`);
console.log(`  ❌ Failed: ${failedManualTests}/${manualTestCases.length}`);
console.log('');
console.log(`Total Tests: ${testCases.length + manualTestCases.length}`);
console.log(`Total Passed: ${passedTests + passedManualTests}`);
console.log(`Total Failed: ${failedTests + failedManualTests}`);
console.log('');

if (failedTests + failedManualTests === 0) {
  console.log('🎉 ALL TESTS PASSED! 🎉');
  console.log('✅ QR validation fix is working correctly');
} else {
  console.log('⚠️  SOME TESTS FAILED');
  console.log('❌ Please review the failed tests above');
}

console.log('\n' + '='.repeat(80));
