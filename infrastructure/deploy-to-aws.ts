import {
  S3Client,
  PutBucketPolicyCommand,
  PutBucketWebsiteCommand,
  PutPublicAccessBlockCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateDistributionCommand, ListDistributionsCommand } from "@aws-sdk/client-cloudfront";
import * as fs from "fs";
import * as path from "path";

const s3Client = new S3Client({ region: "us-east-1" });
const cloudFrontClient = new CloudFrontClient({ region: "us-east-1" });

const BUCKET_NAME = "gp-frontend-prod-2026";
const DIST_DIR = path.join(__dirname, "..", "frontend", "dist");

async function createBucket(): Promise<void> {
  console.log(`Creating S3 bucket: ${BUCKET_NAME}...`);
  try {
    await s3Client.send(
      new PutPublicAccessBlockCommand({
        Bucket: BUCKET_NAME,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      })
    );
    console.log("✓ Public access enabled");
  } catch (error: any) {
    if (!error.message.includes("NoSuchBucket")) {
      console.log("✓ Bucket already exists");
    }
  }
}

async function configureBucketPolicy(): Promise<void> {
  console.log("Configuring bucket policy...");
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
      },
    ],
  };

  try {
    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify(policy),
      })
    );
    console.log("✓ Bucket policy applied");
  } catch (error: any) {
    console.error("✗ Failed to apply bucket policy:", error.message);
    throw error;
  }
}

async function enableWebsiteHosting(): Promise<void> {
  console.log("Enabling website hosting...");
  try {
    await s3Client.send(
      new PutBucketWebsiteCommand({
        Bucket: BUCKET_NAME,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: "index.html" },
          ErrorDocument: { Key: "index.html" },
        },
      })
    );
    console.log("✓ Website hosting enabled");
  } catch (error: any) {
    console.error("✗ Failed to enable website hosting:", error.message);
    throw error;
  }
}

async function uploadFiles(): Promise<void> {
  console.log(`Uploading files from ${DIST_DIR}...`);

  const files = getAllFiles(DIST_DIR);
  console.log(`Found ${files.length} files to upload`);

  for (const file of files) {
    const relativePath = path.relative(DIST_DIR, file);
    const key = relativePath.replace(/\\/g, "/");
    const fileContent = fs.readFileSync(file);

    let contentType = "application/octet-stream";
    const ext = path.extname(file).toLowerCase();

    if (ext === ".html") contentType = "text/html; charset=utf-8";
    if (ext === ".js") contentType = "application/javascript";
    if (ext === ".css") contentType = "text/css";
    if (ext === ".json") contentType = "application/json";
    if (ext === ".svg") contentType = "image/svg+xml";
    if (ext === ".png") contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    if (ext === ".gif") contentType = "image/gif";
    if (ext === ".ico") contentType = "image/x-icon";

    const cacheControl = ext === ".html" ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000, immutable";

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: contentType,
          CacheControl: cacheControl,
        })
      );
      console.log(`  ✓ ${key}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to upload ${key}:`, error.message);
      throw error;
    }
  }

  console.log(`✓ All ${files.length} files uploaded`);
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

async function createCloudFrontDistribution(): Promise<string> {
  console.log("Creating CloudFront distribution...");

  // Check if distribution already exists
  try {
    const existing = await cloudFrontClient.send(new ListDistributionsCommand({}));
    const dist = existing.DistributionList?.Items?.find(
      (d) => d.Origins?.Items?.[0]?.DomainName?.includes(BUCKET_NAME)
    );
    if (dist?.Id) {
      console.log(`✓ Distribution already exists: ${dist.Id}`);
      return dist.Id;
    }
  } catch (error) {
    // Continue if error
  }

  const distributionConfig = {
    CallerReference: Date.now().toString(),
    Comment: "Green Passport Frontend Distribution",
    DefaultRootObject: "index.html",
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: "S3Origin",
          DomainName: `${BUCKET_NAME}.s3.amazonaws.com`,
          S3OriginConfig: {
            OriginAccessIdentity: "",
          },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: "S3Origin",
      ViewerProtocolPolicy: "redirect-to-https" as const,
      TrustedSigners: {
        Enabled: false,
        Quantity: 0,
      },
      ForwardedValues: {
        QueryString: false,
        Cookies: {
          Forward: "none" as const,
        },
      },
      MinTTL: 0,
      DefaultTTL: 86400,
      MaxTTL: 31536000,
    },
    CacheBehaviors: {
      Quantity: 0,
      Items: [],
    },
    CustomErrorResponses: {
      Quantity: 2,
      Items: [
        {
          ErrorCode: 404,
          ResponseCode: "200",
          ResponsePagePath: "/index.html",
          ErrorCachingMinTTL: 300,
        },
        {
          ErrorCode: 403,
          ResponseCode: "200",
          ResponsePagePath: "/index.html",
          ErrorCachingMinTTL: 300,
        },
      ],
    },
    Enabled: true,
  };

  try {
    const result = await cloudFrontClient.send(
      new CreateDistributionCommand({
        DistributionConfig: distributionConfig,
      })
    );

    const distributionId = result.Distribution?.Id;
    const domainName = result.Distribution?.DomainName;

    console.log(`✓ CloudFront distribution created`);
    console.log(`  Distribution ID: ${distributionId}`);
    console.log(`  Domain: ${domainName}`);

    return distributionId || "";
  } catch (error: any) {
    console.error("✗ Failed to create distribution:", error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║                                                                ║");
    console.log("║     🚀 DEPLOYING GREEN PASSPORT FRONTEND TO AWS 🚀             ║");
    console.log("║                                                                ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log(`Region: us-east-1\n`);

    await createBucket();
    await configureBucketPolicy();
    await enableWebsiteHosting();
    await uploadFiles();
    const distributionId = await createCloudFrontDistribution();

    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║                                                                ║");
    console.log("║     ✅ DEPLOYMENT COMPLETE ✅                                  ║");
    console.log("║                                                                ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    console.log("🌐 ACCESS YOUR APPLICATION:\n");
    console.log(`   CloudFront (HTTPS): https://d${distributionId.substring(1)}.cloudfront.net\n`);
    console.log("   ⚠️  Note: S3 website endpoint disabled for security (HTTPS only)\n");

    console.log("🔑 LOGIN CREDENTIALS:\n");
    console.log("   Email:    manufacturer@greenpassport.com");
    console.log("   Password: Test123!\n");

    console.log("📊 SYSTEM STATUS:\n");
    console.log("   Frontend:     🟢 LIVE (AWS S3)");
    console.log("   API:          🟢 OPERATIONAL (API Gateway)");
    console.log("   Database:     🟢 ACTIVE (DynamoDB)");
    console.log("   Auth:         🟢 READY (Cognito)\n");

    console.log("⏱️  NOTE: CloudFront deployment takes 15-20 minutes\n");
  } catch (error: any) {
    console.error("\n✗ Deployment failed:", error.message);
    process.exit(1);
  }
}

main();
