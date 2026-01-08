#!/usr/bin/env node

/**
 * Diagnostic script to check and fix user phone settings
 * 
 * Usage:
 *   node check-user-phone-settings.js
 *   node check-user-phone-settings.js --fix-towe +15551234567
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllUsers() {
  console.log('\n📋 Checking all users phone settings...\n');
  
  const users = await prisma.user.findMany({
    include: {
      smsSettings: true
    },
    orderBy: {
      firstName: 'asc'
    }
  });

  console.table(users.map(u => ({
    Name: `${u.firstName} ${u.lastName}`,
    Email: u.email,
    Phone: u.smsSettings?.phoneNumber || 'NOT SET',
    Active: u.smsSettings?.active ? '✅' : '❌',
    LastUpdated: u.smsSettings?.updatedAt?.toISOString() || 'Never'
  })));

  return users;
}

async function checkDuplicateNumbers() {
  console.log('\n⚠️  Checking for duplicate phone numbers...\n');
  
  const duplicates = await prisma.$queryRaw`
    SELECT 
      "phoneNumber", 
      COUNT(*) as count,
      STRING_AGG("User"."firstName" || ' ' || "User"."lastName", ', ') as users
    FROM "UserSmsSettings"
    JOIN "User" ON "UserSmsSettings"."userId" = "User".id
    WHERE "UserSmsSettings".active = true AND "UserSmsSettings"."phoneNumber" IS NOT NULL
    GROUP BY "phoneNumber"
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length > 0) {
    console.log('❌ Found duplicate phone numbers:');
    console.table(duplicates);
    return true;
  } else {
    console.log('✅ No duplicate phone numbers found');
    return false;
  }
}

async function checkSpecificUser(firstName) {
  console.log(`\n🔍 Checking settings for user: ${firstName}...\n`);
  
  const user = await prisma.user.findFirst({
    where: {
      firstName: {
        equals: firstName,
        mode: 'insensitive'
      }
    },
    include: {
      smsSettings: true
    }
  });

  if (!user) {
    console.log(`❌ User "${firstName}" not found`);
    return null;
  }

  console.log('User Details:');
  console.log('  ID:', user.id);
  console.log('  Name:', `${user.firstName} ${user.lastName}`);
  console.log('  Email:', user.email);
  console.log('  Roles:', user.roles?.join(', ') || 'None');
  
  console.log('\nPhone Settings:');
  if (user.smsSettings) {
    console.log('  Phone Number:', user.smsSettings.phoneNumber);
    console.log('  Active:', user.smsSettings.active ? '✅ Yes' : '❌ No');
    console.log('  Display Name:', user.smsSettings.displayName || 'Not set');
    console.log('  Last Updated:', user.smsSettings.updatedAt.toISOString());
  } else {
    console.log('  ❌ No phone settings configured');
  }

  return user;
}

async function fixUserPhone(firstName, phoneNumber) {
  console.log(`\n🔧 Fixing phone settings for ${firstName}...\n`);
  
  const user = await checkSpecificUser(firstName);
  
  if (!user) {
    return;
  }

  // Normalize to E.164 format
  let normalizedPhone = phoneNumber.trim();
  if (!normalizedPhone.startsWith('+')) {
    const digits = normalizedPhone.replace(/\D/g, '');
    if (digits.length === 10) {
      normalizedPhone = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      normalizedPhone = `+${digits}`;
    } else {
      normalizedPhone = `+${digits}`;
    }
  }

  console.log(`Setting phone to: ${normalizedPhone}`);

  const updated = await prisma.userSmsSettings.upsert({
    where: {
      userId: user.id
    },
    create: {
      userId: user.id,
      phoneNumber: normalizedPhone,
      active: true,
      displayName: `${user.firstName} ${user.lastName}`,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    update: {
      phoneNumber: normalizedPhone,
      active: true,
      updatedAt: new Date()
    }
  });

  console.log('\n✅ Phone settings updated successfully!');
  console.log('New settings:', updated);
}

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--fix-towe') && args.length >= 2) {
      const phoneIndex = args.indexOf('--fix-towe') + 1;
      const phone = args[phoneIndex];
      await fixUserPhone('Towe', phone);
    } else if (args.includes('--check-towe')) {
      await checkSpecificUser('Towe');
    } else if (args.includes('--check-tim')) {
      await checkSpecificUser('Tim');
    } else {
      // Default: show all users and check for duplicates
      await checkAllUsers();
      await checkDuplicateNumbers();
      
      console.log('\n💡 Usage examples:');
      console.log('  node check-user-phone-settings.js --check-towe');
      console.log('  node check-user-phone-settings.js --fix-towe +15551234567');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
