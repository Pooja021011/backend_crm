import { prisma } from '../config/db.js';

/**
 * Service to match email addresses to leads in the CRM
 */
export const emailMatchingService = {
  /**
   * Find a lead by email address
   * ONLY matches with lead owners' emails (not seller/buyer/vendor/contacts)
   */
  findLeadByEmail: async (emailAddress: string): Promise<string | null> => {
    if (!emailAddress) return null;
    
    const normalizedEmail = emailAddress.toLowerCase().trim();
    
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = normalizedEmail.match(/<([^>]+)>/);
    const searchEmail = emailMatch ? emailMatch[1] : normalizedEmail;
    
    // ONLY search in lead owners
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
    
    return ownerLead ? ownerLead.id : null;
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

