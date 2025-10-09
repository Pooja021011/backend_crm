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
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123#';
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
  // First delete stage history that references these stages
  await prisma.stageHistory.deleteMany({
    where: {
      OR: [
        { fromStage: { pipelineId } },
        { toStage: { pipelineId } }
      ]
    }
  });
  
  // Then delete existing stages
  await prisma.pipelineStage.deleteMany({ where: { pipelineId } });
  
  // Insert new stages in order
  for (let i = 0; i < names.length; i++) {
    await prisma.pipelineStage.create({ 
      data: { 
        pipelineId, 
        name: names[i], 
        orderIndex: i,
        color: i === 0 ? 'blue' : i === names.length - 1 ? 'green' : 'gray',
        isDefault: true
      } 
    });
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

async function upsertLeadStatuses() {
  const DEFAULT_STATUSES = [
    {
      name: "New Lead",
      description: "Newly acquired lead, awaiting initial contact",
      color: "#3B82F6",
      orderIndex: 0,
      active: true,
      isDefault: true,
    },
    {
      name: "Contacted",
      description: "Initial contact has been made",
      color: "#10B981",
      orderIndex: 1,
      active: true,
      isDefault: true,
    },
    {
      name: "Qualified",
      description: "Lead has been qualified and shows strong interest",
      color: "#8B5CF6",
      orderIndex: 2,
      active: true,
      isDefault: true,
    },
    {
      name: "In Negotiation",
      description: "Currently negotiating terms and conditions",
      color: "#F59E0B",
      orderIndex: 3,
      active: true,
      isDefault: false,
    },
    {
      name: "Contract Sent",
      description: "Contract has been sent to the lead",
      color: "#06B6D4",
      orderIndex: 4,
      active: true,
      isDefault: false,
    },
    {
      name: "Closed Won",
      description: "Deal successfully closed",
      color: "#10B981",
      orderIndex: 5,
      active: true,
      isDefault: true,
    },
    {
      name: "Closed Lost",
      description: "Deal was lost or lead is no longer interested",
      color: "#EF4444",
      orderIndex: 6,
      active: true,
      isDefault: false,
    },
    {
      name: "On Hold",
      description: "Lead is temporarily on hold",
      color: "#6B7280",
      orderIndex: 7,
      active: true,
      isDefault: false,
    },
  ];

  for (const status of DEFAULT_STATUSES) {
    await prisma.leadStatus.upsert({
      where: { name: status.name },
      update: {},
      create: status,
    });
  }
}

async function createSampleLeads() {
  // Get the admin user
  const adminUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: 'ADMIN' } } } }
  });

  if (!adminUser) {
    console.log('No admin user found, skipping sample leads');
    return;
  }

  // Get the first market and county
  const market = await prisma.market.findFirst();
  const county = await prisma.county.findFirst();
  
  // Get acquisitions pipeline stages
  const acqPipeline = await prisma.pipelineDefinition.findUnique({
    where: { key: 'ACQUISITIONS' },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  });

  if (!acqPipeline || acqPipeline.stages.length === 0) {
    console.log('No acquisitions pipeline found, skipping sample leads');
    return;
  }

  const sampleLeads = [
    {
      address: "123 Main St, Charlotte, NC",
      sellerFirstName: "John",
      sellerLastName: "Doe",
      sellerPhone: "(555) 123-4567",
      sellerEmail: "john.doe@example.com",
      stageIndex: 0
    },
    {
      address: "456 Oak Ave, Raleigh, NC", 
      sellerFirstName: "Jane",
      sellerLastName: "Smith",
      sellerPhone: "(555) 234-5678",
      sellerEmail: "jane.smith@example.com",
      stageIndex: 1
    },
    {
      address: "789 Pine Rd, Durham, NC",
      sellerFirstName: "Mike",
      sellerLastName: "Johnson",
      sellerPhone: "(555) 345-6789",
      sellerEmail: "mike.johnson@example.com",
      stageIndex: 2
    },
    {
      address: "321 Elm St, Greensboro, NC",
      sellerFirstName: "Sarah",
      sellerLastName: "Wilson",
      sellerPhone: "(555) 456-7890",
      sellerEmail: "sarah.wilson@example.com",
      stageIndex: 3
    },
    {
      address: "654 Maple Dr, Winston-Salem, NC",
      sellerFirstName: "Tom",
      sellerLastName: "Anderson",
      sellerPhone: "(555) 567-8901",
      sellerEmail: "tom.anderson@example.com",
      stageIndex: 4
    }
  ];

  for (const leadData of sampleLeads) {
    const stageIndex = Math.min(leadData.stageIndex, acqPipeline.stages.length - 1);
    const stage = acqPipeline.stages[stageIndex];
    
    // Check if lead already exists
    const existingLead = await prisma.lead.findFirst({
      where: { 
        address: { address1: leadData.address }
      }
    });

    if (existingLead) {
      continue; // Skip if lead already exists
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        leadType: 'SELLER',
        marketId: market?.id,
        assignedUserId: adminUser.id,
        createdById: adminUser.id,
        pipelineStageId: stage.id,
        stageEnteredAt: new Date(),
        address: {
          create: {
            address1: leadData.address,
            city: "Charlotte",
            state: "NC", 
            zip: "28202",
            countyId: county?.id
          }
        },
        seller: {
          create: {
            firstName: leadData.sellerFirstName,
            lastName: leadData.sellerLastName,
            phone: leadData.sellerPhone,
            email: leadData.sellerEmail
          }
        }
      }
    });

    console.log(`Created sample lead: ${leadData.address} in stage: ${stage.name}`);
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
  await upsertLeadStatuses();
  await createSampleLeads();
  console.log('Seed complete.');
}

main().finally(async () => {
  await prisma.$disconnect();
});

