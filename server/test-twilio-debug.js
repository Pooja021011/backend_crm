// Test script to verify Twilio integration
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

console.log('=== Twilio Configuration Test ===\n');

// Test 1: Check environment variables
console.log('1. Environment Variables:');
console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'NOT SET');
console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
console.log('   APP_BASE_URL:', process.env.APP_BASE_URL || 'NOT SET');
console.log('');

// Test 2: Initialize Twilio client
console.log('2. Twilio Client Initialization:');
try {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('   ✓ Client initialized successfully');
  console.log('   Client type:', typeof client);
  console.log('   Has messages API:', typeof client.messages);
  console.log('   Has calls API:', typeof client.calls);
  console.log('');

  // Test 3: Verify credentials by fetching account info
  console.log('3. Testing Credentials (fetching account info):');
  const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
  console.log('   ✓ Credentials are VALID');
  console.log('   Account SID:', account.sid);
  console.log('   Account Status:', account.status);
  console.log('   Account Type:', account.type);
  console.log('');

  // Test 4: List available phone numbers
  console.log('4. Available Phone Numbers:');
  const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
  if (phoneNumbers.length === 0) {
    console.log('   ⚠ No phone numbers found. You need to buy a phone number from Twilio Console.');
  } else {
    console.log(`   ✓ Found ${phoneNumbers.length} phone number(s):`);
    phoneNumbers.forEach((number, idx) => {
      console.log(`   ${idx + 1}. ${number.phoneNumber} (${number.friendlyName})`);
      console.log(`      - SMS: ${number.capabilities.sms ? '✓' : '✗'}`);
      console.log(`      - Voice: ${number.capabilities.voice ? '✓' : '✗'}`);
    });
  }
  console.log('');

  console.log('=== ✓ ALL TESTS PASSED ===');
  console.log('Your Twilio integration is configured correctly!');
  
} catch (error) {
  console.error('   ✗ ERROR:', error.message);
  if (error.code) {
    console.error('   Error Code:', error.code);
  }
  if (error.status) {
    console.error('   HTTP Status:', error.status);
  }
  if (error.moreInfo) {
    console.error('   More Info:', error.moreInfo);
  }
  console.log('');
  console.log('=== ✗ TEST FAILED ===');
  console.log('Please check your Twilio credentials in the .env file');
  process.exit(1);
}

