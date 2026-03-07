import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { LifecycleData } from '../../shared/types';

/**
 * Product data for AI description generation
 */
export interface ProductData {
  name: string;
  category: string;
  materials: string[];
  manufacturingProcess: string;
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker for external service resilience
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 5;
  private readonly resetTimeout: number = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      } else if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * AI Service for generating product descriptions and sustainability insights
 * using Amazon Bedrock with Claude 3 Haiku model
 */
export class AIService {
  private client: BedrockRuntimeClient;
  private circuitBreaker: CircuitBreaker;
  private readonly modelId: string = 'amazon.nova-lite-v1:0';
  private readonly timeout: number = 10000; // 10 seconds

  constructor(region: string = 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Generate product description using AI
   * @param productData Product information for description generation
   * @returns Generated product description
   */
  async generateDescription(productData: ProductData): Promise<string> {
    const prompt = this.buildDescriptionPrompt(productData);
    
    try {
      const response = await this.circuitBreaker.execute(() =>
        this.invokeModel(prompt)
      );
      return response;
    } catch (error) {
      console.error('AI description generation failed:', error);
      throw new Error('Failed to generate product description');
    }
  }

  /**
   * Generate sustainability insights from lifecycle data
   * @param lifecycleData Complete lifecycle data
   * @param carbonFootprint Total carbon footprint in kg CO2
   * @returns Generated sustainability insights
   */
  async generateInsights(
    lifecycleData: LifecycleData,
    carbonFootprint: number
  ): Promise<string> {
    const prompt = this.buildInsightsPrompt(lifecycleData, carbonFootprint);
    
    try {
      const response = await this.circuitBreaker.execute(() =>
        this.invokeModel(prompt)
      );
      return response;
    } catch (error) {
      console.error('AI insights generation failed:', error);
      throw new Error('Failed to generate sustainability insights');
    }
  }

  /**
   * Invoke Bedrock model with timeout
   * @param prompt The prompt to send to the model
   * @returns Model response text
   */
  private async invokeModel(prompt: string): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Model invocation timeout')), this.timeout);
    });

    const invokePromise = this.invokeBedrock(prompt);

    try {
      const response = await Promise.race([invokePromise, timeoutPromise]);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === 'Model invocation timeout') {
        throw new Error('AI service timeout after 3 seconds');
      }
      throw error;
    }
  }

  /**
   * Invoke Bedrock API
   * @param prompt The prompt to send
   * @returns Model response
   */
  private async invokeBedrock(prompt: string): Promise<string> {
    // Check if using Amazon Nova or Claude
    const isNova = this.modelId.startsWith('amazon.nova');
    
    const payload = isNova ? {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
      inferenceConfig: {
        max_new_tokens: 1000,
      },
    } : {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
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
    const response = await this.client.send(command);

    if (!response.body) {
      throw new Error('Empty response from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Parse response based on model type
    if (isNova) {
      if (!responseBody.output || !responseBody.output.message || !responseBody.output.message.content || !responseBody.output.message.content[0] || !responseBody.output.message.content[0].text) {
        throw new Error('Invalid response format from Bedrock Nova');
      }
      return responseBody.output.message.content[0].text;
    } else {
      if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
        throw new Error('Invalid response format from Bedrock Claude');
      }
      return responseBody.content[0].text;
    }
  }

  /**
   * Build prompt for product description generation
   * @param productData Product information
   * @returns Formatted prompt
   */
  private buildDescriptionPrompt(productData: ProductData): string {
    return `Generate a compelling and informative product description for the following product:

Product Name: ${productData.name}
Category: ${productData.category}
Materials: ${productData.materials.join(', ')}
Manufacturing Process: ${productData.manufacturingProcess}

Please create a description that:
- Highlights the key features and materials
- Emphasizes sustainability aspects
- Is engaging and informative for consumers
- Is approximately 100-150 words

Description:`;
  }

  /**
   * Build prompt for sustainability insights generation
   * @param lifecycleData Complete lifecycle data
   * @param carbonFootprint Total carbon footprint
   * @returns Formatted prompt
   */
  private buildInsightsPrompt(
    lifecycleData: LifecycleData,
    carbonFootprint: number
  ): string {
    const materialsSummary = lifecycleData.materials
      .map(m => `${m.name} (${m.percentage}%, ${m.recycled ? 'recycled' : 'virgin'})`)
      .join(', ');

    return `Analyze the following product lifecycle data and provide sustainability insights and recommendations:

Total Carbon Footprint: ${carbonFootprint.toFixed(2)} kg CO2

Materials: ${materialsSummary}
Manufacturing Location: ${lifecycleData.manufacturing.factoryLocation}
Energy Consumption: ${lifecycleData.manufacturing.energyConsumption} kWh
Transport Mode: ${lifecycleData.transport.mode}
Transport Distance: ${lifecycleData.transport.distance} km
Recyclable: ${lifecycleData.endOfLife.recyclable ? 'Yes' : 'No'}
Biodegradable: ${lifecycleData.endOfLife.biodegradable ? 'Yes' : 'No'}

Please provide:
1. A brief assessment of the product's environmental impact
2. Key areas contributing most to the carbon footprint
3. 2-3 specific recommendations for reducing environmental impact
4. Positive sustainability aspects to highlight

Keep the response concise (150-200 words) and actionable.

Insights:`;
  }

  /**
   * Get circuit breaker state (for testing/monitoring)
   * @returns Current circuit breaker state
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for testing)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}
