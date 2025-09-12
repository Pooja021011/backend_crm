import { prisma } from '../config/db.js';

export const fileRepository = {
  listByLead: (leadId: string) =>
    prisma.leadFile.findMany({ 
      where: { leadId }, 
      include: { 
        file: { 
          include: { 
            versions: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }, 
            categories: { include: { category: true } },
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          } 
        } 
      }, 
      orderBy: { file: { createdAt: 'desc' } } 
    }),

  createForLead: async (leadId: string, meta: { 
    filename: string; 
    originalName: string;
    mimeType: string; 
    size: number; 
    storageKey: string; 
    category?: string;
    tags?: string[];
    description?: string;
    isPublic?: boolean;
    uploadedById?: string | null 
  }, categoryIds?: string[]) => {
    const file = await prisma.file.create({
      data: {
        filename: meta.filename,
        originalName: meta.originalName,
        mimeType: meta.mimeType,
        size: meta.size,
        storageKey: meta.storageKey,
        category: meta.category || 'other',
        tags: meta.tags || [],
        description: meta.description,
        isPublic: meta.isPublic || false,
        uploadedById: meta.uploadedById || null,
        versions: { 
          create: { 
            versionNo: 1, 
            filename: meta.originalName,
            size: meta.size,
            storageKey: meta.storageKey,
            uploadedById: meta.uploadedById || null,
          } 
        },
        leadFiles: { create: { leadId } },
        categories: categoryIds?.length ? { create: categoryIds.map((id) => ({ docCategoryId: id })) } : undefined,
      },
      include: { versions: true }
    });
    return file;
  },

  addVersion: async (fileId: string, versionData: {
    filename: string;
    size: number;
    storageKey: string;
    changeNote?: string;
    uploadedById?: string | null;
  }) => {
    const last = await prisma.fileVersion.findFirst({ where: { fileId }, orderBy: { versionNo: 'desc' } });
    const versionNo = (last?.versionNo || 0) + 1;
    
    // Update the main file's updatedAt timestamp
    await prisma.file.update({
      where: { id: fileId },
      data: { updatedAt: new Date() }
    });
    
    return prisma.fileVersion.create({ 
      data: { 
        fileId, 
        versionNo, 
        filename: versionData.filename,
        size: versionData.size,
        storageKey: versionData.storageKey,
        changeNote: versionData.changeNote,
        uploadedById: versionData.uploadedById,
      } 
    });
  },

  findById: (id: string) => 
    prisma.file.findUnique({ 
      where: { id }, 
      include: { 
        versions: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      } 
    }),

  updateFile: async (id: string, data: {
    category?: string;
    tags?: string[];
    description?: string;
    isPublic?: boolean;
  }) => {
    return prisma.file.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  },

  deleteFile: async (id: string) => {
    // First delete all versions
    await prisma.fileVersion.deleteMany({
      where: { fileId: id }
    });
    
    // Delete file categorizations
    await prisma.fileCategorization.deleteMany({
      where: { fileId: id }
    });
    
    // Delete lead file associations
    await prisma.leadFile.deleteMany({
      where: { fileId: id }
    });
    
    // Finally delete the file
    return prisma.file.delete({
      where: { id }
    });
  },
};

