// Debug regex patterns

const testInputs = [
  'PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
  'https://example.com/product/PROD-a1b2c3d4-e5f6-7890-abcd-ef1234567890-0001',
  'PROD001-0001'
];

console.log('Testing regex patterns:\n');

testInputs.forEach(input => {
  console.log(`Input: "${input}"`);
  
  // Test URL regex
  const urlMatch1 = input.match(/\/product\/([A-Z0-9][A-Z0-9\-]*)/);
  console.log(`  URL regex 1: ${urlMatch1 ? urlMatch1[1] : 'null'}`);
  
  const urlMatch2 = input.match(/\/product\/([A-Z0-9\-]+)/);
  console.log(`  URL regex 2: ${urlMatch2 ? urlMatch2[1] : 'null'}`);
  
  const urlMatch3 = input.match(/\/product\/(.+?)(?:\s|$)/);
  console.log(`  URL regex 3: ${urlMatch3 ? urlMatch3[1] : 'null'}`);
  
  const urlMatch4 = input.match(/\/product\/([^\s]+)/);
  console.log(`  URL regex 4: ${urlMatch4 ? urlMatch4[1] : 'null'}`);
  
  // Test plain serial regex
  const serialMatch1 = input.match(/^[A-Z0-9]+[A-Z0-9\-]*[A-Z0-9]+$/);
  console.log(`  Serial regex 1: ${serialMatch1 ? serialMatch1[0] : 'null'}`);
  
  const serialMatch2 = input.match(/^[A-Z0-9\-]+$/);
  console.log(`  Serial regex 2: ${serialMatch2 ? serialMatch2[0] : 'null'}`);
  
  const serialMatch3 = input.match(/^[A-Z0-9]+(-[A-Z0-9]+)+$/);
  console.log(`  Serial regex 3: ${serialMatch3 ? serialMatch3[0] : 'null'}`);
  
  console.log('');
});
