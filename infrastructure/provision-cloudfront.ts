import {
  CloudFrontClient,
  CreateDistributionCommand,
  GetDistributionCommand,
  CreateCloudFrontOriginAccessIdentityCommand,
  GetCloudFrontOriginAccessIdentityCommand,
  ListDistributionsCommand,
  Distribution,
  DistributionConfig
} from '@aws-sdk/client-cloudfront';
import {
  S3Client,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand
} from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const cloudFrontClient = new CloudFrontClient({ region });
const s3Client = new S3Client({ region });
const environment = process.env.ENVIRONMENT || 'dev';
const frontendBucket = process.env.FRONTEND_BUCKET || `gp-frontend-${environment}`;

interface CloudFrontResult {
  distributionId: string;
  distributionDomain: string;
  oaiId: string;
}

/**
 * Check if an Origin Access Identity already exists
 */
async function getExistingOAI(comment: string): Promise<string | null> {
  try {
    // List all OAIs and find one with matching comment
    const { CloudFrontOriginAccessIdentityList } = await cloudFrontClient.send(
      new GetCloudFrontOriginAccessIdentityCommand({ Id: comment })
    );
    return null; // If we get here, no match found
  } catch (error: any) {
    // OAI doesn't exist, which is expected
    return null;
  }
}

/**
 * Create Origin Access Identity (OAI) for CloudFront to access S3
 */
async function createOriginAccessIdentity(): Promise<string> {
  const comment = `OAI for Green Passport Frontend ${environment}`;
  
  console.log('Creating Origin Access Identity...');
  
  try {
    const command = new CreateCloudFrontOriginAccessIdentityCommand({
      CloudFrontOriginAccessIdentityConfig: {
        CallerReference: `gp-oai-${environment}-${Date.now()}`,
        Comment: comment
      }
    });
    
    const response = await cloudFrontClient.send(command);
    const oaiId = response.CloudFrontOriginAccessIdentity?.Id;
    
    if (!oaiId) {
      throw new Error('Failed to create OAI: No ID returned');
    }
    
    console.log(`  ✓ Origin Access Identity created: ${oaiId}`);
    return oaiId;
  } catch (error: any) {
    if (error.name === 'CloudFrontOriginAccessIdentityAlreadyExists') {
      console.log('  ✓ Origin Access Identity already exists');
      // Extract ID from error or use a default approach
      throw new Error('OAI already exists. Please check AWS Console for existing OAI ID.');
    }
    throw error;
  }
}

/**
 * Update S3 bucket policy to allow CloudFront OAI access
 */
async function updateBucketPolicy(oaiId: string): Promise<void> {
  console.log(`Updating S3 bucket policy for ${frontendBucket}...`);
  
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowCloudFrontOAI',
        Effect: 'Allow',
        Principal: {
          AWS: `arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${oaiId}`
        },
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${frontendBucket}/*`
      }
    ]
  };
  
  try {
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: frontendBucket,
      Policy: JSON.stringify(bucketPolicy)
    }));
    console.log('  ✓ S3 bucket policy updated');
  } catch (error: any) {
    console.error('  ✗ Failed to update bucket policy:', error.message);
    throw error;
  }
}

/**
 * Check if a distribution already exists for the frontend bucket
 */
async function getExistingDistribution(): Promise<Distribution | null> {
  try {
    const response = await cloudFrontClient.send(new ListDistributionsCommand({}));
    const distributions = response.DistributionList?.Items || [];
    
    // Find distribution with matching origin
    const existingDist = distributions.find(dist => {
      const origins = dist.Origins?.Items || [];
      return origins.some(origin => 
        origin.DomainName?.includes(frontendBucket)
      );
    });
    
    return existingDist || null;
  } catch (error) {
    console.error('Error checking for existing distribution:', error);
    return null;
  }
}

/**
 * Create CloudFront distribution
 */
async function createDistribution(oaiId: string): Promise<CloudFrontResult> {
  console.log('Creating CloudFront distribution...');
  
  // Check if distribution already exists
  const existingDist = await getExistingDistribution();
  if (existingDist && existingDist.Id && existingDist.DomainName) {
    console.log(`  ✓ Distribution already exists: ${existingDist.Id}`);
    return {
      distributionId: existingDist.Id,
      distributionDomain: existingDist.DomainName,
      oaiId
    };
  }
  
  const originDomain = `${frontendBucket}.s3.${region}.amazonaws.com`;
  
  const distributionConfig: DistributionConfig = {
    CallerReference: `gp-distribution-${environment}-${Date.now()}`,
    Comment: `Green Passport Frontend Distribution - ${environment}`,
    Enabled: true,
    
    // S3 Origin Configuration
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: `S3-${frontendBucket}`,
          DomainName: originDomain,
          S3OriginConfig: {
            OriginAccessIdentity: `origin-access-identity/cloudfront/${oaiId}`
          },
          ConnectionAttempts: 3,
          ConnectionTimeout: 10
        }
      ]
    },
    
    // Default Cache Behavior
    DefaultCacheBehavior: {
      TargetOriginId: `S3-${frontendBucket}`,
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: {
        Quantity: 2,
        Items: ['GET', 'HEAD'],
        CachedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD']
        }
      },
      Compress: true,
      ForwardedValues: {
        QueryString: false,
        Cookies: {
          Forward: 'none'
        },
        Headers: {
          Quantity: 0
        }
      },
      MinTTL: 0,
      DefaultTTL: 86400, // 1 day
      MaxTTL: 31536000, // 1 year
      TrustedSigners: {
        Enabled: false,
        Quantity: 0
      }
    },
    
    // Cache Behaviors for different file types
    CacheBehaviors: {
      Quantity: 2,
      Items: [
        // Static assets (JS, CSS) - long cache
        {
          PathPattern: 'assets/*',
          TargetOriginId: `S3-${frontendBucket}`,
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
            CachedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD']
            }
          },
          Compress: true,
          ForwardedValues: {
            QueryString: false,
            Cookies: {
              Forward: 'none'
            },
            Headers: {
              Quantity: 0
            }
          },
          MinTTL: 31536000, // 1 year
          DefaultTTL: 31536000,
          MaxTTL: 31536000,
          TrustedSigners: {
            Enabled: false,
            Quantity: 0
          }
        },
        // HTML files - no cache
        {
          PathPattern: '*.html',
          TargetOriginId: `S3-${frontendBucket}`,
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
            CachedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD']
            }
          },
          Compress: true,
          ForwardedValues: {
            QueryString: false,
            Cookies: {
              Forward: 'none'
            },
            Headers: {
              Quantity: 0
            }
          },
          MinTTL: 0,
          DefaultTTL: 0,
          MaxTTL: 0,
          TrustedSigners: {
            Enabled: false,
            Quantity: 0
          }
        }
      ]
    },
    
    // Custom Error Responses for SPA routing
    CustomErrorResponses: {
      Quantity: 2,
      Items: [
        {
          ErrorCode: 404,
          ResponsePagePath: '/index.html',
          ResponseCode: '200',
          ErrorCachingMinTTL: 300
        },
        {
          ErrorCode: 403,
          ResponsePagePath: '/index.html',
          ResponseCode: '200',
          ErrorCachingMinTTL: 300
        }
      ]
    },
    
    // Default root object
    DefaultRootObject: 'index.html',
    
    // Viewer Certificate (default CloudFront certificate)
    ViewerCertificate: {
      CloudFrontDefaultCertificate: true,
      MinimumProtocolVersion: 'TLSv1.2_2021'
    },
    
    // Price Class
    PriceClass: 'PriceClass_100', // Use only North America and Europe edge locations
    
    // HTTP Version
    HttpVersion: 'http2and3'
  };
  
  try {
    const command = new CreateDistributionCommand({
      DistributionConfig: distributionConfig
    });
    
    const response = await cloudFrontClient.send(command);
    const distribution = response.Distribution;
    
    if (!distribution?.Id || !distribution?.DomainName) {
      throw new Error('Failed to create distribution: No ID or domain returned');
    }
    
    console.log(`  ✓ CloudFront distribution created: ${distribution.Id}`);
    console.log(`  ✓ Distribution domain: ${distribution.DomainName}`);
    console.log(`  ✓ Status: ${distribution.Status}`);
    
    return {
      distributionId: distribution.Id,
      distributionDomain: distribution.DomainName,
      oaiId
    };
  } catch (error: any) {
    console.error('  ✗ Failed to create distribution:', error.message);
    throw error;
  }
}

/**
 * Main provisioning function
 */
async function main() {
  try {
    console.log(`Starting CloudFront provisioning for environment: ${environment}\n`);
    console.log(`Frontend bucket: ${frontendBucket}\n`);
    
    // Step 1: Create Origin Access Identity
    const oaiId = await createOriginAccessIdentity();
    
    // Step 2: Update S3 bucket policy
    await updateBucketPolicy(oaiId);
    
    // Step 3: Create CloudFront distribution
    const result = await createDistribution(oaiId);
    
    console.log('\n✓ CloudFront provisioning completed successfully\n');
    console.log('Distribution Details:');
    console.log(`  Distribution ID: ${result.distributionId}`);
    console.log(`  Distribution Domain: ${result.distributionDomain}`);
    console.log(`  OAI ID: ${result.oaiId}`);
    console.log(`\nFrontend URL: https://${result.distributionDomain}`);
    console.log('\nNote: Distribution deployment may take 15-20 minutes to complete.');
    console.log('Check status in AWS Console: CloudFront > Distributions\n');
    
    // Save configuration
    const config = {
      environment,
      frontendBucket,
      distributionId: result.distributionId,
      distributionDomain: result.distributionDomain,
      oaiId: result.oaiId,
      frontendUrl: `https://${result.distributionDomain}`,
      provisionedAt: new Date().toISOString()
    };
    
    console.log('Configuration saved for reference:');
    console.log(JSON.stringify(config, null, 2));
    
  } catch (error: any) {
    console.error('\n✗ CloudFront provisioning failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure AWS credentials are configured: aws configure');
    console.error('2. Verify S3 bucket exists:', frontendBucket);
    console.error('3. Check IAM permissions for CloudFront and S3');
    console.error('4. Review error details above\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  createOriginAccessIdentity,
  updateBucketPolicy,
  createDistribution
};
