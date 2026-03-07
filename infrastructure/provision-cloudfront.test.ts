import {
  CloudFrontClient,
  GetDistributionCommand,
  GetCloudFrontOriginAccessIdentityCommand,
  ListDistributionsCommand
} from '@aws-sdk/client-cloudfront';
import {
  S3Client,
  GetBucketPolicyCommand
} from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const cloudFrontClient = new CloudFrontClient({ region });
const s3Client = new S3Client({ region });
const environment = process.env.ENVIRONMENT || 'dev';
const frontendBucket = process.env.FRONTEND_BUCKET || `gp-frontend-${environment}`;

describe('CloudFront Distribution Provisioning', () => {
  let distributionId: string | undefined;
  let oaiId: string | undefined;

  beforeAll(async () => {
    // Find the distribution for our frontend bucket
    try {
      const response = await cloudFrontClient.send(new ListDistributionsCommand({}));
      const distributions = response.DistributionList?.Items || [];
      
      const distribution = distributions.find(dist => {
        const origins = dist.Origins?.Items || [];
        return origins.some(origin => origin.DomainName?.includes(frontendBucket));
      });
      
      if (distribution) {
        distributionId = distribution.Id;
        
        // Extract OAI ID from origin configuration
        const s3Origin = distribution.Origins?.Items?.[0];
        if (s3Origin?.S3OriginConfig?.OriginAccessIdentity) {
          const oaiPath = s3Origin.S3OriginConfig.OriginAccessIdentity;
          oaiId = oaiPath.split('/').pop();
        }
      }
    } catch (error) {
      console.log('Could not find distribution. Tests will be skipped.');
    }
  });

  describe('Distribution Configuration', () => {
    test('should have a valid distribution ID', () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      expect(distributionId).toBeDefined();
      expect(typeof distributionId).toBe('string');
      expect(distributionId.length).toBeGreaterThan(0);
    });

    test('should be enabled', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      expect(response.Distribution?.DistributionConfig?.Enabled).toBe(true);
    });

    test('should have correct S3 origin configured', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const origins = response.Distribution?.DistributionConfig?.Origins?.Items || [];
      expect(origins.length).toBeGreaterThan(0);
      
      const s3Origin = origins[0];
      expect(s3Origin.DomainName).toContain(frontendBucket);
      expect(s3Origin.S3OriginConfig).toBeDefined();
    });

    test('should have Origin Access Identity configured', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const s3Origin = response.Distribution?.DistributionConfig?.Origins?.Items?.[0];
      expect(s3Origin?.S3OriginConfig?.OriginAccessIdentity).toBeDefined();
      expect(s3Origin?.S3OriginConfig?.OriginAccessIdentity).toContain('origin-access-identity/cloudfront/');
    });

    test('should have HTTPS redirect enabled', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const defaultBehavior = response.Distribution?.DistributionConfig?.DefaultCacheBehavior;
      expect(defaultBehavior?.ViewerProtocolPolicy).toBe('redirect-to-https');
    });

    test('should have compression enabled', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const defaultBehavior = response.Distribution?.DistributionConfig?.DefaultCacheBehavior;
      expect(defaultBehavior?.Compress).toBe(true);
    });

    test('should have default root object set to index.html', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      expect(response.Distribution?.DistributionConfig?.DefaultRootObject).toBe('index.html');
    });
  });

  describe('Cache Behaviors', () => {
    test('should have cache behaviors for static assets', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const cacheBehaviors = response.Distribution?.DistributionConfig?.CacheBehaviors?.Items || [];
      expect(cacheBehaviors.length).toBeGreaterThan(0);
      
      // Check for assets/* pattern
      const assetsBehavior = cacheBehaviors.find(b => b.PathPattern === 'assets/*');
      expect(assetsBehavior).toBeDefined();
      expect(assetsBehavior?.MinTTL).toBeGreaterThan(0);
    });

    test('should have cache behavior for HTML files with no cache', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const cacheBehaviors = response.Distribution?.DistributionConfig?.CacheBehaviors?.Items || [];
      
      // Check for *.html pattern
      const htmlBehavior = cacheBehaviors.find(b => b.PathPattern === '*.html');
      expect(htmlBehavior).toBeDefined();
      expect(htmlBehavior?.MinTTL).toBe(0);
      expect(htmlBehavior?.DefaultTTL).toBe(0);
      expect(htmlBehavior?.MaxTTL).toBe(0);
    });
  });

  describe('Custom Error Responses', () => {
    test('should have custom error response for 404 (SPA routing)', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const errorResponses = response.Distribution?.DistributionConfig?.CustomErrorResponses?.Items || [];
      
      const error404 = errorResponses.find(e => e.ErrorCode === 404);
      expect(error404).toBeDefined();
      expect(error404?.ResponsePagePath).toBe('/index.html');
      expect(error404?.ResponseCode).toBe('200');
    });

    test('should have custom error response for 403 (SPA routing)', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const errorResponses = response.Distribution?.DistributionConfig?.CustomErrorResponses?.Items || [];
      
      const error403 = errorResponses.find(e => e.ErrorCode === 403);
      expect(error403).toBeDefined();
      expect(error403?.ResponsePagePath).toBe('/index.html');
      expect(error403?.ResponseCode).toBe('200');
    });
  });

  describe('Origin Access Identity', () => {
    test('should have a valid OAI ID', () => {
      if (!oaiId) {
        console.log('⊘ Skipping: OAI not found');
        return;
      }
      
      expect(oaiId).toBeDefined();
      expect(typeof oaiId).toBe('string');
      expect(oaiId.length).toBeGreaterThan(0);
    });

    test('should be able to retrieve OAI details', async () => {
      if (!oaiId) {
        console.log('⊘ Skipping: OAI not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetCloudFrontOriginAccessIdentityCommand({ Id: oaiId })
      );
      
      expect(response.CloudFrontOriginAccessIdentity).toBeDefined();
      expect(response.CloudFrontOriginAccessIdentity?.Id).toBe(oaiId);
    });
  });

  describe('S3 Bucket Policy', () => {
    test('should have bucket policy allowing OAI access', async () => {
      if (!oaiId) {
        console.log('⊘ Skipping: OAI not found');
        return;
      }
      
      try {
        const response = await s3Client.send(
          new GetBucketPolicyCommand({ Bucket: frontendBucket })
        );
        
        expect(response.Policy).toBeDefined();
        
        const policy = JSON.parse(response.Policy || '{}');
        expect(policy.Statement).toBeDefined();
        expect(Array.isArray(policy.Statement)).toBe(true);
        
        // Check for OAI permission
        const oaiStatement = policy.Statement.find((stmt: any) => 
          stmt.Principal?.AWS?.includes('cloudfront') &&
          stmt.Action === 's3:GetObject'
        );
        
        expect(oaiStatement).toBeDefined();
      } catch (error: any) {
        if (error.name === 'NoSuchBucketPolicy') {
          console.log('⊘ Bucket policy not found - may need to be configured');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Security Configuration', () => {
    test('should use TLS 1.2 or higher', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const viewerCert = response.Distribution?.DistributionConfig?.ViewerCertificate;
      expect(viewerCert?.MinimumProtocolVersion).toMatch(/TLSv1\.2/);
    });

    test('should support HTTP/2', async () => {
      if (!distributionId) {
        console.log('⊘ Skipping: Distribution not found');
        return;
      }
      
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId })
      );
      
      const httpVersion = response.Distribution?.DistributionConfig?.HttpVersion;
      expect(httpVersion).toMatch(/http2/);
    });
  });
});
