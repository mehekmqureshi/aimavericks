/**
 * Apply All Audit Fixes
 * Executes all infrastructure fixes automatically
 */

import { execSync } from 'child_process';

const fixes = [
  {
    name: 'Configure Lambda Environment Variables',
    script: 'tsx infrastructure/configure-lambda-env.ts',
    critical: true,
  },
  {
    name: 'Configure S3 CORS',
    script: 'tsx infrastructure/configure-s3-cors.ts',
    critical: true,
  },
  {
    name: 'Configure S3 Lifecycle Policies',
    script: 'tsx infrastructure/configure-s3-lifecycle.ts',
    critical: false,
  },
  {
    name: 'Setup CloudWatch Alarms',
    script: 'tsx infrastructure/setup-cloudwatch-alarms.ts',
    critical: false,
  },
];

async function applyFixes() {
  console.log('🔧 APPLYING ALL AUDIT FIXES\n');
  console.log('═'.repeat(60));
  console.log('\n');

  let successCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  for (const fix of fixes) {
    console.log(`\n📋 ${fix.name}`);
    console.log('─'.repeat(60));
    
    try {
      execSync(fix.script, { stdio: 'inherit' });
      console.log(`✅ ${fix.name} - SUCCESS\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${fix.name} - FAILED\n`);
      failCount++;
      failures.push(fix.name);
      
      if (fix.critical) {
        console.error('⚠️  CRITICAL FIX FAILED - Stopping execution\n');
        break;
      }
    }
  }

  console.log('\n═'.repeat(60));
  console.log('\n📊 FIXES SUMMARY\n');
  console.log(`  ✅ Success: ${successCount}/${fixes.length}`);
  console.log(`  ❌ Failed: ${failCount}/${fixes.length}`);
  
  if (failures.length > 0) {
    console.log('\n  Failed fixes:');
    failures.forEach(f => console.log(`    - ${f}`));
  }

  console.log('\n═'.repeat(60));
  
  if (failCount === 0) {
    console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY!\n');
    console.log('Next steps:');
    console.log('  1. Rebuild and redeploy aiGenerate Lambda');
    console.log('  2. Test AI generation endpoint');
    console.log('  3. Verify CORS configuration');
    console.log('  4. Monitor CloudWatch alarms\n');
  } else {
    console.log('\n⚠️  SOME FIXES FAILED\n');
    console.log('Please review the errors above and apply fixes manually.\n');
    process.exit(1);
  }
}

applyFixes().catch(console.error);
