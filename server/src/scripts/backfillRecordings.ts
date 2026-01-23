/**
 * Utility Script: Backfill Missing Call Recordings
 * 
 * This script helps attach Twilio call recordings to existing Communications
 * that may have missed the recording callback or had CallSID mismatches.
 * 
 * Usage:
 *   npm run backfill-recordings -- --callSid CA123... --recordingSid RE123...
 *   npm run backfill-recordings -- --phone +17049620868 --recordingSid RE123...
 *   npm run backfill-recordings -- --leadId abc-123 --recordingSid RE123...
 *   npm run backfill-recordings -- --list-missing
 */

import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import twilio from 'twilio';

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

interface BackfillOptions {
  callSid?: string;
  recordingSid?: string;
  phone?: string;
  leadId?: string;
  listMissing?: boolean;
  dryRun?: boolean;
}

/**
 * Find Communications that are missing recordings
 */
async function findMissingRecordings() {
  console.log('🔍 Searching for Communications missing recordings...\n');

  // Find OUTBOUND calls from the last 7 days without recordings
  const missingRecordings = await prisma.communication.findMany({
    where: {
      type: 'CALL',
      direction: 'OUTBOUND',
      occurredAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      },
      OR: [
        { metadata: { path: ['recordingSid'], equals: null } },
        { metadata: { path: ['recordingSid'], equals: '' } }
      ]
    },
    include: {
      lead: {
        include: {
          address: true
        }
      },
      createdBy: true
    },
    orderBy: { occurredAt: 'desc' },
    take: 50
  });

  if (missingRecordings.length === 0) {
    console.log('✅ No missing recordings found in the last 7 days.');
    return;
  }

  console.log(`Found ${missingRecordings.length} Communications without recordings:\n`);

  for (const comm of missingRecordings) {
    const metadata = comm.metadata as any;
    const callSid = metadata?.callSid || 'N/A';
    const to = metadata?.to || 'Unknown';
    const address = comm.lead?.address?.address1 || 'Unknown address';

    console.log(`📞 Communication ID: ${comm.id}`);
    console.log(`   Lead: ${address}`);
    console.log(`   Date: ${comm.occurredAt.toISOString()}`);
    console.log(`   To: ${to}`);
    console.log(`   CallSID: ${callSid}`);
    console.log(`   User: ${comm.createdBy?.firstName} ${comm.createdBy?.lastName}`);
    console.log('');
  }

  console.log('\n💡 To backfill a recording, use:');
  console.log('   npm run backfill-recordings -- --callSid CA123... --recordingSid RE123...');
  console.log('   OR');
  console.log('   npm run backfill-recordings -- --phone +17049620868 --recordingSid RE123...\n');
}

/**
 * Fetch recording details from Twilio
 */
async function fetchRecordingFromTwilio(recordingSid: string) {
  try {
    const recording = await twilioClient.recordings(recordingSid).fetch();
    return {
      callSid: recording.callSid,
      recordingSid: recording.sid,
      recordingUrl: recording.uri,
      recordingDuration: parseInt(recording.duration || '0'),
      recordingSource: recording.source || 'DialVerb',
      dateCreated: recording.dateCreated
    };
  } catch (error: any) {
    console.error(`❌ Error fetching recording ${recordingSid}:`, error.message);
    return null;
  }
}

/**
 * Backfill a recording to a Communication
 */
async function backfillRecording(options: BackfillOptions) {
  const { callSid, recordingSid, phone, leadId, dryRun = false } = options;

  if (!recordingSid) {
    console.error('❌ Error: --recordingSid is required');
    return;
  }

  console.log('🔍 Fetching recording details from Twilio...');
  const recordingData = await fetchRecordingFromTwilio(recordingSid);

  if (!recordingData) {
    console.error('❌ Could not fetch recording from Twilio. Check RecordingSID.');
    return;
  }

  console.log('✅ Recording found in Twilio:');
  console.log(`   CallSID: ${recordingData.callSid}`);
  console.log(`   Duration: ${recordingData.recordingDuration}s`);
  console.log(`   Date: ${recordingData.dateCreated}`);
  console.log('');

  // Search for matching Communication
  let communication = null;

  // Option 1: Search by CallSID
  if (callSid || recordingData.callSid) {
    const searchCallSid = callSid || recordingData.callSid;
    console.log(`🔍 Searching for Communication with CallSID: ${searchCallSid}...`);
    
    communication = await prisma.communication.findFirst({
      where: {
        type: 'CALL',
        metadata: { path: ['callSid'], equals: searchCallSid }
      },
      include: {
        lead: { include: { address: true } },
        createdBy: true
      }
    });
  }

  // Option 2: Search by phone number
  if (!communication && phone) {
    const phoneNormalized = phone.replace(/[\s\(\)\-]/g, '');
    console.log(`🔍 Searching for Communication with phone: ${phone}...`);
    
    // Search within recording date ±30 minutes for better matching
    const recordingDate = new Date(recordingData.dateCreated);
    const startTime = new Date(recordingDate.getTime() - 30 * 60 * 1000);
    const endTime = new Date(recordingDate.getTime() + 30 * 60 * 1000);

    communication = await prisma.communication.findFirst({
      where: {
        type: 'CALL',
        direction: 'OUTBOUND',
        occurredAt: {
          gte: startTime,
          lte: endTime
        },
        OR: [
          { metadata: { path: ['to'], string_contains: phoneNormalized.slice(-10) } },
          { subject: { contains: phoneNormalized.slice(-10) } }
        ]
      },
      include: {
        lead: { include: { address: true } },
        createdBy: true
      },
      orderBy: { occurredAt: 'desc' }
    });
  }

  // Option 3: Search by leadId
  if (!communication && leadId) {
    console.log(`🔍 Searching for Communication in Lead: ${leadId}...`);
    
    const recordingDate = new Date(recordingData.dateCreated);
    const startTime = new Date(recordingDate.getTime() - 30 * 60 * 1000);
    const endTime = new Date(recordingDate.getTime() + 30 * 60 * 1000);

    communication = await prisma.communication.findFirst({
      where: {
        type: 'CALL',
        leadId: leadId,
        occurredAt: {
          gte: startTime,
          lte: endTime
        }
      },
      include: {
        lead: { include: { address: true } },
        createdBy: true
      },
      orderBy: { occurredAt: 'desc' }
    });
  }

  if (!communication) {
    console.error('❌ Could not find matching Communication record.');
    console.log('\n💡 Try using different search criteria:');
    console.log('   --callSid (parent or child CallSID)');
    console.log('   --phone (phone number that was called)');
    console.log('   --leadId (lead ID)');
    return;
  }

  console.log('✅ Found matching Communication:');
  console.log(`   ID: ${communication.id}`);
  console.log(`   Lead: ${communication.lead?.address?.address1 || 'Unknown'}`);
  console.log(`   Date: ${communication.occurredAt.toISOString()}`);
  console.log(`   Direction: ${communication.direction}`);
  console.log(`   User: ${communication.createdBy?.firstName} ${communication.createdBy?.lastName}`);
  console.log('');

  const existingMetadata = (communication.metadata as any) || {};
  const existingRecordingSid = existingMetadata.recordingSid;

  if (existingRecordingSid && existingRecordingSid !== recordingSid) {
    console.warn(`⚠️  Warning: Communication already has a different recording: ${existingRecordingSid}`);
    console.log('   The new recording will replace the existing one.');
  }

  if (dryRun) {
    console.log('\n🔵 DRY RUN - No changes made.');
    console.log('   Remove --dry-run to apply changes.');
    return;
  }

  // Update the Communication with recording data
  console.log('💾 Attaching recording to Communication...');

  await prisma.communication.update({
    where: { id: communication.id },
    data: {
      metadata: {
        ...existingMetadata,
        callSid: recordingData.callSid,
        recordingSid: recordingData.recordingSid,
        recordingUrl: recordingData.recordingUrl,
        recordingDuration: recordingData.recordingDuration,
        recordingSource: recordingData.recordingSource,
        backfilled: true,
        backfilledAt: new Date().toISOString()
      }
    }
  });

  console.log('✅ Recording successfully attached!');
  console.log(`\n🎉 You can now view the recording in the CRM for Lead ID: ${communication.leadId}`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    dryRun: args.includes('--dry-run')
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--callSid' && args[i + 1]) {
      options.callSid = args[i + 1];
      i++;
    } else if (args[i] === '--recordingSid' && args[i + 1]) {
      options.recordingSid = args[i + 1];
      i++;
    } else if (args[i] === '--phone' && args[i + 1]) {
      options.phone = args[i + 1];
      i++;
    } else if (args[i] === '--leadId' && args[i + 1]) {
      options.leadId = args[i + 1];
      i++;
    } else if (args[i] === '--list-missing') {
      options.listMissing = true;
    }
  }

  console.log('\n📼 Call Recording Backfill Utility\n');
  console.log('='.repeat(60) + '\n');

  if (options.listMissing) {
    await findMissingRecordings();
  } else if (options.recordingSid) {
    await backfillRecording(options);
  } else {
    console.log('Usage:');
    console.log('  List missing recordings:');
    console.log('    npm run backfill-recordings -- --list-missing\n');
    console.log('  Backfill by CallSID:');
    console.log('    npm run backfill-recordings -- --callSid CA123... --recordingSid RE123...\n');
    console.log('  Backfill by phone number:');
    console.log('    npm run backfill-recordings -- --phone +17049620868 --recordingSid RE123...\n');
    console.log('  Backfill by Lead ID:');
    console.log('    npm run backfill-recordings -- --leadId abc-123 --recordingSid RE123...\n');
    console.log('  Dry run (preview without changes):');
    console.log('    npm run backfill-recordings -- --phone +1234567890 --recordingSid RE123... --dry-run\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

