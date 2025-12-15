// Script to add Twilio phone number to a user
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function addTwilioNumber() {
  try {
    console.log('=== Adding Twilio Phone Number to User ===\n');

    // Get the first admin user (or you can specify an email)
    const user = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: {
              name: 'ADMIN'
            }
          }
        }
      }
    });

    if (!user) {
      console.error('❌ No admin user found. Please create a user first.');
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // Add or update SMS settings with Twilio number
    const twilioNumber = '+17752548172'; // Your Twilio number

    const smsSettings = await prisma.userSmsSettings.upsert({
      where: {
        userId: user.id
      },
      update: {
        phoneNumber: twilioNumber,
        displayName: 'My Twilio Number',
        active: true
      },
      create: {
        userId: user.id,
        phoneNumber: twilioNumber,
        displayName: 'My Twilio Number',
        active: true
      }
    });

    console.log('\n✅ Twilio number added successfully!');
    console.log('User:', user.email);
    console.log('Phone Number:', smsSettings.phoneNumber);
    console.log('Status:', smsSettings.active ? 'Active' : 'Inactive');
    console.log('\nYou can now send SMS and make calls from your CRM!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTwilioNumber();

