/**
 * Configure CORS for S3 Frontend Bucket
 * Fixes CORS configuration for browser access
 */

import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const region = 'us-east-1';
const client = new S3Client({ region });
const frontendBucket = 'gp-frontend-prod-2026';

async function configureCORS() {
  console.log('🔧 Configuring CORS for S3 frontend bucket...\n');

  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: frontendBucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );

    console.log(`✅ CORS configured for ${frontendBucket}`);
    console.log('\nCORS Rules:');
    console.log('  - Allowed Methods: GET, HEAD');
    console.log('  - Allowed Origins: * (all)');
    console.log('  - Allowed Headers: * (all)');
    console.log('  - Max Age: 3600 seconds (1 hour)');
    console.log('  - Exposed Headers: ETag, Content-Length, Content-Type\n');

  } catch (error) {
    console.error('❌ Failed to configure CORS:', error);
    throw error;
  }
}

configureCORS().catch(console.error);
