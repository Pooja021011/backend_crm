// Test script to send MMS via Twilio
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

console.log('=== Twilio MMS Test ===\n');

// Get numbers from command line or fetch from Twilio
// Usage: node test-mms-send.js <to_number> [media_url1] [media_url2] ...
// Or:    node test-mms-send.js <from_number> <to_number> [media_url1] [media_url2] ...
let fromNumber = null;
let toNumber = '+19107485320';
let mediaUrls = [];

// Parse arguments - collect all media URLs
if (process.argv[2]) {
  // If first arg looks like a phone number (starts with +)
  if (process.argv[2].startsWith('+')) {
    // If second arg also exists and is a phone number, first is fromNumber
    if (process.argv[3] && process.argv[3].startsWith('+')) {
      fromNumber = process.argv[2];
      toNumber = process.argv[3];
      // Collect all remaining args as media URLs
      mediaUrls = process.argv.slice(4);
    } else {
      // Only one phone number provided, it's the toNumber
      toNumber = process.argv[2];
      // Collect all remaining args as media URLs
      mediaUrls = process.argv.slice(3);
    }
  } else {
    // First arg is not a phone number, treat as toNumber anyway
    toNumber = process.argv[2];
    // Collect all remaining args as media URLs
    mediaUrls = process.argv.slice(3);
  }
}

// Default media if none provided
if (mediaUrls.length === 0) {
  mediaUrls = ['https://picsum.photos/400/300'];
}

// If fromNumber not provided, fetch from Twilio
if (!fromNumber) {
  try {
    console.log('📞 Fetching available Twilio numbers...');
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
    if (phoneNumbers.length > 0) {
      fromNumber = phoneNumbers[0].phoneNumber;
      console.log(`✅ Using Twilio number: ${fromNumber}`);
      console.log(`   SMS: ${phoneNumbers[0].capabilities.sms ? '✅' : '❌'}`);
      console.log(`   MMS: ${phoneNumbers[0].capabilities.mms ? '✅' : '❌'}`);
      if (!phoneNumbers[0].capabilities.mms) {
        console.log('\n⚠️  WARNING: This number does NOT have MMS capability!');
        console.log('   You need to purchase an MMS-capable number from Twilio.');
      }
    } else {
      console.error('❌ No phone numbers found in your Twilio account!');
      console.log('   Please purchase a phone number from Twilio Console first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error fetching phone numbers:', error.message);
    console.log('\n💡 Please provide the from number manually:');
    console.log('   node test-mms-send.js <from_number> <to_number> <image_url>');
    process.exit(1);
  }
}

console.log(`FROM: ${fromNumber}`);
console.log(`TO: ${toNumber}`);
console.log(`MEDIA URLs (${mediaUrls.length}):`);
mediaUrls.forEach((url, idx) => {
  console.log(`  ${idx + 1}. ${url}`);
});
console.log('\nSending MMS...\n');

try {
  const message = await twilioClient.messages.create({
    from: fromNumber,
    to: toNumber,
    body: `Test MMS from Real Estate CRM 🏠📸 (${mediaUrls.length} attachment${mediaUrls.length > 1 ? 's' : ''})`,
    mediaUrl: mediaUrls // Twilio accepts array of media URLs
  });

  console.log('✅ MMS SENT SUCCESSFULLY!');
  console.log('\nMessage Details:');
  console.log('  SID:', message.sid);
  console.log('  Status:', message.status);
  console.log('  Direction:', message.direction);
  console.log('  Date Created:', message.dateCreated);
  console.log('  Num Media:', message.numMedia);
  console.log('  Media URLs:', message.subresourceUris?.media || 'N/A');
  console.log('\n📱 Check your phone for the MMS!');
  console.log('\n📋 Next Steps:');
  console.log('  1. Check if MMS was received with all attachments');
  console.log('  2. Check server logs for webhook');
  console.log('  3. Check lead detail page for image/PDF display');
  
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
  console.log('  - Make sure your Twilio number has MMS capability');
  console.log('  - Image URL must be publicly accessible (HTTPS)');
  console.log('  - Use E.164 format: +1234567890');
  console.log('  - Check your Twilio account has credit');
  console.log('  - For trial accounts, recipient must be verified');
  process.exit(1);
}

