import { prisma } from '../config/db.js';

/**
 * Service to match email addresses to leads in the CRM
 */
export const emailMatchingService = {
  /**
   * Find a lead by email address
   * Searches seller, buyer, vendor, and contact emails
   */
  findLeadByEmail: async (emailAddress: string): Promise<string | null> => {
    if (!emailAddress) return null;
    
    const normalizedEmail = emailAddress.toLowerCase().trim();
    
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = normalizedEmail.match(/<([^>]+)>/);
    const searchEmail = emailMatch ? emailMatch[1] : normalizedEmail;
    
    // Search in seller emails
    const sellerLead = await prisma.lead.findFirst({
      where: {
        leadType: 'SELLER',
        seller: {
          email: {
            equals: searchEmail,
            mode: 'insensitive'
          }
        }
      },
      select: { id: true }
    });
    
    if (sellerLead) return sellerLead.id;
    
    // Search in buyer emails
    const buyerLead = await prisma.lead.findFirst({
      where: {
        leadType: 'BUYER',
        buyer: {
          email: {
            equals: searchEmail,
            mode: 'insensitive'
          }
        }
      },
      select: { id: true }
    });
    
    if (buyerLead) return buyerLead.id;
    
    // Search in vendor emails
    const vendorLead = await prisma.lead.findFirst({
      where: {
        leadType: 'VENDOR',
        vendor: {
          email: {
            equals: searchEmail,
            mode: 'insensitive'
          }
        }
      },
      select: { id: true }
    });
    
    if (vendorLead) return vendorLead.id;
    
    // Search in lead owners
    const ownerLead = await prisma.lead.findFirst({
      where: {
        owners: {
          some: {
            email: {
              equals: searchEmail,
              mode: 'insensitive'
            }
          }
        }
      },
      select: { id: true }
    });
    
    if (ownerLead) return ownerLead.id;
    
    // Search in lead contacts (stored in customFields)
    // Note: This is a simplified search - in production you might want to use a more sophisticated approach
    const leadsWithContacts = await prisma.lead.findMany({
      where: {
        customFields: {
          path: ['contacts'],
          not: null
        }
      },
      select: { id: true, customFields: true }
    });
    
    for (const lead of leadsWithContacts) {
      const customFields = lead.customFields as any;
      const contacts = customFields?.contacts || [];
      
      for (const contact of contacts) {
        if (contact.email && contact.email.toLowerCase() === searchEmail) {
          return lead.id;
        }
      }
    }
    
    return null;
  },
  
  /**
   * Match multiple email addresses to a lead
   * Useful for emails with multiple recipients
   */
  findLeadByMultipleEmails: async (emailAddresses: string[]): Promise<string | null> => {
    for (const email of emailAddresses) {
      const leadId = await emailMatchingService.findLeadByEmail(email);
      if (leadId) return leadId;
    }
    return null;
  }
};

