// Bundle generateQR Lambda using esbuild
const esbuild = require('esbuild');
const path = require('path');

async function bundle() {
  try {
    console.log('Bundling generateQR Lambda...');
    
    await esbuild.build({
      entryPoints: ['backend/lambdas/generateQR.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: 'dist/lambdas/generateQR/index.js',
      external: [], // Bundle everything including AWS SDK
      sourcemap: false,
      minify: true,
      format: 'cjs',
    });
    
    console.log('✓ Bundle created successfully');
  } catch (error) {
    console.error('✗ Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
