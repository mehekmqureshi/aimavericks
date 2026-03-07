import {
  S3Client,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetPublicAccessBlockCommand,
  GetBucketCorsCommand,
  GetBucketWebsiteCommand
} from '@aws-sdk/client-s3';
import {
  provisionQRCodesBucket,
  provisionFrontendBucket
} from './provision-s3';

const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const environment = process.env.ENVIRONMENT || 'dev';

describe('S3 Bucket Provisioning', () => {
  // Skip tests if AWS credentials are not configured
  const skipIfNoCredentials = process.env.AWS_ACCESS_KEY_ID ? test : test.skip;

  skipIfNoCredentials('should create QR codes bucket with correct configuration', async () => {
    await provisionQRCodesBucket();

    const bucketName = `gp-qr-codes-${environment}`;

    // Check encryption
    const encryptionResponse = await client.send(
      new GetBucketEncryptionCommand({ Bucket: bucketName })
    );
    expect(encryptionResponse.ServerSideEncryptionConfiguration).toBeDefined();
    expect(encryptionResponse.ServerSideEncryptionConfiguration?.Rules?.[0]
      .ApplyServerSideEncryptionByDefault?.SSEAlgorithm).toBe('AES256');

    // Check versioning
    const versioningResponse = await client.send(
      new GetBucketVersioningCommand({ Bucket: bucketName })
    );
    expect(versioningResponse.Status).toBe('Enabled');

    // Check public access block (private access)
    const publicAccessResponse = await client.send(
      new GetPublicAccessBlockCommand({ Bucket: bucketName })
    );
    expect(publicAccessResponse.PublicAccessBlockConfiguration).toBeDefined();
    expect(publicAccessResponse.PublicAccessBlockConfiguration?.BlockPublicAcls).toBe(true);
    expect(publicAccessResponse.PublicAccessBlockConfiguration?.IgnorePublicAcls).toBe(true);
    expect(publicAccessResponse.PublicAccessBlockConfiguration?.BlockPublicPolicy).toBe(true);
    expect(publicAccessResponse.PublicAccessBlockConfiguration?.RestrictPublicBuckets).toBe(true);
  }, 120000); // 2 minute timeout

  skipIfNoCredentials('should create frontend bucket with correct configuration', async () => {
    await provisionFrontendBucket();

    const bucketName = `gp-frontend-${environment}`;

    // Check encryption
    const encryptionResponse = await client.send(
      new GetBucketEncryptionCommand({ Bucket: bucketName })
    );
    expect(encryptionResponse.ServerSideEncryptionConfiguration).toBeDefined();
    expect(encryptionResponse.ServerSideEncryptionConfiguration?.Rules?.[0]
      .ApplyServerSideEncryptionByDefault?.SSEAlgorithm).toBe('AES256');

    // Check static website hosting
    const websiteResponse = await client.send(
      new GetBucketWebsiteCommand({ Bucket: bucketName })
    );
    expect(websiteResponse.IndexDocument).toBeDefined();
    expect(websiteResponse.IndexDocument?.Suffix).toBe('index.html');
    expect(websiteResponse.ErrorDocument?.Key).toBe('index.html');

    // Check CORS configuration
    const corsResponse = await client.send(
      new GetBucketCorsCommand({ Bucket: bucketName })
    );
    expect(corsResponse.CORSRules).toBeDefined();
    expect(corsResponse.CORSRules?.length).toBeGreaterThan(0);
    expect(corsResponse.CORSRules?.[0].AllowedMethods).toContain('GET');
  }, 120000);

  skipIfNoCredentials('should handle existing buckets gracefully', async () => {
    // Run provisioning twice - second time should detect existing buckets
    await provisionQRCodesBucket();
    await expect(provisionQRCodesBucket()).resolves.not.toThrow();
  }, 120000);
});
