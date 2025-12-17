import docusign from 'docusign-esign';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';

const SCOPES = ['signature', 'impersonation'];

export interface EnvelopeResult {
  envelopeId: string;
  status: string;
  voidAt: Date;
  sentAt: Date;
}

export const docusignService = {
  /**
   * Get JWT access token for DocuSign API
   */
  async getAccessToken(): Promise<string> {
    try {
      const apiClient = new docusign.ApiClient();
      apiClient.setBasePath(env.DOCUSIGN_BASE_PATH);

      // Read private key
      const privateKeyPath = path.resolve(process.cwd(), env.DOCUSIGN_PRIVATE_KEY_PATH);
      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      // Request JWT token
      const results = await apiClient.requestJWTUserToken(
        env.DOCUSIGN_INTEGRATION_KEY,
        env.DOCUSIGN_USER_ID,
        SCOPES,
        privateKey,
        3600 // 1 hour expiration
      );

      return results.body.access_token;
    } catch (error: any) {
      logger.error('Failed to get DocuSign access token', { error: error.message });
      throw new Error('DocuSign authentication failed');
    }
  },

  /**
   * Initialize DocuSign API client with authentication
   */
  async getApiClient(): Promise<docusign.ApiClient> {
    const accessToken = await this.getAccessToken();
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(env.DOCUSIGN_BASE_PATH);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
    return apiClient;
  },

  /**
   * Create and send envelope from template for a lead
   */
  async createAndSendEnvelopeFromTemplate(leadId: string): Promise<EnvelopeResult> {
    try {
      // 1. Fetch lead with all necessary data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          seller: true,
          buyer: true,
          address: true,
          assignedUser: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // 2. Validate required data
      const sellerEmail = lead.seller?.email;
      const sellerName = lead.seller 
        ? `${lead.seller.firstName} ${lead.seller.lastName}` 
        : null;
      const propertyAddress = lead.address?.address1 || 'Property Address';
      const offerPrice = (lead.customFields as any)?.offerMadePrice || 0;

      if (!sellerEmail || !sellerName) {
        throw new Error('Seller email and name are required to send contract');
      }

      // 3. Initialize DocuSign API
      const apiClient = await this.getApiClient();
      const envelopesApi = new docusign.EnvelopesApi(apiClient);

      // 4. Calculate expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + env.CONTRACT_EXPIRATION_DAYS);

      // 5. Create envelope definition from template
      const envelopeDefinition = new docusign.EnvelopeDefinition();
      envelopeDefinition.templateId = env.DOCUSIGN_TEMPLATE_ID;
      envelopeDefinition.status = 'sent'; // Send immediately
      
      // Set expiration
      const notification = new docusign.Notification();
      notification.useAccountDefaults = 'false';
      notification.expirations = new docusign.Expirations();
      notification.expirations.expireEnabled = 'true';
      notification.expirations.expireAfter = String(env.CONTRACT_EXPIRATION_DAYS);
      notification.expirations.expireWarn = String(Math.max(1, env.CONTRACT_EXPIRATION_DAYS - 1));
      envelopeDefinition.notification = notification;

      // 6. Define template roles (recipients)
      const templateRoles: docusign.TemplateRole[] = [];

      // Seller as signer
      const sellerRole = new docusign.TemplateRole();
      sellerRole.roleName = 'Seller'; // Must match template role name
      sellerRole.name = sellerName;
      sellerRole.email = sellerEmail;
      templateRoles.push(sellerRole);

      // Optional: Add assigned user as internal signer
      if (lead.assignedUser?.email) {
        const agentRole = new docusign.TemplateRole();
        agentRole.roleName = 'Agent'; // Must match template role name
        agentRole.name = `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}`;
        agentRole.email = lead.assignedUser.email;
        templateRoles.push(agentRole);
      }

      envelopeDefinition.templateRoles = templateRoles;

      // 7. Add custom fields for data mapping
      const customFields = new docusign.CustomFields();
      const textCustomFields: docusign.TextCustomField[] = [];

      // Property address field
      const addressField = new docusign.TextCustomField();
      addressField.name = 'PropertyAddress';
      addressField.value = propertyAddress;
      textCustomFields.push(addressField);

      // Offer price field
      const priceField = new docusign.TextCustomField();
      priceField.name = 'OfferPrice';
      priceField.value = String(offerPrice);
      textCustomFields.push(priceField);

      // Lead ID for reference
      const leadIdField = new docusign.TextCustomField();
      leadIdField.name = 'LeadID';
      leadIdField.value = leadId;
      textCustomFields.push(leadIdField);

      customFields.textCustomFields = textCustomFields;
      envelopeDefinition.customFields = customFields;

      // 8. Set email subject and message
      envelopeDefinition.emailSubject = `Contract for ${propertyAddress} - Please Sign`;
      envelopeDefinition.emailBlurb = `Please review and sign the contract for ${propertyAddress}. The offer amount is $${offerPrice.toLocaleString()}.`;

      // 9. Create envelope
      logger.info('Creating DocuSign envelope', { leadId, templateId: env.DOCUSIGN_TEMPLATE_ID });
      
      const results = await envelopesApi.createEnvelope(env.DOCUSIGN_ACCOUNT_ID, {
        envelopeDefinition
      });

      const envelopeId = results.envelopeId;
      if (!envelopeId) {
        throw new Error('Failed to create envelope - no envelope ID returned');
      }

      logger.info('DocuSign envelope created successfully', { 
        leadId, 
        envelopeId,
        status: results.status 
      });

      // 10. Return result
      return {
        envelopeId,
        status: results.status || 'sent',
        voidAt: expirationDate,
        sentAt: new Date()
      };

    } catch (error: any) {
      logger.error('Failed to create DocuSign envelope', { 
        leadId, 
        error: error.message,
        stack: error.stack 
      });
      throw new Error(`DocuSign envelope creation failed: ${error.message}`);
    }
  },

  /**
   * Get envelope status from DocuSign
   */
  async getEnvelopeStatus(envelopeId: string): Promise<any> {
    try {
      const apiClient = await this.getApiClient();
      const envelopesApi = new docusign.EnvelopesApi(apiClient);
      
      const envelope = await envelopesApi.getEnvelope(env.DOCUSIGN_ACCOUNT_ID, envelopeId);
      
      return {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        sentDateTime: envelope.sentDateTime,
        completedDateTime: envelope.completedDateTime,
        voidedDateTime: envelope.voidedDateTime,
        declinedDateTime: envelope.declinedDateTime
      };
    } catch (error: any) {
      logger.error('Failed to get envelope status', { envelopeId, error: error.message });
      throw error;
    }
  },

  /**
   * Download signed document
   */
  async downloadSignedDocument(envelopeId: string): Promise<Buffer> {
    try {
      const apiClient = await this.getApiClient();
      const envelopesApi = new docusign.EnvelopesApi(apiClient);
      
      const document = await envelopesApi.getDocument(
        env.DOCUSIGN_ACCOUNT_ID,
        envelopeId,
        'combined' // Get all documents combined
      );
      
      return document as Buffer;
    } catch (error: any) {
      logger.error('Failed to download signed document', { envelopeId, error: error.message });
      throw error;
    }
  }
};

