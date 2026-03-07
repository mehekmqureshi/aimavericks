import { CloudFrontClient, CreateDistributionCommand, GetDistributionCommand, ListDistributionsCommand } from "@aws-sdk/client-cloudfront";

const cloudFrontClient = new CloudFrontClient({ region: "us-east-1" });
const frontendBucket = process.env.FRONTEND_BUCKET || "gp-frontend-aimavericks-2026";

async function checkExistingDistribution(): Promise<string | null> {
  try {
    const result = await cloudFrontClient.send(new ListDistributionsCommand({}));
    const dist = result.DistributionList?.Items?.find(
      (d) => d.Origins?.Items?.[0]?.DomainName?.includes(frontendBucket)
    );
    return dist?.Id || null;
  } catch (error) {
    return null;
  }
}

async function createDistribution(): Promise<string> {
  console.log(`Creating CloudFront distribution for ${frontendBucket}...`);

  const distributionConfig = {
    CallerReference: Date.now().toString(),
    Comment: "Green Passport Frontend Distribution",
    DefaultRootObject: "index.html",
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: "S3Origin",
          DomainName: `${frontendBucket}.s3.amazonaws.com`,
          S3OriginConfig: {
            OriginAccessIdentity: "",
          },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: "S3Origin",
      ViewerProtocolPolicy: "redirect-to-https",
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

    console.log(`✓ CloudFront distribution created successfully`);
    console.log(`  Distribution ID: ${distributionId}`);
    console.log(`  Domain Name: ${domainName}`);
    console.log(`  Status: ${result.Distribution?.Status}`);
    console.log(`\n✓ Frontend URL: https://${domainName}`);
    console.log(`\nNote: Distribution deployment may take 15-20 minutes to complete.`);

    return distributionId || "";
  } catch (error: any) {
    console.error("✗ Failed to create distribution:", error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log(`\nDeploying CloudFront distribution for: ${frontendBucket}\n`);

    const existingId = await checkExistingDistribution();
    if (existingId) {
      console.log(`✓ Distribution already exists: ${existingId}`);
      const result = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: existingId })
      );
      console.log(`  Domain: https://${result.Distribution?.DomainName}`);
      return;
    }

    await createDistribution();
  } catch (error: any) {
    console.error("\n✗ Deployment failed:", error.message);
    process.exit(1);
  }
}

main();
