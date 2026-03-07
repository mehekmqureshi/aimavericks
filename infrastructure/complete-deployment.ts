#!/usr/bin/env ts-node

import { 
  S3Client, 
  PutObjectCommand
} from '@aws-sdk/client-s3';
import { 
  CloudFrontClient, 
  CreateInvalidationCommand
} from '@aws-sdk/client-cloudfront';
import { 
  LambdaClient, 
  UpdateFunctionCodeCommand
} from '@aws-sdk/client-lambda';
import { 
  APIGatewayClient, 
  CreateDeploymentCommand,
  GetRestApisCommand 
} from '@aws-sdk/client-api-gateway';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';

const region = process.env.AWS_REGION || 'us-east-1';
const frontendBucket = process.env.FRONTEND_BUCKET || 'gp-frontend-prod-2026';

const s3Client = new S3Client({ region });
const cloudFrontClient = new CloudFrontClient({ region });
const lambdaClient = new LambdaClient({ region });
const apiGatewayClient = new APIGatewayClient({ region });

async function buildFrontend() {
  console.log('\n🔨 Step 1: Building frontend...');
  try {
    execSync('cd frontend && npm run build', { stdio: 'inherit' });
    console.log('✅ Frontend build complete');
  } catch (error) {
    console.error('❌ Frontend build failed:', error);
    throw error;
  }
}

async function uploadToS3() {
  console.log('\n📤 Step 2: Uploading to S3...');
  
  const distPath = path.join(process.cwd(), 'frontend', 'dist');
  
  if (!fs.existsSync(distPath)) {
    throw new Error('Build directory not found. Run build first.');
  }

  const uploadFile = async (filePath: string, key: string) => {
    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: frontendBucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: key.includes('index.html') ? 'no-cache' : 'public, max-age=31536000'
    }));
  };

  const uploadDirectory = async (dirPath: string, prefix = '') => {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await uploadDirectory(filePath, path.join(prefix, file));
      } else {
        const key = path.join(prefix, file).replace(/\\/g, '/');
        await uploadFile(filePath, key);
        console.log(`  ✓ Uploaded: ${key}`);
      }
    }
  };

  await uploadDirectory(distPath);
  console.log('✅ S3 upload complete');
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: { [key: string]: string } = {
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
  return contentTypes[ext] || 'application/octet-stream';
}

async function invalidateCloudFront() {
  console.log('\n🔄 Step 3: Invalidating CloudFront cache...');
  
  try {
    // Find CloudFront distribution
    const { CloudFrontClient, ListDistributionsCommand } = await import('@aws-sdk/client-cloudfront');
    const client = new CloudFrontClient({ region });
    
    const distributions = await client.send(new ListDistributionsCommand({}));
    const distribution = distributions.DistributionList?.Items?.find(d => 
      d.Origins?.Items?.some(o => o.DomainName?.includes(frontendBucket))
    );

    if (!distribution?.Id) {
      console.log('⚠️  No CloudFront distribution found, skipping invalidation');
      return;
    }

    await cloudFrontClient.send(new CreateInvalidationCommand({
      DistributionId: distribution.Id,
      InvalidationBatch: {
        CallerReference: `deployment-${Date.now()}`,
        Paths: {
          Quantity: 1,
          Items: ['/*']
        }
      }
    }));

    console.log(`✅ CloudFront invalidation created for distribution: ${distribution.Id}`);
  } catch (error) {
    console.error('⚠️  CloudFront invalidation failed:', error);
  }
}

async function redeployLambdas() {
  console.log('\n🚀 Step 4: Redeploying Lambda functions...');
  
  const lambdaFunctions = [
    'gp-createProduct-dev',
    'gp-getProduct-dev',
    'gp-listProducts-dev',
    'gp-updateProduct-dev',
    'gp-calculateEmission-dev',
    'gp-aiGenerate-dev',
    'gp-generateQR-dev',
    'gp-verifySerial-dev',
    'gp-getManufacturer-dev',
    'gp-updateManufacturer-dev',
    'gp-saveDraft-dev',
    'gp-getDraft-dev'
  ];

  for (const funcName of lambdaFunctions) {
    try {
      const zipPath = await createLambdaZip(funcName);
      const zipContent = fs.readFileSync(zipPath);

      await lambdaClient.send(new UpdateFunctionCodeCommand({
        FunctionName: funcName,
        ZipFile: zipContent
      }));

      console.log(`  ✓ Updated: ${funcName}`);
      fs.unlinkSync(zipPath);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`  ⚠️  Skipped: ${funcName} (not found)`);
      } else {
        console.error(`  ❌ Failed: ${funcName}`, error.message);
      }
    }
  }

  console.log('✅ Lambda redeployment complete');
}

async function createLambdaZip(functionName: string): Promise<string> {
  const zipPath = path.join(process.cwd(), `${functionName}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);

    archive.pipe(output);

    // Extract base function name (remove gp- prefix and -dev suffix)
    const baseName = functionName.replace(/^gp-/, '').replace(/-dev$/, '');

    // Add Lambda handler
    const handlerPath = path.join(process.cwd(), 'backend', 'lambdas', `${baseName}.ts`);
    if (fs.existsSync(handlerPath)) {
      archive.file(handlerPath, { name: `${baseName}.ts` });
    }

    // Add dependencies
    const dirs = ['services', 'repositories', 'utils', 'middleware'];
    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), 'backend', dir);
      if (fs.existsSync(dirPath)) {
        archive.directory(dirPath, dir);
      }
    }

    archive.finalize();
  });
}

async function deployAPIGateway(): Promise<string | undefined> {
  console.log('\n🌐 Step 5: Deploying API Gateway stage...');
  
  try {
    const apis = await apiGatewayClient.send(new GetRestApisCommand({}));
    const api = apis.items?.find(a => a.name?.includes('green-passport'));

    if (!api?.id) {
      console.log('⚠️  API Gateway not found, skipping deployment');
      return undefined;
    }

    await apiGatewayClient.send(new CreateDeploymentCommand({
      restApiId: api.id,
      stageName: 'prod',
      description: `Deployment at ${new Date().toISOString()}`
    }));

    console.log(`✅ API Gateway deployed: ${api.id}`);
    return api.id;
  } catch (error) {
    console.error('⚠️  API Gateway deployment failed:', error);
    return undefined;
  }
}

async function outputProductionURL() {
  console.log('\n🎉 Step 6: Production URLs\n');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Get CloudFront URL
    const { ListDistributionsCommand } = await import('@aws-sdk/client-cloudfront');
    const distributions = await cloudFrontClient.send(new ListDistributionsCommand({}));
    const distribution = distributions.DistributionList?.Items?.find(d => 
      d.Origins?.Items?.some(o => o.DomainName?.includes(frontendBucket))
    );

    if (distribution?.DomainName) {
      console.log(`\n🌍 Frontend URL:`);
      console.log(`   https://${distribution.DomainName}`);
    }

    // Get API Gateway URL
    const apis = await apiGatewayClient.send(new GetRestApisCommand({}));
    const api = apis.items?.find(a => a.name?.includes('green-passport'));

    if (api?.id) {
      console.log(`\n🔌 API URL:`);
      console.log(`   https://${api.id}.execute-api.${region}.amazonaws.com/prod`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Error fetching URLs:', error);
  }
}

async function main() {
  console.log('🚀 Starting Complete Deployment Process\n');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    await buildFrontend();
    await uploadToS3();
    await invalidateCloudFront();
    await redeployLambdas();
    await deployAPIGateway();
    await outputProductionURL();
    
    console.log('\n✅ Deployment Complete!\n');
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();
