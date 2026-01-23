import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import type { Request, Response } from 'express';
import { fileRepository } from '../repositories/fileRepository.js';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

const uploadDir = path.resolve(process.cwd(), 'server', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const maxFileSize = 50 * 1024 * 1024; // 50MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, unique + '-' + sanitizedName);
  }
});

// Allow all file types (still enforcing max size via multer limits).
const fileFilter = (_req: any, _file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  cb(null, true);
};

export const uploader = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: maxFileSize }
});

// Helper function to convert HEIC to JPEG
async function convertHeicToJpeg(filePath: string): Promise<{ 
  path: string; 
  filename: string; 
  size: number; 
}> {
  try {
    const inputBuffer = fs.readFileSync(filePath);
    
    // Convert HEIC to JPEG
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9
    });

    // Optimize with Sharp
    const optimizedBuffer = await sharp(outputBuffer as Buffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    // Generate new filename with .jpg extension
    const jpegPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');
    const jpegFilename = path.basename(jpegPath);
    
    // Write the converted file
    fs.writeFileSync(jpegPath, optimizedBuffer);
    
    // Delete the original HEIC file
    fs.unlinkSync(filePath);
    
    return {
      path: jpegPath,
      filename: jpegFilename,
      size: optimizedBuffer.length
    };
  } catch (error) {
    console.error('Error converting HEIC to JPEG:', error);
    throw new Error('Failed to convert HEIC image');
  }
}

export const fileController = {
  // List files for a specific lead
  async listForLead(req: Request, res: Response) {
    try {
      const { id: leadId } = req.params;
      const files = await fileRepository.listByLead(leadId);
      
      const formattedFiles = files.map(item => ({
        id: item.file.id,
        filename: item.file.filename,
        originalName: item.file.originalName,
        size: item.file.size,
        mimeType: item.file.mimeType,
        category: item.file.category,
        tags: item.file.tags,
        description: item.file.description,
        isPublic: item.file.isPublic,
        version: Math.max(...item.file.versions.map(v => v.versionNo), 1),
        uploadedBy: item.file.uploadedBy ? {
          id: item.file.uploadedBy.id,
          firstName: item.file.uploadedBy.firstName,
          lastName: item.file.uploadedBy.lastName
        } : null,
        uploadedAt: item.file.createdAt,
        updatedAt: item.file.updatedAt,
        versions: item.file.versions.map(v => ({
          id: v.id,
          version: v.versionNo,
          filename: v.filename,
          size: v.size,
          uploadedBy: v.uploadedBy ? {
            id: v.uploadedBy.id,
            firstName: v.uploadedBy.firstName,
            lastName: v.uploadedBy.lastName
          } : null,
          uploadedAt: v.createdAt,
          changeNote: v.changeNote
        })).sort((a, b) => b.version - a.version),
        leadId
      }));

      res.json({ success: true, data: formattedFiles });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({ success: false, error: 'Failed to list files' });
    }
  },

  // Upload new file (for route /leads/:id/files)
  async uploadFile(req: Request, res: Response) {
    try {
      let file = (req as any).file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
      }

      const leadId = req.params.id; // Get leadId from URL params
      const { category = 'other', tags = '[]', description = '', isPublic = 'false' } = req.body;
      const userId = (req as any).user?.id;

      if (!leadId) {
        return res.status(400).json({ success: false, error: 'Lead ID is required' });
      }

      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        // If tags is not valid JSON, treat as empty array
      }

      // Normalize legacy categories
      const normalizedCategory = (() => {
        const c = String(category || '').trim();
        if (c.toUpperCase() === 'PHOTO') return 'photos';
        if (c.toLowerCase() === 'photo') return 'photos';
        return c || 'other';
      })();

      // Validate file types for photos category ONLY
      if (normalizedCategory === 'photos') {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
        
        const fileName = file.originalname.toLowerCase();
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        const hasValidMimeType = allowedMimeTypes.includes(file.mimetype.toLowerCase());
        
        if (!hasValidExtension && !hasValidMimeType) {
          // Delete the uploaded file
          fs.unlinkSync(file.path);
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid file type. Only JPEG, PNG, and HEIC images are allowed for photos.' 
          });
        }

        // Convert HEIC/HEIF to JPEG
        const isHeic = file.mimetype.toLowerCase().includes('heic') || 
                       file.mimetype.toLowerCase().includes('heif') ||
                       fileName.endsWith('.heic') ||
                       fileName.endsWith('.heif');
        
        if (isHeic) {
          try {
            console.log(`🔄 Converting HEIC to JPEG: ${file.originalname}`);
            const converted = await convertHeicToJpeg(file.path);
            
            // Update file info
            file.filename = converted.filename;
            file.originalname = file.originalname.replace(/\.(heic|heif)$/i, '.jpg');
            file.mimetype = 'image/jpeg';
            file.size = converted.size;
            file.path = converted.path;
            
            console.log(`✅ Converted HEIC to JPEG: ${converted.filename}`);
          } catch (error) {
            console.error('HEIC conversion failed:', error);
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to process HEIC image' 
            });
          }
        }
      }

      const created = await fileRepository.createForLead(leadId, {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: file.filename,
        category: normalizedCategory,
        tags: parsedTags,
        description: description || undefined,
        isPublic: isPublic === 'true',
        uploadedById: userId || null,
      });

      res.status(201).json({ 
        success: true, 
        data: {
          id: created.id,
          originalName: created.originalName,
          category: created.category,
          tags: created.tags,
          fileId: created.id
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
  },

  // Upload new file (legacy - for routes that pass leadId in body)
  async upload(req: Request, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { leadId, category = 'other', tags = '[]', description = '', isPublic = 'false' } = req.body;
      const userId = (req as any).user?.id;

      if (!leadId) {
        return res.status(400).json({ error: 'Lead ID is required' });
      }

      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        // If tags is not valid JSON, treat as empty array
      }

      const created = await fileRepository.createForLead(leadId, {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: file.filename,
        category,
        tags: parsedTags,
        description: description || undefined,
        isPublic: isPublic === 'true',
        uploadedById: userId || null,
      });

      res.status(201).json({ 
        success: true, 
        file: {
          id: created.id,
          originalName: created.originalName,
          category: created.category,
          tags: created.tags
        }
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  },

  // Add new version to existing file
  async addVersion(req: Request, res: Response) {
    try {
      const file = (req as any).file as Express.Multer.File;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { fileId } = req.params;
      const { changeNote } = req.body;
      const userId = (req as any).user?.id;

      const version = await fileRepository.addVersion(fileId, {
        filename: file.originalname,
        size: file.size,
        storageKey: file.filename,
        changeNote: changeNote || undefined,
        uploadedById: userId || null,
      });

      res.status(201).json({ 
        success: true, 
        version: {
          id: version.id,
          version: version.versionNo,
          filename: version.filename,
          size: version.size
        }
      });
    } catch (error) {
      console.error('Error adding version:', error);
      res.status(500).json({ error: 'Failed to add version' });
    }
  },

  // Download file (latest version by default)
  async download(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const { version } = req.query;

      const file = await fileRepository.findById(fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      let targetVersion;
      if (version && typeof version === 'string') {
        targetVersion = file.versions.find(v => v.versionNo === parseInt(version));
      } else {
        targetVersion = file.versions.sort((a, b) => b.versionNo - a.versionNo)[0];
      }

      if (!targetVersion) {
        return res.status(404).json({ error: 'Version not found' });
      }

      const filePath = path.join(uploadDir, targetVersion.storageKey);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Length', file.size.toString());
      
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  },

  // Preview file (for images, PDFs, etc.)
  async preview(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      const file = await fileRepository.findById(fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const latestVersion = file.versions.sort((a, b) => b.versionNo - a.versionNo)[0];
      const filePath = path.join(uploadDir, latestVersion.storageKey);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      // Check if file is HEIC/HEIF and needs on-the-fly conversion
      // Check MIME type, file path, AND original filename (for old files with wrong MIME type)
      const isHeic = file.mimeType.toLowerCase().includes('heic') || 
                     file.mimeType.toLowerCase().includes('heif') ||
                     filePath.toLowerCase().endsWith('.heic') ||
                     filePath.toLowerCase().endsWith('.heif') ||
                     (file.originalName && file.originalName.toLowerCase().endsWith('.heic')) ||
                     (file.originalName && file.originalName.toLowerCase().endsWith('.heif'));

      if (isHeic) {
        try {
          console.log(`🔄 Converting HEIC to JPEG for preview: ${file.originalName}`);
          
          // Read the HEIC file
          const inputBuffer = fs.readFileSync(filePath);
          
          // Convert to JPEG
          const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 0.9
          });

          // Optimize with Sharp
          const optimizedBuffer = await sharp(outputBuffer as Buffer)
            .jpeg({ quality: 90 })
            .toBuffer();

          // Send as JPEG
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/\.(heic|heif)$/i, '.jpg')}"`);
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
          res.send(optimizedBuffer);
          
          console.log(`✅ HEIC converted successfully for preview`);
        } catch (error) {
          console.error('Error converting HEIC for preview:', error);
          // Fallback to original file if conversion fails
          res.setHeader('Content-Type', file.mimeType);
          res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
          fs.createReadStream(filePath).pipe(res);
        }
      } else {
        // Normal file serving
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      res.status(500).json({ error: 'Failed to preview file' });
    }
  },

  // Update file metadata
  async updateFile(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      const { category, tags, description, isPublic } = req.body;

      const updated = await fileRepository.updateFile(fileId, {
        category,
        tags: Array.isArray(tags) ? tags : undefined,
        description,
        isPublic: typeof isPublic === 'boolean' ? isPublic : undefined,
      });

      res.json({ 
        success: true, 
        file: {
          id: updated.id,
          category: updated.category,
          tags: updated.tags,
          description: updated.description,
          isPublic: updated.isPublic
        }
      });
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  },

  // Delete file
  async deleteFile(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      const file = await fileRepository.findById(fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Delete physical files
      for (const version of file.versions) {
        const filePath = path.join(uploadDir, version.storageKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Delete from database
      await fileRepository.deleteFile(fileId);

      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  },

  // Get file info
  async getFileInfo(req: Request, res: Response) {
    try {
      const { fileId } = req.params;
      
      const file = await fileRepository.findById(fileId);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        category: file.category,
        tags: file.tags,
        description: file.description,
        isPublic: file.isPublic,
        uploadedBy: file.uploadedBy ? {
          id: file.uploadedBy.id,
          firstName: file.uploadedBy.firstName,
          lastName: file.uploadedBy.lastName
        } : null,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        versions: file.versions.map(v => ({
          id: v.id,
          version: v.versionNo,
          filename: v.filename,
          size: v.size,
          uploadedBy: v.uploadedBy ? {
            id: v.uploadedBy.id,
            firstName: v.uploadedBy.firstName,
            lastName: v.uploadedBy.lastName
          } : null,
          uploadedAt: v.createdAt,
          changeNote: v.changeNote
        })).sort((a, b) => b.version - a.version)
      });
    } catch (error) {
      console.error('Error getting file info:', error);
      res.status(500).json({ error: 'Failed to get file info' });
    }
  },
};

