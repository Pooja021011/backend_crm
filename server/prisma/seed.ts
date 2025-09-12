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

async function upsertMarketsAndCounties() {
  // North Carolina Markets and Counties
  const markets = [
    {
      name: "Charlotte Market",
      counties: [
        "Mecklenburg County",
        "Union County",
        "Cabarrus County",
        "Gaston County",
        "Iredell County",
        "York County", // SC
        "Lancaster County" // SC
      ]
    },
    {
      name: "Winston-Salem / Greensboro Market",
      counties: [
        "Forsyth County",
        "Guilford County",
        "Davidson County",
        "Randolph County",
        "Alamance County",
        "Rockingham County",
        "Stokes County",
        "Surry County"
      ]
    },
    {
      name: "Raleigh / Durham Market",
      counties: [
        "Wake County",
        "Durham County",
        "Orange County",
        "Johnston County",
        "Franklin County",
        "Granville County",
        "Person County",
        "Vance County"
      ]
    },
    {
      name: "Fayetteville Market",
      counties: [
        "Cumberland County",
        "Hoke County",
        "Robeson County",
        "Bladen County",
        "Sampson County",
        "Moore County",
        "Richmond County",
        "Scotland County"
      ]
    }
  ];

  for (const marketData of markets) {
    const market = await prisma.market.upsert({
      where: { name: marketData.name },
      update: {},
      create: { name: marketData.name }
    });

    for (const countyName of marketData.counties) {
      await prisma.county.upsert({
        where: { name_marketId: { name: countyName, marketId: market.id } },
        update: {},
        create: { 
          name: countyName, 
          marketId: market.id 
        }
      });
    }
  }
}

async function upsertLeadSources() {
  const leadSources = [
    "Website",
    "Referral",
    "Social Media",
    "Cold Call",
    "Direct Mail",
    "Networking Event",
    "Online Advertisement",
    "Walk-in",
    "Google Ads",
    "Facebook Ads",
    "Yellow Pages",
    "Radio",
    "TV",
    "Newspaper",
    "Real Estate Agent",
    "Wholesaler",
    "Bird Dog"
  ];

  for (const sourceName of leadSources) {
    await prisma.leadSource.upsert({
      where: { name: sourceName },
      update: {},
      create: { name: sourceName, active: true }
    });
  }
}

async function upsertAssetClasses() {
  const assetClasses = [
    "Single Family",
    "Townhouse",
    "Condo",
    "Multi-Family",
    "Commercial",
    "Land",
    "Mobile Home",
    "Duplex",
    "Triplex",
    "Fourplex"
  ];

  for (const className of assetClasses) {
    await prisma.assetClass.upsert({
      where: { name: className },
      update: {},
      create: { name: className, active: true }
    });
  }
}

async function upsertPriceRanges() {
  const priceRanges = [
    { label: "Under $50k", min: 0, max: 49999 },
    { label: "$50k - $100k", min: 50000, max: 99999 },
    { label: "$100k - $200k", min: 100000, max: 199999 },
    { label: "$200k - $300k", min: 200000, max: 299999 },
    { label: "$300k - $500k", min: 300000, max: 499999 },
    { label: "$500k - $750k", min: 500000, max: 749999 },
    { label: "$750k - $1M", min: 750000, max: 999999 },
    { label: "Over $1M", min: 1000000, max: null }
  ];

  for (const range of priceRanges) {
    await prisma.priceRange.upsert({
      where: { label: range.label },
      update: {},
      create: range
    });
  }
}

async function upsertDocCategories() {
  const docCategories = [
    "Contract",
    "Inspection Report",
    "Appraisal",
    "Title Work",
    "Insurance",
    "Financial Documents",
    "Photos",
    "Repair Estimates",
    "Legal Documents",
    "Marketing Materials",
    "Correspondence",
    "Other"
  ];

  for (const categoryName of docCategories) {
    await prisma.docCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName }
    });
  }
}

async function main() {
  await upsertRoles();
  await upsertAdmin();
  await upsertPipelines();
  await upsertMarketsAndCounties();
  await upsertLeadSources();
  await upsertAssetClasses();
  await upsertPriceRanges();
  await upsertDocCategories();
  console.log('Seed complete.');
}

main().finally(async () => {
  await prisma.$disconnect();
});

