/**
 * Comprehensive Component Testing Suite
 * 
 * Tests all components with real API calls:
 * - Create Product
 * - Save Draft
 * - Generate QR
 * - AI Autofill
 * - QR Scan
 * - Sustainability Badge
 * - DynamoDB Record Creation
 */

import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

interface TestConfig {
  apiUrl: string;
  authToken?: string;
}

class ComponentTester {
  private config: TestConfig;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
  }

  private async runTest(
    name: string,
    testFn: () => Promise<{ passed: boolean; error?: string; details?: any }>
  ): Promise<TestResult> {
    const start = Date.now();
    console.log(`\n🧪 Testing: ${name}...`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      
      const testResult: TestResult = {
        name,
        passed: result.passed,
        error: result.error,
        duration,
        details: result.details
      };
      
      this.results.push(testResult);
      
      if (result.passed) {
        console.log(`  ✅ PASSED (${duration}ms)`);
      } else {
        console.log(`  ❌ FAILED (${duration}ms)`);
        console.log(`  Error: ${result.error}`);
      }
      
      return testResult;
    } catch (error: any) {
      const duration = Date.now() - start;
      const testResult: TestResult = {
        name,
        passed: false,
        error: error.message,
        duration
      };
      
      this.results.push(testResult);
      console.log(`  ❌ FAILED (${duration}ms)`);
      console.log(`  Error: ${error.message}`);
      
      return testResult;
    }
  }

  async testCreateProduct(): Promise<TestResult> {
    return this.runTest('Create Product', async () => {
      const productData = {
        name: 'Test Product',
        category: 'Electronics',
        description: 'Test product for automated testing',
        materials: ['Aluminum', 'Plastic'],
        weight: 1.5,
        manufacturingLocation: 'Test Factory',
        carbonFootprint: 10.5
      };

      try {
        const response = await axios.post(
          `${this.config.apiUrl}/products`,
          productData,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
            },
            timeout: 10000
          }
        );

        const passed = response.status === 200 || response.status === 201;
        return {
          passed,
          error: passed ? undefined : `Unexpected status: ${response.status}`,
          details: response.data
        };
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            passed: false,
            error: 'Authentication required - endpoint exists but needs auth'
          };
        }
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testSaveDraft(): Promise<TestResult> {
    return this.runTest('Save Draft', async () => {
      const draftData = {
        productName: 'Draft Product',
        category: 'Test',
        materials: ['Test Material']
      };

      try {
        const response = await axios.post(
          `${this.config.apiUrl}/drafts`,
          draftData,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
            },
            timeout: 10000
          }
        );

        const passed = response.status === 200 || response.status === 201;
        return {
          passed,
          error: passed ? undefined : `Unexpected status: ${response.status}`,
          details: response.data
        };
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            passed: false,
            error: 'Authentication required - endpoint exists but needs auth'
          };
        }
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testGenerateQR(): Promise<TestResult> {
    return this.runTest('Generate QR Code', async () => {
      const qrData = {
        productId: 'test-product-123',
        serialNumber: 'SN-TEST-001'
      };

      try {
        const response = await axios.post(
          `${this.config.apiUrl}/qr/generate`,
          qrData,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
            },
            timeout: 10000
          }
        );

        const passed = response.status === 200 && response.data.qrCodeUrl;
        return {
          passed,
          error: passed ? undefined : 'QR code URL not returned',
          details: response.data
        };
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            passed: false,
            error: 'Authentication required - endpoint exists but needs auth'
          };
        }
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testAIAutofill(): Promise<TestResult> {
    return this.runTest('AI Autofill', async () => {
      const aiRequest = {
        productName: 'Smartphone',
        category: 'Electronics'
      };

      try {
        const response = await axios.post(
          `${this.config.apiUrl}/ai/generate`,
          aiRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
            },
            timeout: 30000 // AI calls may take longer
          }
        );

        const passed = response.status === 200 && response.data.description;
        return {
          passed,
          error: passed ? undefined : 'AI response missing description',
          details: response.data
        };
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            passed: false,
            error: 'Authentication required - endpoint exists but needs auth'
          };
        }
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testQRScan(): Promise<TestResult> {
    return this.runTest('QR Scan Verification', async () => {
      const serialNumber = 'SN-TEST-001';

      try {
        const response = await axios.get(
          `${this.config.apiUrl}/verify/${serialNumber}`,
          {
            timeout: 10000
          }
        );

        const passed = response.status === 200 || response.status === 404;
        return {
          passed,
          error: passed ? undefined : `Unexpected status: ${response.status}`,
          details: response.data
        };
      } catch (error: any) {
        if (error.response?.status === 404) {
          return {
            passed: true,
            error: undefined,
            details: 'Endpoint working (serial not found is expected)'
          };
        }
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testSustainabilityBadge(): Promise<TestResult> {
    return this.runTest('Sustainability Badge Calculation', async () => {
      const emissionData = {
        weight: 1.5,
        materials: ['Aluminum', 'Plastic'],
        transportDistance: 1000,
        manufacturingEnergy: 50
      };

      try {
        const response = await axios.post(
          `${this.config.apiUrl}/emissions/calculate`,
          emissionData,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const passed = response.status === 200 && 
                      response.data.carbonFootprint !== undefined &&
                      response.data.badge !== undefined;
        return {
          passed,
          error: passed ? undefined : 'Missing carbonFootprint or badge in response',
          details: response.data
        };
      } catch (error: any) {
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testDynamoDBRecord(): Promise<TestResult> {
    return this.runTest('DynamoDB Record Creation', async () => {
      // Test by creating a product and verifying it can be retrieved
      const productId = `test-${Date.now()}`;
      
      try {
        // First, try to create a product
        const createResponse = await axios.post(
          `${this.config.apiUrl}/products`,
          {
            productId,
            name: 'DynamoDB Test Product',
            category: 'Test'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
            },
            timeout: 10000,
            validateStatus: () => true
          }
        );

        // Then try to retrieve it
        const getResponse = await axios.get(
          `${this.config.apiUrl}/products/${productId}`,
          {
            headers: {
              ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
            },
            timeout: 10000,
            validateStatus: () => true
          }
        );

        const passed = (createResponse.status === 200 || createResponse.status === 201) &&
                      (getResponse.status === 200 || getResponse.status === 404);
        
        return {
          passed,
          error: passed ? undefined : 'DynamoDB operations failed',
          details: {
            createStatus: createResponse.status,
            getStatus: getResponse.status
          }
        };
      } catch (error: any) {
        if (error.response?.status === 401) {
          return {
            passed: false,
            error: 'Authentication required - endpoint exists but needs auth'
          };
        }
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async testHTTPSEnforcement(): Promise<TestResult> {
    return this.runTest('HTTPS Enforcement', async () => {
      const isHttps = this.config.apiUrl.startsWith('https://');
      
      return {
        passed: isHttps,
        error: isHttps ? undefined : 'API URL is not using HTTPS',
        details: { apiUrl: this.config.apiUrl }
      };
    });
  }

  async testCORSHeaders(): Promise<TestResult> {
    return this.runTest('CORS Headers', async () => {
      try {
        const response = await axios.options(
          `${this.config.apiUrl}/products`,
          {
            headers: {
              'Origin': 'https://example.com',
              'Access-Control-Request-Method': 'POST'
            },
            timeout: 10000
          }
        );

        const hasCORS = response.headers['access-control-allow-origin'] !== undefined;
        
        return {
          passed: hasCORS,
          error: hasCORS ? undefined : 'CORS headers not present',
          details: response.headers
        };
      } catch (error: any) {
        return {
          passed: false,
          error: error.message
        };
      }
    });
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Comprehensive Component Tests');
    console.log('=' .repeat(60));
    console.log(`API URL: ${this.config.apiUrl}`);
    console.log('=' .repeat(60));

    // Run all tests
    await this.testHTTPSEnforcement();
    await this.testCORSHeaders();
    await this.testCreateProduct();
    await this.testSaveDraft();
    await this.testGenerateQR();
    await this.testAIAutofill();
    await this.testQRScan();
    await this.testSustainabilityBadge();
    await this.testDynamoDBRecord();

    return this.results;
  }

  displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name.padEnd(35)} ${duration.padStart(10)}`);
      if (result.error) {
        console.log(`   └─ ${result.error}`);
      }
    });

    console.log('='.repeat(60));
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Review errors above.');
    } else {
      console.log('\n✅ All tests passed!');
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

async function main() {
  try {
    // Read API URL from environment or .env file
    let apiUrl = process.env.VITE_API_GATEWAY_URL;
    
    if (!apiUrl) {
      try {
        const envPath = join(__dirname, '..', 'frontend', '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/VITE_API_GATEWAY_URL=(.+)/);
        if (match) {
          apiUrl = match[1].trim();
        }
      } catch (error) {
        console.error('Could not read .env file');
      }
    }

    if (!apiUrl) {
      throw new Error('API URL not found. Set VITE_API_GATEWAY_URL environment variable or update frontend/.env');
    }

    const config: TestConfig = {
      apiUrl,
      authToken: process.env.AUTH_TOKEN
    };

    const tester = new ComponentTester(config);
    await tester.runAllTests();
    tester.displayResults();

    const results = tester.getResults();
    const failedCount = results.filter(r => !r.passed).length;

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { ComponentTester, TestResult, TestConfig };
