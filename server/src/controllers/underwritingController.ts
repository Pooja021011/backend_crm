import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { underwritingService } from '../services/underwritingService.js';
import { underwritingRepository } from '../repositories/underwritingRepository.js';
import { fileRepository } from '../repositories/fileRepository.js';

const uploadDir = path.resolve(process.cwd(), 'server', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

export const underwritingController = {
  list: async (req: Request, res: Response) => {
    const data = await underwritingService.list(req.params.id);
    res.json({ data });
  },
  create: async (req: Request, res: Response) => {
    const { name, inputs, isPrimary } = req.body;
    const created = await underwritingService.create(req.params.id, { name, inputs, isPrimary, createdById: (req as any).user?.id });
    res.status(201).json({ data: created });
  },
  update: async (req: Request, res: Response) => {
    const { name, inputs, isPrimary } = req.body;
    const updated = await underwritingService.update(req.params.scenarioId, req.params.id, { name, inputs, isPrimary });
    res.json({ data: updated });
  },
  delete: async (req: Request, res: Response) => {
    await underwritingService.delete(req.params.scenarioId);
    res.json({ success: true });
  },
  exportPdf: async (req: Request, res: Response) => {
    const scenario = await underwritingRepository.findById(req.params.scenarioId);
    if (!scenario) return res.status(404).json({ error: 'Not found' });
    const filename = `underwriting-${scenario.id}.pdf`;
    const storageKey = Date.now() + '-' + filename;
    const filePath = path.join(uploadDir, storageKey);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.fontSize(18).text('Underwriting Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Lead ID: ${scenario.leadId}`);
    doc.text(`Scenario: ${scenario.name}`);
    doc.moveDown();
    doc.text('Inputs:');
    doc.text(JSON.stringify(scenario.inputs, null, 2));
    doc.moveDown();
    doc.text('Outputs:');
    doc.text(JSON.stringify(scenario.outputs, null, 2));
    doc.end();

    await new Promise((r) => setTimeout(r, 200));

    const saved = await fileRepository.createForLead(req.params.id, {
      filename,
      mimeType: 'application/pdf',
      size: fs.statSync(filePath).size,
      storageKey,
      uploadedById: (req as any).user?.id || null,
    });
    res.status(201).json({ data: saved });
  },
};

