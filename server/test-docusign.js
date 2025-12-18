/**
 * DocuSign Integration Test Script
 * 
 * This script tests the DocuSign integration by:
 * 1. Checking configuration and credentials
 * 2. Testing authentication
 * 3. Optionally sending a test envelope to a lead
 * 
 * Usage:
 *   node test-docusign.js                    # Test configuration only
 *   node test-docusign.js <leadId>           # Test configuration + send envelope
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const TEST_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Authenticate and get access token
 */
async function authenticate() {
  try {
    logInfo('Authenticating...');
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.accessToken) {
      logSuccess('Authentication successful');
      return response.data.accessToken;
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    logError('Authentication failed');
    if (error.response) {
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

/**
 * Test DocuSign configuration
 */
async function testConfiguration(token) {
  logSection('Testing DocuSign Configuration');

  try {
    const response = await axios.get(`${API_URL}/api/v1/docusign/test/config`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const results = response.data;

    // Display timestamp
    logInfo(`Test run at: ${new Date(results.timestamp).toLocaleString()}`);
    console.log();

    // Display each check
    for (const check of results.checks) {
      console.log(`\n${colors.bright}${check.name}:${colors.reset}`);
      console.log(`Status: ${check.status}`);

      if (check.details) {
        console.log('Details:');
        for (const [key, value] of Object.entries(check.details)) {
          if (typeof value === 'object') {
            console.log(`  ${key}:`, JSON.stringify(value, null, 2));
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      }

      if (check.error) {
        logError(`Error: ${check.error}`);
      }

      if (check.path) {
        logInfo(`Path: ${check.path}`);
      }
    }

    // Display overall status
    console.log();
    console.log('─'.repeat(60));
    if (results.ready) {
      logSuccess(`Overall Status: ${results.overallStatus}`);
      logSuccess('DocuSign is ready to use! 🎉');
    } else {
      logWarning(`Overall Status: ${results.overallStatus}`);
      logWarning('Please fix the issues above before using DocuSign');
    }
    console.log('─'.repeat(60));

    return results.ready;

  } catch (error) {
    logError('Configuration test failed');
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

/**
 * Test sending a DocuSign envelope to a lead
 */
async function testSendEnvelope(token, leadId) {
  logSection(`Testing DocuSign Envelope Send (Lead ID: ${leadId})`);

  try {
    logInfo('Fetching lead details...');
    
    // First, get lead details to show what we're working with
    const leadResponse = await axios.get(`${API_URL}/api/v1/leads/${leadId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const lead = leadResponse.data;
    console.log();
    log('Lead Information:', 'bright');
    console.log(`  ID: ${lead.id}`);
    console.log(`  Seller: ${lead.seller?.firstName} ${lead.seller?.lastName}`);
    console.log(`  Email: ${lead.seller?.email || 'N/A'}`);
    console.log(`  Property: ${lead.address?.address1 || 'N/A'}`);
    console.log(`  Status: ${lead.status}`);
    console.log();

    if (!lead.seller?.email) {
      logError('Lead does not have a seller email. Cannot send DocuSign envelope.');
      return false;
    }

    logInfo('Sending DocuSign envelope...');
    
    const response = await axios.post(
      `${API_URL}/api/v1/docusign/test/send/${leadId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const result = response.data;

    if (result.success) {
      console.log();
      logSuccess('DocuSign envelope sent successfully! 🎉');
      console.log();
      log('Envelope Details:', 'bright');
      console.log(`  Envelope ID: ${result.data.envelopeId}`);
      console.log(`  Status: ${result.data.status}`);
      console.log(`  Sent At: ${new Date(result.data.sentAt).toLocaleString()}`);
      console.log(`  Expires At: ${new Date(result.data.voidAt).toLocaleString()}`);
      console.log();
      logInfo('The seller should receive an email from DocuSign with the contract to sign.');
      return true;
    } else {
      logError('Failed to send envelope');
      console.error('Result:', result);
      return false;
    }

  } catch (error) {
    logError('Envelope send test failed');
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

/**
 * Display usage instructions
 */
function displayUsage() {
  logSection('DocuSign Test Script - Usage');
  console.log();
  log('Test configuration only:', 'cyan');
  console.log('  node test-docusign.js');
  console.log();
  log('Test configuration + send envelope to a lead:', 'cyan');
  console.log('  node test-docusign.js <leadId>');
  console.log();
  log('Examples:', 'yellow');
  console.log('  node test-docusign.js');
  console.log('  node test-docusign.js cm4xrpxxx0000xxxxx');
  console.log();
  log('Environment Variables Required:', 'magenta');
  console.log('  DOCUSIGN_INTEGRATION_KEY - Your DocuSign integration key');
  console.log('  DOCUSIGN_USER_ID - Your DocuSign user ID (GUID)');
  console.log('  DOCUSIGN_ACCOUNT_ID - Your DocuSign account ID');
  console.log('  DOCUSIGN_TEMPLATE_ID - The template ID to use');
  console.log('  DOCUSIGN_PRIVATE_KEY_PATH - Path to your RSA private key');
  console.log('  DOCUSIGN_BASE_PATH - DocuSign API base path');
  console.log();
}

/**
 * Main test function
 */
async function main() {
  const leadId = process.argv[2];

  // Display header
  console.clear();
  logSection('🔐 DocuSign Integration Test Script');
  console.log();
  logInfo(`API URL: ${API_URL}`);
  logInfo(`Test User: ${TEST_EMAIL}`);
  console.log();

  try {
    // Step 1: Authenticate
    const token = await authenticate();
    console.log();

    // Step 2: Test configuration
    const configOk = await testConfiguration(token);
    console.log();

    if (!configOk) {
      logWarning('Configuration test failed. Please fix the issues before proceeding.');
      process.exit(1);
    }

    // Step 3: Test sending envelope (if lead ID provided)
    if (leadId) {
      const sendOk = await testSendEnvelope(token, leadId);
      console.log();

      if (sendOk) {
        logSuccess('All tests passed! ✨');
        process.exit(0);
      } else {
        logError('Envelope send test failed');
        process.exit(1);
      }
    } else {
      logInfo('To test sending an envelope, provide a lead ID:');
      console.log(`  node test-docusign.js <leadId>`);
      console.log();
      logSuccess('Configuration test completed successfully! ✨');
      process.exit(0);
    }

  } catch (error) {
    console.log();
    logError('Test script failed');
    console.error(error.message);
    console.log();
    displayUsage();
    process.exit(1);
  }
}

// Handle help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  displayUsage();
  process.exit(0);
}

// Run the script
main();

