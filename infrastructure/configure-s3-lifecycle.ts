/**
 * Configure S3 Lifecycle Policies
 * Automatically delete old QR codes to reduce storage costs
 */

import { S3Client, PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';

const region = 'us-east-1';
const client = new S3Client({ region });
const qrBucket = 'gp-qr-codes-565164711676-dev';

async function configureLifecycle() {
  console.log('🔧 Configuring S3 lifecycle policies...\n');

  try {
    await client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: qrBucket,
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'DeleteOldQRCodes',
              Status: 'Enabled',
              Expiration: {
                Days: 90,
              },
              Filter: {
                Prefix: 'qr-codes/',
              },
            },
            {
              Id: 'DeleteOldZipFiles',
              Status: 'Enabled',
              Expiration: {
                Days: 7,
              },
              Filter: {
                Prefix: 'zip/',
              },
            },
          ],
        },
      })
    );

    console.log(`✅ Lifecycle policies configured for ${qrBucket}`);
    console.log('\nLifecycle Rules:');
    console.log('  1. Delete QR codes after 90 days (qr-codes/ prefix)');
    console.log('  2. Delete ZIP files after 7 days (zip/ prefix)');
    console.log('\nBenefit: Automatic cleanup reduces storage costs\n');

  } catch (error) {
    console.error('❌ Failed to configure lifecycle policies:', error);
    throw error;
  }
}

configureLifecycle().catch(console.error);
