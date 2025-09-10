import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import type { Request, Response } from 'express';
import { fileRepository } from '../repositories/fileRepository.js';

const uploadDir = path.resolve(process.cwd(), 'server', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

export const uploader = multer({ storage });

export const fileController = {
  async listForLead(req: Request, res: Response) {
    const items = await fileRepository.listByLead(req.params.id);
    res.json({ data: items.map(i => ({ ...i.file, categories: i.file.categories?.map(c => c.category) })) });
  },

  async uploadForLead(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File;
    if (!file) return res.status(400).json({ error: 'No file' });
    const categoryIds = (req.body.categoryIds as string[] | undefined);
    const created = await fileRepository.createForLead(req.params.id, {
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey: file.filename,
      uploadedById: (req as any).user?.id || null,
    }, Array.isArray(categoryIds) ? categoryIds : undefined);
    res.status(201).json({ data: created });
  },

  async addVersion(req: Request, res: Response) {
    const file = (req as any).file as Express.Multer.File;
    if (!file) return res.status(400).json({ error: 'No file' });
    const version = await fileRepository.addVersion(req.params.fileId, file.filename);
    res.status(201).json({ data: version });
  },

  async download(req: Request, res: Response) {
    const f = await fileRepository.findById(req.params.fileId);
    if (!f) return res.status(404).end();
    const last = f.versions.sort((a, b) => b.versionNo - a.versionNo)[0];
    const p = path.join(uploadDir, last.storageKey);
    res.setHeader('Content-Type', f.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${f.filename}"`);
    fs.createReadStream(p).pipe(res);
  },
};

