import { LambdaClient, UpdateFunctionCodeCommand, GetFunctionCommand, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const client = new LambdaClient({ region: 'us-east-1' });
const functionName = 'gp-aiGenerate-dev';

async function deployAILambda() {
  console.log('🚀 Deploying aiGenerate Lambda\n');

  // Step 1: Create clean build directory
  const buildDir = 'dist/ai-lambda-deploy';
  if (existsSync(buildDir)) {
    execSync(`Remove-Item -Path "${buildDir}" -Recurse -Force`, { shell: 'powershell.exe' });
  }
  mkdirSync(buildDir, { recursive: true });

  // Step 2: Copy compiled Lambda handler
  console.log('📦 Copying Lambda handler...');
  const handlerSource = readFileSync('dist/backend/backend/lambdas/aiGenerate.js', 'utf8');
  writeFileSync(join(buildDir, 'index.js'), handlerSource);
  
  // Step 3: Copy dependencies
  console.log('📦 Copying dependencies...');
  const aiServiceSource = readFileSync('dist/backend/backend/services/AIService.js', 'utf8');
  mkdirSync(join(buildDir, 'services'), { recursive: true });
  writeFileSync(join(buildDir, 'services', 'AIService.js'), aiServiceSource);
  
  const typesSource = readFileSync('dist/backend/shared/types.js', 'utf8');
  mkdirSync(join(buildDir, 'shared'), { recursive: true });
  writeFileSync(join(buildDir, 'shared', 'types.js'), typesSource);

  // Step 4: Install node_modules
  console.log('📦 Installing node_modules...');
  const packageJson = {
    dependencies: {
      '@aws-sdk/client-bedrock-runtime': '^3.490.0'
    }
  };
  writeFileSync(join(buildDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  execSync('npm install --production', { cwd: buildDir, stdio: 'inherit' });

  // Step 5: Create ZIP
  console.log('📦 Creating deployment ZIP...');
  const zipPath = 'dist/aiGenerate-deploy.zip';
  execSync(`Compress-Archive -Path "${buildDir}/*" -DestinationPath "${zipPath}" -Force`, { shell: 'powershell.exe' });

  // Step 6: Deploy to AWS
  console.log('🚀 Deploying to AWS Lambda...');
  const zipContent = readFileSync(zipPath);
  
  await client.send(new UpdateFunctionCodeCommand({
    FunctionName: functionName,
    ZipFile: zipContent,
  }));

  // Step 7: Update configuration
  console.log('⚙️  Updating configuration...');
  await client.send(new UpdateFunctionConfigurationCommand({
    FunctionName: functionName,
    Handler: 'index.handler',
    Timeout: 30,
    Environment: {
      Variables: {
        PRODUCTS_TABLE: 'Products',
        MANUFACTURERS_TABLE: 'Manufacturers',
        SERIALS_TABLE: 'ProductSerials',
        DRAFTS_TABLE: 'Drafts',
        QR_BUCKET: 'gp-qr-codes-565164711676-dev',
        ENVIRONMENT: 'dev',
        SAGEMAKER_ENDPOINT: 'gp-carbon-predictor-dev',
      }
    }
  }));

  // Step 8: Verify deployment
  console.log('✅ Verifying deployment...');
  const funcInfo = await client.send(new GetFunctionCommand({ FunctionName: functionName }));
  
  console.log('\n✅ Deployment Complete!');
  console.log(`Function: ${funcInfo.Configuration?.FunctionName}`);
  console.log(`Handler: ${funcInfo.Configuration?.Handler}`);
  console.log(`Runtime: ${funcInfo.Configuration?.Runtime}`);
  console.log(`Timeout: ${funcInfo.Configuration?.Timeout}s`);
  console.log(`Last Modified: ${funcInfo.Configuration?.LastModified}`);
}

deployAILambda().catch(console.error);
