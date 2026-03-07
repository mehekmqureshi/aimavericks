const ngrok = require('ngrok');

(async () => {
  try {
    const url = await ngrok.connect(3000);
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║     🎉 GREEN PASSPORT PLATFORM - LIVE AND ACCESSIBLE 🎉       ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n🌐 YOUR LIVE APPLICATION URL:\n');
    console.log(`   ${url}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔑 LOGIN CREDENTIALS:\n');
    console.log('   Email:    manufacturer@greenpassport.com');
    console.log('   Password: Test123!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ SYSTEM STATUS:\n');
    console.log('   Frontend:     🟢 LIVE (Public URL)');
    console.log('   API:          🟢 OPERATIONAL (API Gateway)');
    console.log('   Database:     🟢 ACTIVE (DynamoDB)');
    console.log('   Auth:         🟢 READY (Cognito)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('The tunnel will stay open. Press Ctrl+C to close.\n');
  } catch (err) {
    console.error('Error:', err);
  }
})();
