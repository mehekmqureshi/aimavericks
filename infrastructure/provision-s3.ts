import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketEncryptionCommand,
  PutBucketVersioningCommand,
  PutPublicAccessBlockCommand,
  PutBucketCorsCommand,
  PutBucketWebsiteCommand,
  BucketLocationConstraint
} from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new S3Client({ region });
const environment = process.env.ENVIRONMENT || 'dev';
const accountId = '565164711676'; // Your AWS account ID

interface BucketConfig {
  bucketName: string;
  privateAccess: boolean;
  encryption: boolean;
  versioning: boolean;
  staticWebsite?: boolean;
  cors?: boolean;
}

async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

async function createBucket(config: BucketConfig): Promise<void> {
  const { bucketName, privateAccess, encryption, versioning, staticWebsite, cors } = config;

  if (await bucketExists(bucketName)) {
    console.log(`✓ Bucket ${bucketName} already exists`);
    return;
  }

  console.log(`Creating bucket ${bucketName}...`);

  // Create bucket
  const createParams: any = {
    Bucket: bucketName
  };

  // Only add LocationConstraint if not in us-east-1
  if (region !== 'us-east-1') {
    createParams.CreateBucketConfiguration = {
      LocationConstraint: region as BucketLocationConstraint
    };
  }

  await client.send(new CreateBucketCommand(createParams));

  // Configure private access (block all public access)
  if (privateAccess) {
    await client.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true
      }
    }));
    console.log(`  ✓ Private access configured`);
  }

  // Enable AES-256 encryption at rest
  if (encryption) {
    await client.send(new PutBucketEncryptionCommand({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            },
            BucketKeyEnabled: true
          }
        ]
      }
    }));
    console.log(`  ✓ AES-256 encryption enabled`);
  }

  // Enable versioning
  if (versioning) {
    await client.send(new PutBucketVersioningCommand({
      Bucket: bucketName,
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    }));
    console.log(`  ✓ Versioning enabled`);
  }

  // Configure static website hosting
  if (staticWebsite) {
    await client.send(new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: {
          Suffix: 'index.html'
        },
        ErrorDocument: {
          Key: 'index.html' // SPA fallback
        }
      }
    }));
    console.log(`  ✓ Static website hosting configured`);
  }

  // Configure CORS for API access
  if (cors) {
    await client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'], // Should be restricted to CloudFront domain in production
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600
          }
        ]
      }
    }));
    console.log(`  ✓ CORS configured`);
  }

  console.log(`✓ Bucket ${bucketName} created successfully`);
}

async function provisionQRCodesBucket(): Promise<void> {
  await createBucket({
    bucketName: `gp-qr-codes-${accountId}-${environment}`,
    privateAccess: true,
    encryption: true,
    versioning: true
  });
}

async function provisionFrontendBucket(): Promise<void> {
  await createBucket({
    bucketName: `gp-frontend-${accountId}-${environment}`,
    privateAccess: false, // Will be accessed via CloudFront
    encryption: true,
    versioning: false,
    staticWebsite: true,
    cors: true
  });
}

async function main() {
  try {
    console.log(`Starting S3 bucket provisioning for environment: ${environment}\n`);

    // Provision all buckets
    await provisionQRCodesBucket();
    await provisionFrontendBucket();

    console.log('\n✓ All S3 buckets provisioned successfully');
  } catch (error) {
    console.error('Error provisioning S3 buckets:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  provisionQRCodesBucket,
  provisionFrontendBucket
};
