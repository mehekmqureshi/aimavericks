/**
 * SageMaker Training and Deployment Script
 * 
 * Creates and deploys ML model for carbon footprint prediction
 * Uses XGBoost regression on seeded product data
 */

import {
  SageMakerClient,
  CreateTrainingJobCommand,
  DescribeTrainingJobCommand,
  CreateModelCommand,
  CreateEndpointConfigCommand,
  CreateEndpointCommand,
  DescribeEndpointCommand,
} from '@aws-sdk/client-sagemaker';

interface SageMakerConfig {
  region: string;
  trainingJobName: string;
  modelName: string;
  endpointConfigName: string;
  endpointName: string;
  roleArn: string;
  trainingDataS3Uri: string;
  outputS3Uri: string;
}

export class SageMakerProvisioner {
  private client: SageMakerClient;
  private config: SageMakerConfig;

  constructor(config: Partial<SageMakerConfig> = {}) {
    const timestamp = Date.now();
    
    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      trainingJobName: config.trainingJobName || `gp-carbon-training-${timestamp}`,
      modelName: config.modelName || `gp-carbon-model-${timestamp}`,
      endpointConfigName: config.endpointConfigName || `gp-carbon-endpoint-config-${timestamp}`,
      endpointName: config.endpointName || process.env.SAGEMAKER_ENDPOINT_NAME || 'gp-carbon-predictor',
      roleArn: config.roleArn || process.env.SAGEMAKER_ROLE_ARN || '',
      trainingDataS3Uri: config.trainingDataS3Uri || process.env.TRAINING_DATA_S3_URI || '',
      outputS3Uri: config.outputS3Uri || process.env.MODEL_OUTPUT_S3_URI || '',
    };

    this.client = new SageMakerClient({ region: this.config.region });
  }

  /**
   * Full provisioning workflow
   */
  async provision(): Promise<void> {
    console.log('Starting SageMaker provisioning...');

    try {
      // Step 1: Create training job
      console.log('Step 1: Creating training job...');
      await this.createTrainingJob();

      // Step 2: Wait for training to complete
      console.log('Step 2: Waiting for training to complete...');
      await this.waitForTrainingCompletion();

      // Step 3: Create model
      console.log('Step 3: Creating model...');
      await this.createModel();

      // Step 4: Create endpoint configuration
      console.log('Step 4: Creating endpoint configuration...');
      await this.createEndpointConfig();

      // Step 5: Create endpoint
      console.log('Step 5: Creating endpoint...');
      await this.createEndpoint();

      // Step 6: Wait for endpoint to be in service
      console.log('Step 6: Waiting for endpoint to be in service...');
      await this.waitForEndpointInService();

      console.log('✓ SageMaker provisioning completed successfully!');
      console.log(`Endpoint Name: ${this.config.endpointName}`);
      console.log(`Set environment variable: SAGEMAKER_ENDPOINT_NAME=${this.config.endpointName}`);
    } catch (error) {
      console.error('✗ SageMaker provisioning failed:', error);
      throw error;
    }
  }

  /**
   * Create SageMaker training job with XGBoost
   */
  private async createTrainingJob(): Promise<void> {
    // XGBoost container image (region-specific)
    const xgboostImage = this.getXGBoostImage();

    const command = new CreateTrainingJobCommand({
      TrainingJobName: this.config.trainingJobName,
      RoleArn: this.config.roleArn,
      AlgorithmSpecification: {
        TrainingImage: xgboostImage,
        TrainingInputMode: 'File',
      },
      InputDataConfig: [
        {
          ChannelName: 'train',
          DataSource: {
            S3DataSource: {
              S3DataType: 'S3Prefix',
              S3Uri: this.config.trainingDataS3Uri,
              S3DataDistributionType: 'FullyReplicated',
            },
          },
          ContentType: 'text/csv',
        },
      ],
      OutputDataConfig: {
        S3OutputPath: this.config.outputS3Uri,
      },
      ResourceConfig: {
        InstanceType: 'ml.m5.xlarge',
        InstanceCount: 1,
        VolumeSizeInGB: 10,
      },
      StoppingCondition: {
        MaxRuntimeInSeconds: 3600,
      },
      HyperParameters: {
        objective: 'reg:squarederror',
        num_round: '100',
        max_depth: '5',
        eta: '0.2',
        subsample: '0.8',
        colsample_bytree: '0.8',
      },
    });

    await this.client.send(command);
    console.log(`Training job created: ${this.config.trainingJobName}`);
  }

  /**
   * Wait for training job to complete
   */
  private async waitForTrainingCompletion(): Promise<void> {
    const maxWaitTime = 3600000; // 1 hour
    const pollInterval = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const command = new DescribeTrainingJobCommand({
        TrainingJobName: this.config.trainingJobName,
      });

      const response = await this.client.send(command);
      const status = response.TrainingJobStatus;

      console.log(`Training job status: ${status}`);

      if (status === 'Completed') {
        console.log('Training completed successfully!');
        return;
      }

      if (status === 'Failed' || status === 'Stopped') {
        throw new Error(`Training job ${status}: ${response.FailureReason}`);
      }

      await this.sleep(pollInterval);
    }

    throw new Error('Training job timeout');
  }

  /**
   * Create SageMaker model
   */
  private async createModel(): Promise<void> {
    const xgboostImage = this.getXGBoostImage();
    const modelDataUrl = `${this.config.outputS3Uri}/${this.config.trainingJobName}/output/model.tar.gz`;

    const command = new CreateModelCommand({
      ModelName: this.config.modelName,
      PrimaryContainer: {
        Image: xgboostImage,
        ModelDataUrl: modelDataUrl,
      },
      ExecutionRoleArn: this.config.roleArn,
    });

    await this.client.send(command);
    console.log(`Model created: ${this.config.modelName}`);
  }

  /**
   * Create endpoint configuration
   */
  private async createEndpointConfig(): Promise<void> {
    const command = new CreateEndpointConfigCommand({
      EndpointConfigName: this.config.endpointConfigName,
      ProductionVariants: [
        {
          VariantName: 'AllTraffic',
          ModelName: this.config.modelName,
          InitialInstanceCount: 1,
          InstanceType: 'ml.t2.medium',
          InitialVariantWeight: 1,
        },
      ],
    });

    await this.client.send(command);
    console.log(`Endpoint config created: ${this.config.endpointConfigName}`);
  }

  /**
   * Create real-time inference endpoint
   */
  private async createEndpoint(): Promise<void> {
    const command = new CreateEndpointCommand({
      EndpointName: this.config.endpointName,
      EndpointConfigName: this.config.endpointConfigName,
    });

    await this.client.send(command);
    console.log(`Endpoint created: ${this.config.endpointName}`);
  }

  /**
   * Wait for endpoint to be in service
   */
  private async waitForEndpointInService(): Promise<void> {
    const maxWaitTime = 1800000; // 30 minutes
    const pollInterval = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const command = new DescribeEndpointCommand({
        EndpointName: this.config.endpointName,
      });

      const response = await this.client.send(command);
      const status = response.EndpointStatus;

      console.log(`Endpoint status: ${status}`);

      if (status === 'InService') {
        console.log('Endpoint is in service!');
        return;
      }

      if (status === 'Failed') {
        throw new Error(`Endpoint creation failed: ${response.FailureReason}`);
      }

      await this.sleep(pollInterval);
    }

    throw new Error('Endpoint creation timeout');
  }

  /**
   * Get XGBoost container image for region
   */
  private getXGBoostImage(): string {
    const regionImageMap: Record<string, string> = {
      'us-east-1': '683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.5-1',
      'us-west-2': '246618743249.dkr.ecr.us-west-2.amazonaws.com/sagemaker-xgboost:1.5-1',
      'eu-west-1': '685385470294.dkr.ecr.eu-west-1.amazonaws.com/sagemaker-xgboost:1.5-1',
    };

    return regionImageMap[this.config.region] || regionImageMap['us-east-1'];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const provisioner = new SageMakerProvisioner();
  provisioner.provision().catch(console.error);
}
