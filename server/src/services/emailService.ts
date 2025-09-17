import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { settingsRepository } from '../repositories/settingsRepository.js';

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

          // Combine emails from both folders
          emails = [...inboxEmails, ...sentEmails];

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
  }
};
