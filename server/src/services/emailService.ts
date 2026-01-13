import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { settingsRepository } from '../repositories/settingsRepository.js';
import { communicationResponseService } from './communicationResponseService.js';

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
  isGmail: boolean;
  read: boolean;
}

export const emailService = {
  // Create SMTP transporter for a specific user
  createSmtpTransporter: async (userId: string) => {
    try {
      const userSettings = await settingsRepository.getUserEmailSettings(userId);
      
      if (!userSettings || !userSettings.smtpHost || !userSettings.smtpUser || !userSettings.smtpPass) {
        throw new Error('SMTP configuration not found or incomplete for user');
      }

      const transporter = nodemailer.createTransport({
        host: userSettings.smtpHost,
        port: userSettings.smtpPort || 587,
        secure: userSettings.smtpPort === 465, // true for 465, false for 587
        requireTLS: true, // Force TLS for port 587
        auth: {
          user: userSettings.smtpUser,
          pass: userSettings.smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
          ciphers: 'SSLv3' // For compatibility
        }
      });

      return transporter;
    } catch (error: any) {
      console.error('Error creating SMTP transporter:', error);
      throw new Error(`Failed to create SMTP transporter: ${error.message}`);
    }
  },

  // Send email using user's SMTP settings
  sendEmail: async (userId: string, emailData: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    leadId?: string;
  }) => {
    const userSettings = await settingsRepository.getUserEmailSettings(userId);
    if (!userSettings || !userSettings.email) {
      throw new Error('User email settings not found');
    }

    const transporter = await emailService.createSmtpTransporter(userId);

    const mailOptions = {
      from: userSettings.email, // Use user's configured email as sender
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      replyTo: emailData.replyTo || userSettings.email,
      inReplyTo: emailData.inReplyTo, // For threading
      references: emailData.references, // For threading
    };

    const result = await transporter.sendMail(mailOptions);
    
    // Log email to Communication table if leadId is provided
    if (emailData.leadId) {
      try {
        const { communicationRepository } = await import('../repositories/communicationRepository.js');
        const { prisma } = await import('../config/db.js');
        
        await communicationRepository.create(emailData.leadId, {
          type: 'EMAIL',
          direction: 'OUTBOUND',
          subject: emailData.subject,
          body: emailData.text || emailData.html || '',
          occurredAt: new Date(),
          createdById: userId,
          metadata: {
            from: userSettings.email,
            to: emailData.to,
            messageId: result.messageId,
          },
        });
        
        // Update lastContactAt for sent email (actual contact attempt)
        await prisma.lead.update({
          where: { id: emailData.leadId },
          data: { lastContactAt: new Date() }
        });
      } catch (error) {
        console.error('Failed to log email to communication table:', error);
        // Don't fail the email send if logging fails
      }
    }
    
    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  },

  // Test SMTP connection for a user
  testSmtpConnection: async (userId: string) => {
    try {
      const transporter = await emailService.createSmtpTransporter(userId);
      await transporter.verify();
      return {
        status: 'connected',
        message: 'SMTP connection test successful',
      };
    } catch (error: any) {
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  },

  // Test IMAP connection with real implementation
  testImapConnection: async (config: {
    imapHost: string;
    imapPort: number;
    imapUser: string;
    imapPass: string;
    imapSecure: boolean;
  }): Promise<any> => {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.imapUser,
        password: config.imapPass,
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapSecure,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 5000,
      });

      let resolved = false;

      const cleanup = () => {
        if (imap.state !== 'disconnected') {
          imap.end();
        }
      };

      const handleSuccess = (message: string) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            status: 'connected',
            message,
            server: `${config.imapHost}:${config.imapPort}`,
            secure: config.imapSecure
          });
        }
      };

      const handleError = (error: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`IMAP connection failed: ${error.message}`));
        }
      };

      imap.once('ready', () => {
        handleSuccess('IMAP connection test successful');
      });

      imap.once('error', handleError);

      imap.once('end', () => {
        if (!resolved) {
          handleError(new Error('Connection ended unexpectedly'));
        }
      });

      // Set timeout
      setTimeout(() => {
        handleError(new Error('Connection timeout'));
      }, 15000);

      try {
        imap.connect();
      } catch (error) {
        handleError(error as Error);
      }
    });
  },

  // Fetch emails from Gmail IMAP
  fetchGmailEmails: async (userId: string, limit: number = 20): Promise<EmailMessage[]> => {
    const userSettings = await settingsRepository.getUserEmailSettings(userId);
    
    if (!userSettings || !userSettings.imapHost || !userSettings.imapUser || !userSettings.imapPass) {
      throw new Error('IMAP configuration not found or incomplete');
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: userSettings.imapUser,
        password: userSettings.imapPass,
        host: userSettings.imapHost,
        port: userSettings.imapPort || 993,
        tls: userSettings.imapSecure !== false,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 5000,
      });

      let resolved = false;
      let emails: EmailMessage[] = [];

      const cleanup = () => {
        if (imap.state !== 'disconnected') {
          imap.end();
        }
      };

      const handleError = (error: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`Failed to fetch emails: ${error.message}`));
        }
      };

      const handleSuccess = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(emails);
        }
      };

      // Function to fetch emails from a specific folder
      const fetchFromFolder = (folderName: string, folderLimit: number) => {
        return new Promise<any[]>((resolve, reject) => {
          imap.openBox(folderName, true, (err, box) => {
            if (err) {
              console.log(`Could not open ${folderName}, skipping:`, err.message);
              resolve([]);
              return;
            }

            if (!box.messages.total) {
              console.log(`No messages in ${folderName}`);
              resolve([]);
              return;
            }

            console.log(`Fetching from ${folderName}: ${box.messages.total} total messages`);

            const folderEmails: any[] = [];
            const fetchCount = Math.min(folderLimit, box.messages.total);
            const start = Math.max(1, box.messages.total - fetchCount + 1);
            const end = box.messages.total;

            const fetch = imap.seq.fetch(`${start}:${end}`, {
              bodies: '',
              struct: true
            });

            let processedCount = 0;
            const expectedCount = end - start + 1;

            fetch.on('message', (msg, seqno) => {
              let buffer = '';
              let attributes = {};
              
              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
              });

              msg.once('attributes', (attrs) => {
                attributes = attrs;
              });

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  
                  // Check if email is read from IMAP flags
                  const flags = attributes.flags || [];
                  const isRead = flags.includes('\\Seen');
                  
                  // Extract attachments info
                  const attachments = parsed.attachments ? parsed.attachments.map(att => ({
                    filename: att.filename || 'unnamed',
                    contentType: att.contentType,
                    size: att.size || 0,
                    contentId: att.contentId
                  })) : [];

                  folderEmails.push({
                    id: `${folderName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${seqno}`,
                    subject: parsed.subject || 'No Subject',
                    from: parsed.from?.text || 'Unknown Sender',
                    to: parsed.to?.text || userSettings.imapUser || '',
                    cc: parsed.cc?.text || '',
                    bcc: parsed.bcc?.text || '',
                    date: parsed.date || new Date(),
                    body: parsed.text || 'No text content',
                    html: parsed.html || '',
                    messageId: parsed.messageId || `${folderName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${seqno}`,
                    inReplyTo: parsed.inReplyTo || '',
                    references: parsed.references || [],
                    attachments: attachments,
                    isGmail: true,
                    read: isRead, // Use actual read status from IMAP flags
                    folder: folderName
                  });

                  processedCount++;
                  if (processedCount >= expectedCount) {
                    resolve(folderEmails);
                  }
                } catch (parseError) {
                  console.error(`Error parsing email from ${folderName}:`, parseError);
                  processedCount++;
                  if (processedCount >= expectedCount) {
                    resolve(folderEmails);
                  }
                }
              });
            });

            fetch.once('error', (err) => {
              console.error(`Fetch error from ${folderName}:`, err);
              resolve(folderEmails);
            });
            
            fetch.once('end', () => {
              // Fallback in case no messages were processed
              setTimeout(() => {
                resolve(folderEmails);
              }, 3000);
            });
          });
        });
      };

      imap.once('ready', async () => {
        try {
          // Fetch emails ONLY from INBOX folder for the main list
          const inboxEmails = await fetchFromFolder('INBOX', limit);

          // Use only INBOX emails
          emails = inboxEmails;

          // Sort by date (newest first)
          emails.sort((a, b) => b.date.getTime() - a.date.getTime());

          console.log(`Total emails fetched: ${emails.length} (INBOX only)`);
          
          // Log emails to Communication table (async, don't block)
          emailService.logFetchedEmailsToCommunications(userId, emails).catch(err => {
            console.error('Failed to log emails to communications:', err);
          });
          
          handleSuccess();
        } catch (error) {
          console.error('Error fetching emails:', error);
          handleError(error as Error);
        }
      });

      imap.once('error', handleError);

      imap.once('end', () => {
        if (!resolved) {
          handleError(new Error('Connection ended unexpectedly'));
        }
      });

      // Set timeout
      setTimeout(() => {
        handleError(new Error('Email fetch timeout'));
      }, 30000);

      try {
        imap.connect();
      } catch (error) {
        handleError(error as Error);
      }
    });
  },

  // Fetch thread for a specific email (INBOX + SENT)
  fetchEmailThread: async (userId: string, emailSubject: string): Promise<EmailMessage[]> => {
    const userSettings = await settingsRepository.getUserEmailSettings(userId);
    
    if (!userSettings || !userSettings.imapHost || !userSettings.imapUser || !userSettings.imapPass) {
      throw new Error('IMAP configuration not found or incomplete');
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: userSettings.imapUser,
        password: userSettings.imapPass,
        host: userSettings.imapHost,
        port: userSettings.imapPort || 993,
        tls: userSettings.imapSecure !== false,
        tlsOptions: {
          rejectUnauthorized: false
        },
      });

      let resolved = false;
      let emails: EmailMessage[] = [];

      const cleanup = () => {
        try {
          imap.end();
        } catch (error) {
          console.error('Error closing IMAP connection:', error);
        }
      };

      const handleSuccess = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(emails);
        }
      };

      const handleError = (error: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`Thread fetch failed: ${error.message}`));
        }
      };

      // Function to fetch emails from a specific folder matching subject
      const fetchThreadFromFolder = (folderName: string) => {
        return new Promise<any[]>((resolve, reject) => {
          imap.openBox(folderName, true, (err, box) => {
            if (err) {
              console.log(`Could not open ${folderName}, skipping:`, err.message);
              resolve([]);
              return;
            }

            if (!box.messages.total) {
              console.log(`No messages in ${folderName}`);
              resolve([]);
              return;
            }

            const folderEmails: any[] = [];
            const cleanSubject = emailSubject.replace(/^(Re:|Fwd?:)\s*/i, '').trim();

            // Search for emails with matching subject
            imap.search([['SUBJECT', cleanSubject]], (err, results) => {
              if (err || !results || results.length === 0) {
                console.log(`No matching emails in ${folderName}`);
                resolve([]);
                return;
              }

              let processedCount = 0;
              const expectedCount = results.length;

              const fetch = imap.fetch(results, { 
                bodies: '', 
                struct: true,
                envelope: true 
              });

              fetch.on('message', (msg, seqno) => {
                let buffer = '';
                let attributes = {};

                msg.on('body', (stream) => {
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                });

                msg.once('attributes', (attrs) => {
                  attributes = attrs;
                });

                msg.once('end', async () => {
                  try {
                    const parsed = await simpleParser(buffer);
                    
                    // Check if email is read from IMAP flags
                    const flags = attributes.flags || [];
                    const isRead = flags.includes('\\Seen');
                    
                    const attachments = parsed.attachments ? parsed.attachments.map(att => ({
                      filename: att.filename,
                      contentType: att.contentType,
                      size: att.size,
                      content: att.content,
                      contentId: att.contentId
                    })) : [];

                    folderEmails.push({
                      id: `${folderName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${seqno}`,
                      subject: parsed.subject || 'No Subject',
                      from: parsed.from?.text || 'Unknown Sender',
                      to: parsed.to?.text || userSettings.imapUser || '',
                      cc: parsed.cc?.text || '',
                      bcc: parsed.bcc?.text || '',
                      date: parsed.date || new Date(),
                      body: parsed.text || 'No text content',
                      html: parsed.html || '',
                      messageId: parsed.messageId || `${folderName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${seqno}`,
                      inReplyTo: parsed.inReplyTo || '',
                      references: parsed.references || [],
                      attachments: attachments,
                      isGmail: true,
                      read: isRead, // Use actual read status from IMAP flags
                      folder: folderName
                    });

                    processedCount++;
                    if (processedCount >= expectedCount) {
                      resolve(folderEmails);
                    }
                  } catch (parseError) {
                    console.error(`Error parsing thread email from ${folderName}:`, parseError);
                    processedCount++;
                    if (processedCount >= expectedCount) {
                      resolve(folderEmails);
                    }
                  }
                });
              });

              fetch.once('error', (err) => {
                console.error(`Thread fetch error from ${folderName}:`, err);
                resolve(folderEmails);
              });
              
              fetch.once('end', () => {
                setTimeout(() => {
                  resolve(folderEmails);
                }, 2000);
              });
            });
          });
        });
      };

      imap.once('ready', async () => {
        try {
          // Fetch thread emails from both INBOX and SENT folders
          const [inboxEmails, sentEmails] = await Promise.all([
            fetchThreadFromFolder('INBOX'),
            fetchThreadFromFolder('[Gmail]/Sent Mail')
          ]);

          // Combine emails from both folders and deduplicate by messageId
          const allEmails = [...inboxEmails, ...sentEmails];
          const uniqueEmailsMap = new Map();
          
          // Deduplicate by messageId, keeping the first occurrence
          allEmails.forEach(email => {
            if (!uniqueEmailsMap.has(email.messageId)) {
              uniqueEmailsMap.set(email.messageId, email);
            }
          });
          
          emails = Array.from(uniqueEmailsMap.values());

          // Sort by date (oldest first for thread view)
          emails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          console.log(`Thread emails fetched: ${emails.length} (INBOX: ${inboxEmails.length}, SENT: ${sentEmails.length})`);
          
          handleSuccess();
        } catch (error) {
          console.error('Error fetching thread:', error);
          handleError(error as Error);
        }
      });

      imap.once('error', handleError);

      imap.once('end', () => {
        if (!resolved) {
          handleError(new Error('Connection ended unexpectedly'));
        }
      });

      // Set timeout
      setTimeout(() => {
        handleError(new Error('Thread fetch timeout'));
      }, 30000);

      try {
        imap.connect();
      } catch (error) {
        handleError(error as Error);
      }
    });
  },

  // Mark email as read on Gmail IMAP
  markEmailAsRead: async (userId: string, emailId: string): Promise<any> => {
    const userSettings = await settingsRepository.getUserEmailSettings(userId);
    
    if (!userSettings || !userSettings.imapHost || !userSettings.imapUser || !userSettings.imapPass) {
      throw new Error('IMAP configuration not found or incomplete');
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: userSettings.imapUser,
        password: userSettings.imapPass,
        host: userSettings.imapHost,
        port: userSettings.imapPort || 993,
        tls: userSettings.imapSecure !== false,
        tlsOptions: {
          rejectUnauthorized: false
        },
      });

      let resolved = false;

      const cleanup = () => {
        try {
          imap.end();
        } catch (error) {
          console.error('Error closing IMAP connection:', error);
        }
      };

      const handleSuccess = (message: string) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ success: true, message });
        }
      };

      const handleError = (error: Error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`Mark as read failed: ${error.message}`));
        }
      };

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => { // false = read-write mode
          if (err) {
            handleError(err);
            return;
          }

          console.log(`📧 Attempting to mark email as read: ${emailId}`);
          
          // Extract sequence number from emailId (format: inbox-123)
          const seqMatch = emailId.match(/inbox-(\d+)/);
          if (!seqMatch) {
            console.error(`❌ Invalid email ID format: ${emailId}`);
            handleError(new Error(`Invalid email ID format: ${emailId}`));
            return;
          }

          const seqno = parseInt(seqMatch[1]);
          console.log(`📧 Extracted sequence number: ${seqno} from emailId: ${emailId}`);

          // Mark email as read (add \Seen flag)
          imap.addFlags(seqno, '\\Seen', (err) => {
            if (err) {
              console.error(`❌ IMAP addFlags error for ${emailId}:`, err);
              handleError(err);
              return;
            }
            
            console.log(`✅ Email ${emailId} (seq: ${seqno}) marked as read successfully`);
            handleSuccess(`Email marked as read successfully`);
          });
        });
      });

      imap.once('error', handleError);

      imap.once('end', () => {
        if (!resolved) {
          handleError(new Error('Connection ended unexpectedly'));
        }
      });

      // Set timeout
      setTimeout(() => {
        handleError(new Error('Mark as read timeout'));
      }, 15000);

      try {
        imap.connect();
      } catch (error) {
        handleError(error as Error);
      }
    });
  },

  // Send OTP email for password reset
  sendPasswordResetOTP: async (email: string, otp: string, firstName: string) => {
    try {
      // Support both SYSTEM_SMTP_* and SMTP_* environment variables
      const smtpHost = process.env.SYSTEM_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = process.env.SYSTEM_SMTP_PORT || process.env.SMTP_PORT || '587';
      const smtpUser = process.env.SYSTEM_SMTP_USER || process.env.SMTP_USER;
      const smtpPass = process.env.SYSTEM_SMTP_PASS || process.env.SMTP_PASS;
      const fromEmail = process.env.FROM_EMAIL || smtpUser;
      const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === '465';

      // Debug: Log environment variables (remove in production)
      console.log('🔍 SMTP Config Check:');
      console.log('  SMTP_HOST:', smtpHost ? '✅ Set' : '❌ Missing');
      console.log('  SMTP_PORT:', smtpPort ? '✅ Set' : '❌ Missing');
      console.log('  SMTP_USER:', smtpUser ? '✅ Set' : '❌ Missing');
      console.log('  SMTP_PASS:', smtpPass ? '✅ Set (hidden)' : '❌ Missing');
      console.log('  FROM_EMAIL:', fromEmail ? '✅ Set' : '❌ Missing');
      
      // Check if SMTP configuration is available
      if (!smtpUser || !smtpPass) {
        console.error('❌ SMTP configuration missing. Please configure SMTP_USER and SMTP_PASS in .env file');
        throw new Error('Email service not configured. Please contact administrator.');
      }

      // Create a transporter using environment variables for system emails
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
          ciphers: 'SSLv3'
        }
      });

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Real Estate CRM'}" <${fromEmail}>`,
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${firstName}</strong>,</p>
                <p>We received a request to reset your password. Use the OTP code below to proceed:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Never share this OTP with anyone</li>
                    <li>This code expires in 10 minutes</li>
                    <li>If you didn't request this, please ignore this email</li>
                  </ul>
                </div>

                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <p>Best regards,<br><strong>${process.env.APP_NAME || 'Real Estate CRM'} Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Real Estate CRM'}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hi ${firstName},

We received a request to reset your password.

Your OTP Code: ${otp}
(Valid for 10 minutes)

If you didn't request a password reset, you can safely ignore this email.

Best regards,
${process.env.APP_NAME || 'Real Estate CRM'} Team
        `
      };

      await transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error: any) {
      console.error('Error sending OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  },
  
  /**
   * Log fetched emails to Communication table
   * Matches emails to leads by email address
   */
  logFetchedEmailsToCommunications: async (userId: string, emails: EmailMessage[]): Promise<void> => {
    const { emailMatchingService } = await import('./emailMatchingService.js');
    const { communicationRepository } = await import('../repositories/communicationRepository.js');
    
    for (const email of emails) {
      try {
        // Try to match email to a lead
        const leadId = await emailMatchingService.findLeadByMultipleEmails([
          email.from,
          email.to,
          email.cc,
          email.bcc
        ].filter(Boolean));
        
        if (leadId) {
          // Check if this email is already logged (by messageId)
          const existing = await prisma.communication.findFirst({
            where: {
              leadId,
              type: 'EMAIL',
              subject: email.subject,
              occurredAt: email.date
            }
          });
          
          if (!existing) {
            // Log as INBOUND email
            await communicationRepository.create(leadId, {
              type: 'EMAIL',
              direction: 'INBOUND',
              subject: email.subject,
              body: email.body || email.html || '',
              occurredAt: email.date,
              createdById: userId
            });
            
            console.log(`✅ Logged email to lead ${leadId}: ${email.subject}`);
            
            // NEW: Auto-update lead status based on communication
            await communicationResponseService.handleCommunicationEvent(
              leadId,
              'INBOUND',
              'EMAIL'
            ).catch(err => console.error('Failed to handle communication event:', err));
          }
        }
      } catch (error) {
        console.error(`Failed to log email "${email.subject}":`, error);
        // Continue processing other emails
      }
    }
  }
};
