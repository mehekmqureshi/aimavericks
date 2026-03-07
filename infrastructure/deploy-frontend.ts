import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new S3Client({ region });
const environment = process.env.ENVIRONMENT || 'dev';
const bucketName = process.env.FRONTEND_BUCKET || `gp-frontend-${environment}`;

// Content type mapping
const contentTypeMap: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Cache control settings
const cacheControlMap: Record<string, string> = {
  '.html': 'no-cache, no-store, must-revalidate', // Always fetch fresh HTML
  '.css': 'public, max-age=31536000, immutable',  // CSS with hash can be cached forever
  '.js': 'public, max-age=31536000, immutable',   // JS with hash can be cached forever
  '.png': 'public, max-age=31536000',
  '.jpg': 'public, max-age=31536000',
  '.svg': 'public, max-age=31536000',
  '.ico': 'public, max-age=86400'
};

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

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

async function uploadFile(filePath: string, distDir: string): Promise<void> {
  const fileContent = readFileSync(filePath);
  const relativePath = filePath.replace(distDir + '\\', '').replace(/\\/g, '/');
  const ext = extname(filePath);
  
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  const cacheControl = cacheControlMap[ext] || 'public, max-age=3600';

  await client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: relativePath,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: cacheControl
  }));

  console.log(`  ✓ Uploaded: ${relativePath} (${contentType})`);
}

async function deployFrontend(): Promise<void> {
  console.log(`Deploying frontend to S3 bucket: ${bucketName}\n`);

  // Check if bucket exists
  if (!await bucketExists(bucketName)) {
    console.error(`Error: Bucket ${bucketName} does not exist. Please run provision-s3.ts first.`);
    process.exit(1);
  }

  // Get all files from dist directory
  const distDir = join(__dirname, '..', 'frontend', 'dist');
  const files = getAllFiles(distDir);

  console.log(`Found ${files.length} files to upload\n`);

  // Upload all files
  for (const file of files) {
    await uploadFile(file, distDir);
  }

  console.log(`\n✓ Frontend deployed successfully to ${bucketName}`);
  console.log(`\nNext steps:`);
  console.log(`1. Configure CloudFront distribution to point to this bucket`);
  console.log(`2. Set up Origin Access Identity (OAI) for secure access`);
  console.log(`3. Invalidate CloudFront cache after deployment`);
}

async function main() {
  try {
    await deployFrontend();
  } catch (error) {
    console.error('Error deploying frontend:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { deployFrontend };
