import { Request, Response } from 'express';
import { docusignService } from '../services/docusignService.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import fs from 'fs';
import path from 'path';

export const docusignTestController = {
  /**
   * Test DocuSign configuration and credentials
   */
  async testConfiguration(req: Request, res: Response) {
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    try {
      // 1. Check environment variables
      results.checks.push({
        name: 'Environment Variables',
        status: 'checking',
        details: {
          DOCUSIGN_BASE_PATH: env.DOCUSIGN_BASE_PATH,
          DOCUSIGN_INTEGRATION_KEY: env.DOCUSIGN_INTEGRATION_KEY ? '✅ Set' : '❌ Missing',
          DOCUSIGN_USER_ID: env.DOCUSIGN_USER_ID ? '✅ Set' : '❌ Missing',
          DOCUSIGN_ACCOUNT_ID: env.DOCUSIGN_ACCOUNT_ID ? '✅ Set' : '❌ Missing',
          DOCUSIGN_TEMPLATE_ID: env.DOCUSIGN_TEMPLATE_ID ? '✅ Set' : '❌ Missing',
          DOCUSIGN_WEBHOOK_SECRET: env.DOCUSIGN_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing',
          CONTRACT_EXPIRATION_DAYS: env.CONTRACT_EXPIRATION_DAYS
        }
      });

      const missingVars = [];
      if (!env.DOCUSIGN_INTEGRATION_KEY) missingVars.push('DOCUSIGN_INTEGRATION_KEY');
      if (!env.DOCUSIGN_USER_ID) missingVars.push('DOCUSIGN_USER_ID');
      if (!env.DOCUSIGN_ACCOUNT_ID) missingVars.push('DOCUSIGN_ACCOUNT_ID');
      if (!env.DOCUSIGN_TEMPLATE_ID) missingVars.push('DOCUSIGN_TEMPLATE_ID');

      if (missingVars.length > 0) {
        results.checks[0].status = '❌ Failed';
        results.checks[0].error = `Missing variables: ${missingVars.join(', ')}`;
      } else {
        results.checks[0].status = '✅ Passed';
      }

      // 2. Check private key file
      const privateKeyPath = path.resolve(process.cwd(), env.DOCUSIGN_PRIVATE_KEY_PATH);
      results.checks.push({
        name: 'Private Key File',
        status: 'checking',
        path: privateKeyPath
      });

      if (fs.existsSync(privateKeyPath)) {
        const keyContent = fs.readFileSync(privateKeyPath, 'utf8');
        const isValid = keyContent.includes('BEGIN RSA PRIVATE KEY') || keyContent.includes('BEGIN PRIVATE KEY');
        
        if (isValid) {
          results.checks[1].status = '✅ Passed';
          results.checks[1].details = {
            exists: true,
            size: `${keyContent.length} bytes`,
            format: 'Valid RSA key format'
          };
        } else {
          results.checks[1].status = '❌ Failed';
          results.checks[1].error = 'Invalid key format';
        }
      } else {
        results.checks[1].status = '❌ Failed';
        results.checks[1].error = 'File not found';
      }

      // 3. Test DocuSign authentication
      if (missingVars.length === 0) {
        results.checks.push({
          name: 'DocuSign Authentication',
          status: 'checking'
        });

        try {
          const accessToken = await docusignService.getAccessToken();
          results.checks[2].status = '✅ Passed';
          results.checks[2].details = {
            tokenReceived: true,
            tokenLength: accessToken.length,
            tokenPreview: `${accessToken.substring(0, 20)}...`
          };
        } catch (error: any) {
          results.checks[2].status = '❌ Failed';
          results.checks[2].error = error.message;
          results.checks[2].details = {
            errorType: error.name,
            message: error.message
          };
        }
      }

      // 4. Overall status
      const allPassed = results.checks.every((check: any) => check.status === '✅ Passed');
      results.overallStatus = allPassed ? '✅ All checks passed' : '❌ Some checks failed';
      results.ready = allPassed;

      return res.json(results);

    } catch (error: any) {
      logger.error('DocuSign test failed', { error: error.message });
      return res.status(500).json({
        error: 'Test failed',
        message: error.message,
        results
      });
    }
  },

  /**
   * Test sending a DocuSign envelope to a specific lead
   */
  async testSendEnvelope(req: Request, res: Response) {
    try {
      const { leadId } = req.params;

      if (!leadId) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }

      logger.info('Testing DocuSign envelope creation', { leadId });

      const result = await docusignService.createAndSendEnvelopeFromTemplate(leadId);

      return res.json({
        success: true,
        message: 'DocuSign envelope created and sent successfully',
        data: {
          envelopeId: result.envelopeId,
          status: result.status,
          sentAt: result.sentAt,
          voidAt: result.voidAt
        }
      });

    } catch (error: any) {
      logger.error('DocuSign test envelope failed', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to send test envelope',
        message: error.message,
        details: error.stack
      });
    }
  }
};

























