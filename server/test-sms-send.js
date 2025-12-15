// Test script to send SMS via Twilio
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

console.log('=== Twilio SMS Test ===\n');

// Your Twilio number
const fromNumber = '+17752548172';

// Get recipient number from command line or use default
const toNumber = process.argv[2];

if (!toNumber) {
  console.error('❌ Please provide a recipient phone number!');
  console.log('\nUsage: node test-sms-send.js +1234567890');
  console.log('\nMake sure the number is verified in Twilio Console:');
  console.log('https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
  process.exit(1);
}

console.log(`FROM: ${fromNumber}`);
console.log(`TO: ${toNumber}`);
console.log(`MESSAGE: "Hello from your Real Estate CRM! 🏠 Twilio integration is working!"`);
console.log('\nSending...\n');

try {
  const message = await twilioClient.messages.create({
    from: fromNumber,
    to: toNumber,
    body: 'Hello from your Real Estate CRM! 🏠 Twilio integration is working!'
  });

  console.log('✅ SMS SENT SUCCESSFULLY!');
  console.log('\nMessage Details:');
  console.log('  SID:', message.sid);
  console.log('  Status:', message.status);
  console.log('  Direction:', message.direction);
  console.log('  Date Created:', message.dateCreated);
  console.log('\nCheck your phone for the message!');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  if (error.code) {
    console.error('Error Code:', error.code);
  }
  if (error.status) {
    console.error('HTTP Status:', error.status);
  }
  if (error.moreInfo) {
    console.error('More Info:', error.moreInfo);
  }
  
  console.log('\n💡 Common Issues:');
  console.log('  - Make sure the recipient number is verified in Twilio Console (trial account)');
  console.log('  - Use E.164 format: +1234567890');
  console.log('  - Check your Twilio account has credit');
  process.exit(1);
}

