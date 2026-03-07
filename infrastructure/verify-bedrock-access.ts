/**
 * Bedrock Access Verification Script
 * 
 * This script verifies that Amazon Bedrock is properly configured
 * and accessible for the Green Passport platform.
 * 
 * Usage: npx ts-node verify-bedrock-access.ts [--region us-east-1]
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockClient,
  ListFoundationModelsCommand,
} from '@aws-sdk/client-bedrock';

interface VerificationResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

class BedrockVerifier {
  private region: string;
  private modelId: string = 'anthropic.claude-3-haiku-20240307-v1:0';
  private results: VerificationResult[] = [];

  constructor(region: string = 'us-east-1') {
    this.region = region;
  }

  /**
   * Run all verification checks
   */
  async verify(): Promise<void> {
    console.log('🔍 Amazon Bedrock Access Verification\n');
    console.log(`Region: ${this.region}`);
    console.log(`Model: ${this.modelId}\n`);
    console.log('─'.repeat(60));

    await this.checkModelAvailability();
    await this.checkModelAccess();
    await this.testModelInvocation();
    await this.testResponseFormat();
    await this.measureLatency();

    this.printSummary();
  }

  /**
   * Check if Claude 3 Haiku is available in the region
   */
  private async checkModelAvailability(): Promise<void> {
    const step = 'Model Availability';
    console.log(`\n📋 ${step}...`);

    try {
      const client = new BedrockClient({ region: this.region });
      const command = new ListFoundationModelsCommand({});
      const response = await client.send(command);

      const models = response.modelSummaries || [];
      const claudeHaiku = models.find(m => m.modelId === this.modelId);

      if (claudeHaiku) {
        this.results.push({
          step,
          status: 'PASS',
          message: `Claude 3 Haiku is available in ${this.region}`,
          details: {
            modelName: claudeHaiku.modelName,
            provider: claudeHaiku.providerName,
            inputModalities: claudeHaiku.inputModalities,
            outputModalities: claudeHaiku.outputModalities,
          },
        });
        console.log(`✓ Model found: ${claudeHaiku.modelName}`);
      } else {
        this.results.push({
          step,
          status: 'FAIL',
          message: `Claude 3 Haiku not found in ${this.region}`,
          details: { availableModels: models.map(m => m.modelId) },
        });
        console.log(`✗ Model not found`);
      }
    } catch (error) {
      this.results.push({
        step,
        status: 'FAIL',
        message: `Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if we have access to invoke the model
   */
  private async checkModelAccess(): Promise<void> {
    const step = 'Model Access';
    console.log(`\n🔐 ${step}...`);

    try {
      const client = new BedrockRuntimeClient({ region: this.region });
      
      // Try to invoke with minimal payload to check access
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      };

      const input: InvokeModelCommandInput = {
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      };

      const command = new InvokeModelCommand(input);
      await client.send(command);

      this.results.push({
        step,
        status: 'PASS',
        message: 'Successfully invoked model - access granted',
      });
      console.log('✓ Model access confirmed');
    } catch (error: any) {
      if (error.name === 'AccessDeniedException') {
        this.results.push({
          step,
          status: 'FAIL',
          message: 'Access denied - check IAM permissions',
          details: { error: error.message },
        });
        console.log('✗ Access denied - IAM permissions needed');
      } else if (error.name === 'ResourceNotFoundException') {
        this.results.push({
          step,
          status: 'FAIL',
          message: 'Model not enabled - enable in Bedrock console',
          details: { error: error.message },
        });
        console.log('✗ Model not enabled - enable in Bedrock console');
      } else {
        this.results.push({
          step,
          status: 'WARN',
          message: `Unexpected error: ${error.message}`,
          details: { error: error.message },
        });
        console.log(`⚠ Unexpected error: ${error.message}`);
      }
    }
  }

  /**
   * Test model invocation with a real prompt
   */
  private async testModelInvocation(): Promise<void> {
    const step = 'Model Invocation';
    console.log(`\n🤖 ${step}...`);

    try {
      const client = new BedrockRuntimeClient({ region: this.region });
      
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Generate a one-sentence product description for an organic cotton t-shirt.',
          },
        ],
      };

      const input: InvokeModelCommandInput = {
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      };

      const command = new InvokeModelCommand(input);
      const response = await client.send(command);

      if (!response.body) {
        throw new Error('Empty response body');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const generatedText = responseBody.content?.[0]?.text || '';

      this.results.push({
        step,
        status: 'PASS',
        message: 'Successfully generated text',
        details: {
          prompt: 'Generate a one-sentence product description...',
          response: generatedText.substring(0, 100) + (generatedText.length > 100 ? '...' : ''),
          tokens: responseBody.usage,
        },
      });
      console.log('✓ Model invocation successful');
      console.log(`  Response: "${generatedText.substring(0, 80)}..."`);
    } catch (error) {
      this.results.push({
        step,
        status: 'FAIL',
        message: `Model invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`✗ Invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test response format validation
   */
  private async testResponseFormat(): Promise<void> {
    const step = 'Response Format';
    console.log(`\n📝 ${step}...`);

    try {
      const client = new BedrockRuntimeClient({ region: this.region });
      
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: 'Say "test"',
          },
        ],
      };

      const input: InvokeModelCommandInput = {
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      };

      const command = new InvokeModelCommand(input);
      const response = await client.send(command);

      if (!response.body) {
        throw new Error('Empty response body');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Validate expected response structure
      const hasContent = Array.isArray(responseBody.content);
      const hasText = responseBody.content?.[0]?.text !== undefined;
      const hasUsage = responseBody.usage !== undefined;
      const hasRole = responseBody.role === 'assistant';

      if (hasContent && hasText && hasUsage && hasRole) {
        this.results.push({
          step,
          status: 'PASS',
          message: 'Response format is valid',
          details: {
            structure: {
              content: hasContent,
              text: hasText,
              usage: hasUsage,
              role: hasRole,
            },
          },
        });
        console.log('✓ Response format validated');
      } else {
        this.results.push({
          step,
          status: 'WARN',
          message: 'Response format differs from expected',
          details: {
            expected: { content: true, text: true, usage: true, role: true },
            actual: { content: hasContent, text: hasText, usage: hasUsage, role: hasRole },
          },
        });
        console.log('⚠ Response format differs from expected');
      }
    } catch (error) {
      this.results.push({
        step,
        status: 'FAIL',
        message: `Format validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`✗ Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Measure response latency
   */
  private async measureLatency(): Promise<void> {
    const step = 'Response Latency';
    console.log(`\n⏱️  ${step}...`);

    try {
      const client = new BedrockRuntimeClient({ region: this.region });
      
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Generate a brief product description.',
          },
        ],
      };

      const input: InvokeModelCommandInput = {
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      };

      const command = new InvokeModelCommand(input);
      
      const startTime = Date.now();
      await client.send(command);
      const endTime = Date.now();
      
      const latency = endTime - startTime;
      const timeoutThreshold = 3000; // 3 seconds per requirements

      if (latency < timeoutThreshold) {
        this.results.push({
          step,
          status: 'PASS',
          message: `Response time: ${latency}ms (within ${timeoutThreshold}ms threshold)`,
          details: { latency, threshold: timeoutThreshold },
        });
        console.log(`✓ Latency: ${latency}ms (within ${timeoutThreshold}ms threshold)`);
      } else {
        this.results.push({
          step,
          status: 'WARN',
          message: `Response time: ${latency}ms (exceeds ${timeoutThreshold}ms threshold)`,
          details: { latency, threshold: timeoutThreshold },
        });
        console.log(`⚠ Latency: ${latency}ms (exceeds ${timeoutThreshold}ms threshold)`);
      }
    } catch (error) {
      this.results.push({
        step,
        status: 'FAIL',
        message: `Latency test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`✗ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Print verification summary
   */
  private printSummary(): void {
    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 Verification Summary\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log(`✓ Passed:   ${passed}`);
    console.log(`✗ Failed:   ${failed}`);
    console.log(`⚠ Warnings: ${warnings}`);
    console.log(`  Total:    ${this.results.length}`);

    if (failed > 0) {
      console.log('\n❌ Verification FAILED - Review errors above');
      console.log('\nCommon fixes:');
      console.log('1. Enable Claude 3 Haiku in Bedrock console');
      console.log('2. Check IAM permissions for bedrock:InvokeModel');
      console.log('3. Verify AWS credentials are configured');
      console.log('4. Ensure correct region is selected');
      process.exit(1);
    } else if (warnings > 0) {
      console.log('\n⚠️  Verification PASSED with warnings');
      console.log('Review warnings above for potential issues');
    } else {
      console.log('\n✅ All checks PASSED - Bedrock is ready!');
    }

    console.log('\n' + '─'.repeat(60));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const regionArg = args.find(arg => arg.startsWith('--region='));
  const region = regionArg ? regionArg.split('=')[1] : 'us-east-1';

  const verifier = new BedrockVerifier(region);
  await verifier.verify();
}

main().catch(error => {
  console.error('\n❌ Verification script error:', error);
  process.exit(1);
});
