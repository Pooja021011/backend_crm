import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_STATUSES = [
  {
    name: "New Lead",
    description: "Newly acquired lead, awaiting initial contact",
    color: "#3B82F6", // Blue
    orderIndex: 0,
    active: true,
    isDefault: true,
  },
  {
    name: "Contacted",
    description: "Initial contact has been made",
    color: "#10B981", // Green
    orderIndex: 1,
    active: true,
    isDefault: true,
  },
  {
    name: "Qualified",
    description: "Lead has been qualified and shows strong interest",
    color: "#8B5CF6", // Purple
    orderIndex: 2,
    active: true,
    isDefault: true,
  },
  {
    name: "In Negotiation",
    description: "Currently negotiating terms and conditions",
    color: "#F59E0B", // Orange
    orderIndex: 3,
    active: true,
    isDefault: false,
  },
  {
    name: "Contract Sent",
    description: "Contract has been sent to the lead",
    color: "#06B6D4", // Cyan
    orderIndex: 4,
    active: true,
    isDefault: false,
  },
  {
    name: "Closed Won",
    description: "Deal successfully closed",
    color: "#10B981", // Green
    orderIndex: 5,
    active: true,
    isDefault: true,
  },
  {
    name: "Closed Lost",
    description: "Deal was lost or lead is no longer interested",
    color: "#EF4444", // Red
    orderIndex: 6,
    active: true,
    isDefault: false,
  },
  {
    name: "On Hold",
    description: "Lead is temporarily on hold",
    color: "#6B7280", // Gray
    orderIndex: 7,
    active: true,
    isDefault: false,
  },
];

async function seedLeadStatuses() {
  console.log("🌱 Seeding lead statuses...");

  try {
    // Check if statuses already exist
    const existingCount = await prisma.leadStatus.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing lead statuses. Skipping seed...`);
      return;
    }

    // Create all default statuses
    for (const status of DEFAULT_STATUSES) {
      await prisma.leadStatus.create({
        data: status,
      });
      console.log(`✅ Created: ${status.name}`);
    }

    console.log(`\n✨ Successfully seeded ${DEFAULT_STATUSES.length} lead statuses!`);
  } catch (error) {
    console.error("❌ Error seeding lead statuses:", error);
    throw error;
  }
}

// Run the seed
seedLeadStatuses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
