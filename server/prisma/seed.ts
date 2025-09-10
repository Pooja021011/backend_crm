import { PrismaClient, RoleName, PipelineKey } from '@prisma/client';
import 'dotenv/config';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function upsertRoles() {
  const roles = [RoleName.ADMIN, RoleName.MANAGER, RoleName.ACQ, RoleName.DISP, RoleName.TC];
  for (const r of roles) {
    await prisma.role.upsert({ where: { name: r }, update: {}, create: { name: r } });
  }
}

async function upsertAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hash = await argon2.hash(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {},
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: adminEmail.toLowerCase(),
      passwordHash: hash,
      status: 'active',
      roles: {
        create: [{ role: { connect: { name: RoleName.ADMIN } } }]
      }
    }
  });
}

async function upsertPipelines() {
  // Acquisitions
  const acq = await prisma.pipelineDefinition.upsert({
    where: { key: PipelineKey.ACQUISITIONS },
    update: { active: true, name: 'Acquisitions' },
    create: { key: PipelineKey.ACQUISITIONS, name: 'Acquisitions' }
  });
  const acqStages = [
    'New Lead',
    'No Contact Made',
    'Contact Made',
    'Appointment Set',
    'Appointment Complete',
    'Due Diligence Complete',
    'Offer Made',
    'Contract Sent',
    'Under Contract',
  ];
  await replaceStages(acq.id, acqStages);

  // Dispositions
  const disp = await prisma.pipelineDefinition.upsert({
    where: { key: PipelineKey.DISPOSITIONS },
    update: { active: true, name: 'Dispositions' },
    create: { key: PipelineKey.DISPOSITIONS, name: 'Dispositions' }
  });
  const dispStages = ['For Sale', 'Under Contract', 'Closed'];
  await replaceStages(disp.id, dispStages);

  // Transaction Coordinator
  const tc = await prisma.pipelineDefinition.upsert({
    where: { key: PipelineKey.TRANSACTION },
    update: { active: true, name: 'Transaction' },
    create: { key: PipelineKey.TRANSACTION, name: 'Transaction' }
  });
  const tcStages = ['New Lead', 'Title Open', 'Clear to Close', 'Closed'];
  await replaceStages(tc.id, tcStages);
}

async function replaceStages(pipelineId: string, names: string[]) {
  // remove existing stages and insert new set in order
  await prisma.pipelineStage.deleteMany({ where: { pipelineId } });
  for (let i = 0; i < names.length; i++) {
    await prisma.pipelineStage.create({ data: { pipelineId, name: names[i], orderIndex: i } });
  }
}

async function main() {
  await upsertRoles();
  await upsertAdmin();
  await upsertPipelines();
  console.log('Seed complete.');
}

main().finally(async () => {
  await prisma.$disconnect();
});

