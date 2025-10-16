import { PrismaClient, RoleName, LeadType, CommType, Direction, TaskStatus } from '@prisma/client';
import 'dotenv/config';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// Helper to get a random date within the last N days
function getRandomDate(daysAgo: number): Date {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  const date = new Date(now);
  date.setDate(date.getDate() - randomDays);
  date.setHours(date.getHours() - randomHours);
  date.setMinutes(date.getMinutes() - randomMinutes);
  return date;
}

// Helper to get random element from array
function random<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function createAgents() {
  console.log('Creating test agents...');
  
  const password = await argon2.hash('Test@123');
  
  // Get ACQ and DISP roles
  const acqRole = await prisma.role.findUnique({ where: { name: RoleName.ACQ } });
  const dispRole = await prisma.role.findUnique({ where: { name: RoleName.DISP } });
  
  if (!acqRole || !dispRole) {
    throw new Error('Roles not found. Please run main seed first.');
  }

  // Create 4 Acquisition Agents
  const acqAgents = [
    { firstName: 'Michael', lastName: 'Rodriguez', email: 'michael.rodriguez@test.com', phone: '(555) 101-2001' },
    { firstName: 'Sarah', lastName: 'Thompson', email: 'sarah.thompson@test.com', phone: '(555) 102-2002' },
    { firstName: 'David', lastName: 'Chen', email: 'david.chen@test.com', phone: '(555) 103-2003' },
    { firstName: 'Emily', lastName: 'Martinez', email: 'emily.martinez@test.com', phone: '(555) 104-2004' },
  ];

  const createdAcqAgents = [];
  for (const agent of acqAgents) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        ...agent,
        passwordHash: password,
        status: 'active',
        roles: {
          create: [{ roleId: acqRole.id }]
        }
      }
    });
    createdAcqAgents.push(user);
    console.log(`Created ACQ agent: ${agent.firstName} ${agent.lastName}`);
  }

  // Create 4 Disposition Agents
  const dispAgents = [
    { firstName: 'Jennifer', lastName: 'Williams', email: 'jennifer.williams@test.com', phone: '(555) 201-3001' },
    { firstName: 'Robert', lastName: 'Davis', email: 'robert.davis@test.com', phone: '(555) 202-3002' },
    { firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@test.com', phone: '(555) 203-3003' },
    { firstName: 'James', lastName: 'Taylor', email: 'james.taylor@test.com', phone: '(555) 204-3004' },
  ];

  const createdDispAgents = [];
  for (const agent of dispAgents) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        ...agent,
        passwordHash: password,
        status: 'active',
        roles: {
          create: [{ roleId: dispRole.id }]
        }
      }
    });
    createdDispAgents.push(user);
    console.log(`Created DISP agent: ${agent.firstName} ${agent.lastName}`);
  }

  return { acqAgents: createdAcqAgents, dispAgents: createdDispAgents };
}

async function createLeadsWithActivities(agents: { acqAgents: any[], dispAgents: any[] }) {
  console.log('Creating test leads with activities...');
  
  // Get necessary data
  const acqPipeline = await prisma.pipelineDefinition.findUnique({
    where: { key: 'ACQUISITIONS' },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  });

  const leadStatuses = await prisma.leadStatus.findMany();
  const market = await prisma.market.findFirst();
  const county = await prisma.county.findFirst();
  const leadSources = await prisma.leadSource.findMany();

  if (!acqPipeline || !market || !county) {
    throw new Error('Required data not found. Please run main seed first.');
  }

  // Lead data template
  const leadTemplates = [
    // New Leads (Stage 0-1)
    { address: '1234 Oakwood Drive', city: 'Charlotte', state: 'NC', zip: '28202', firstName: 'Robert', lastName: 'Johnson', phone: '(704) 555-1001', email: 'robert.johnson@email.com', stageIdx: 0 },
    { address: '2456 Maple Street', city: 'Raleigh', state: 'NC', zip: '27601', firstName: 'Patricia', lastName: 'Williams', phone: '(919) 555-1002', email: 'patricia.williams@email.com', stageIdx: 0 },
    { address: '3678 Pine Avenue', city: 'Durham', state: 'NC', zip: '27701', firstName: 'Michael', lastName: 'Brown', phone: '(919) 555-1003', email: 'michael.brown@email.com', stageIdx: 1 },
    { address: '4890 Cedar Lane', city: 'Greensboro', state: 'NC', zip: '27401', firstName: 'Linda', lastName: 'Davis', phone: '(336) 555-1004', email: 'linda.davis@email.com', stageIdx: 1 },
    
    // Contact Made (Stage 2-3)
    { address: '5432 Birch Road', city: 'Winston-Salem', state: 'NC', zip: '27101', firstName: 'William', lastName: 'Miller', phone: '(336) 555-1005', email: 'william.miller@email.com', stageIdx: 2 },
    { address: '6754 Elm Court', city: 'Fayetteville', state: 'NC', zip: '28301', firstName: 'Elizabeth', lastName: 'Wilson', phone: '(910) 555-1006', email: 'elizabeth.wilson@email.com', stageIdx: 2 },
    { address: '7876 Walnut Way', city: 'Charlotte', state: 'NC', zip: '28203', firstName: 'David', lastName: 'Moore', phone: '(704) 555-1007', email: 'david.moore@email.com', stageIdx: 3 },
    { address: '8998 Cherry Circle', city: 'Raleigh', state: 'NC', zip: '27602', firstName: 'Jennifer', lastName: 'Taylor', phone: '(919) 555-1008', email: 'jennifer.taylor@email.com', stageIdx: 3 },
    
    // Appointment Set/Complete (Stage 4-5)
    { address: '9123 Spruce Boulevard', city: 'Durham', state: 'NC', zip: '27702', firstName: 'James', lastName: 'Anderson', phone: '(919) 555-1009', email: 'james.anderson@email.com', stageIdx: 4 },
    { address: '1357 Willow Path', city: 'Greensboro', state: 'NC', zip: '27402', firstName: 'Mary', lastName: 'Thomas', phone: '(336) 555-1010', email: 'mary.thomas@email.com', stageIdx: 4 },
    { address: '2468 Cypress Street', city: 'Winston-Salem', state: 'NC', zip: '27102', firstName: 'John', lastName: 'Jackson', phone: '(336) 555-1011', email: 'john.jackson@email.com', stageIdx: 5 },
    { address: '3579 Redwood Drive', city: 'Charlotte', state: 'NC', zip: '28204', firstName: 'Barbara', lastName: 'White', phone: '(704) 555-1012', email: 'barbara.white@email.com', stageIdx: 5 },
    
    // Due Diligence/Offer Made (Stage 6-7)
    { address: '4680 Hickory Lane', city: 'Fayetteville', state: 'NC', zip: '28302', firstName: 'Richard', lastName: 'Harris', phone: '(910) 555-1013', email: 'richard.harris@email.com', stageIdx: 6 },
    { address: '5791 Dogwood Court', city: 'Raleigh', state: 'NC', zip: '27603', firstName: 'Susan', lastName: 'Martin', phone: '(919) 555-1014', email: 'susan.martin@email.com', stageIdx: 6 },
    { address: '6802 Magnolia Avenue', city: 'Durham', state: 'NC', zip: '27703', firstName: 'Joseph', lastName: 'Thompson', phone: '(919) 555-1015', email: 'joseph.thompson@email.com', stageIdx: 7 },
    { address: '7913 Sycamore Way', city: 'Charlotte', state: 'NC', zip: '28205', firstName: 'Jessica', lastName: 'Garcia', phone: '(704) 555-1016', email: 'jessica.garcia@email.com', stageIdx: 7 },
    
    // Contract Sent/Under Contract (Stage 8)
    { address: '8024 Beech Street', city: 'Greensboro', state: 'NC', zip: '27403', firstName: 'Charles', lastName: 'Martinez', phone: '(336) 555-1017', email: 'charles.martinez@email.com', stageIdx: 8 },
    { address: '9135 Poplar Road', city: 'Winston-Salem', state: 'NC', zip: '27103', firstName: 'Karen', lastName: 'Robinson', phone: '(336) 555-1018', email: 'karen.robinson@email.com', stageIdx: 8 },
    { address: '1246 Ash Circle', city: 'Fayetteville', state: 'NC', zip: '28303', firstName: 'Thomas', lastName: 'Clark', phone: '(910) 555-1019', email: 'thomas.clark@email.com', stageIdx: 8 },
    { address: '2357 Laurel Drive', city: 'Charlotte', state: 'NC', zip: '28206', firstName: 'Nancy', lastName: 'Rodriguez', phone: '(704) 555-1020', email: 'nancy.rodriguez@email.com', stageIdx: 8 },
  ];

  const createdLeads = [];

  for (const template of leadTemplates) {
    const assignedAgent = random(agents.acqAgents);
    const stage = acqPipeline.stages[Math.min(template.stageIdx, acqPipeline.stages.length - 1)];
    const createdDate = getRandomDate(30); // Created within last 30 days
    const leadSource = random(leadSources);
    const leadStatus = random(leadStatuses);

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        leadType: LeadType.SELLER,
        marketId: market.id,
        assignedUserId: assignedAgent.id,
        createdById: assignedAgent.id,
        pipelineStageId: stage.id,
        leadStatusId: leadStatus.id,
        leadSourceId: leadSource.id,
        stageEnteredAt: getRandomDate(7),
        lastContactAt: getRandomDate(3),
        createdAt: createdDate,
        customFields: {
          propertyType: random(['Single Family', 'Multi Family', 'Townhouse', 'Condo']),
          sqft: Math.floor(Math.random() * 2000) + 1000,
          bedrooms: Math.floor(Math.random() * 4) + 2,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          yearBuilt: Math.floor(Math.random() * 50) + 1970,
          leadSourceData: {
            condition: random(['Excellent', 'Good', 'Fair', 'Poor']),
            motivation: random(['High', 'Medium', 'Low']),
            timeline: random(['Immediate', '30 Days', '60 Days', '90+ Days']),
            askingPrice: Math.floor(Math.random() * 300000) + 100000
          }
        },
        address: {
          create: {
            address1: template.address,
            city: template.city,
            state: template.state,
            zip: template.zip,
            countyId: county.id
          }
        },
        seller: {
          create: {
            firstName: template.firstName,
            lastName: template.lastName,
            phone: template.phone,
            email: template.email,
            motivation: random(['Foreclosure', 'Relocation', 'Downsizing', 'Inherited Property', 'Financial Hardship'])
          }
        }
      }
    });

    createdLeads.push(lead);
    console.log(`Created lead: ${template.address} - Stage: ${stage.name} - Agent: ${assignedAgent.firstName}`);

    // Add stage history
    await prisma.stageHistory.create({
      data: {
        leadId: lead.id,
        toStageId: stage.id,
        changedById: assignedAgent.id,
        changedAt: createdDate
      }
    });

    // Add communications based on stage
    const commsCount = Math.min(template.stageIdx + 1, 5); // More communications for advanced stages
    
    for (let i = 0; i < commsCount; i++) {
      const commDate = getRandomDate(Math.max(1, 30 - template.stageIdx * 3));
      
      // SMS
      if (Math.random() > 0.3) {
        await prisma.communication.create({
          data: {
            leadId: lead.id,
            type: CommType.SMS,
            direction: i % 2 === 0 ? Direction.OUTBOUND : Direction.INBOUND,
            body: i % 2 === 0 
              ? random([
                  `Hi ${template.firstName}, this is ${assignedAgent.firstName}. I wanted to follow up on your property at ${template.address}. Are you still interested in selling?`,
                  `Hello! Just checking in to see if you had any questions about the offer we discussed.`,
                  `Hi ${template.firstName}, when would be a good time to schedule a walkthrough?`,
                  `Thank you for your interest. I'll send over the paperwork shortly.`
                ])
              : random([
                  'Yes, I am still interested. What are the next steps?',
                  'Can we discuss this tomorrow? I need to talk to my spouse first.',
                  'I received your message. Let me review and get back to you.',
                  'That time works for me. See you then!'
                ]),
            occurredAt: commDate,
            createdById: assignedAgent.id,
            createdAt: commDate
          }
        });
      }

      // CALL
      if (Math.random() > 0.5) {
        await prisma.communication.create({
          data: {
            leadId: lead.id,
            type: CommType.CALL,
            direction: Direction.OUTBOUND,
            subject: random(['Initial Contact', 'Follow-up Call', 'Appointment Confirmation', 'Offer Discussion']),
            body: `Call duration: ${Math.floor(Math.random() * 20) + 5} minutes. ${random([
              'Discussed property condition and motivation to sell.',
              'Set up appointment for property walkthrough.',
              'Reviewed offer details and answered questions.',
              'Confirmed closing timeline and next steps.'
            ])}`,
            occurredAt: commDate,
            createdById: assignedAgent.id,
            createdAt: commDate
          }
        });
      }

      // NOTE
      if (i === 0 || Math.random() > 0.6) {
        await prisma.communication.create({
          data: {
            leadId: lead.id,
            type: CommType.NOTE,
            direction: Direction.OUTBOUND,
            body: random([
              `Initial contact made. ${template.firstName} seems motivated to sell due to ${random(['job relocation', 'downsizing', 'financial reasons', 'inherited property'])}.`,
              `Property walkthrough completed. Estimated repairs needed: $${Math.floor(Math.random() * 30000) + 10000}.`,
              `Submitted offer of $${Math.floor(Math.random() * 200000) + 100000}. Waiting for response.`,
              `Contract signed! Scheduled closing for ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}.`,
              `Follow-up needed in 3 days to discuss inspection results.`
            ]),
            occurredAt: commDate,
            createdById: assignedAgent.id,
            createdAt: commDate
          }
        });
      }
    }

    // Add tasks for leads in active stages
    if (template.stageIdx >= 2 && template.stageIdx <= 7) {
      const tasksToCreate = Math.floor(Math.random() * 3) + 1;
      
      for (let t = 0; t < tasksToCreate; t++) {
        const taskStatus = Math.random() > 0.4 ? TaskStatus.DONE : TaskStatus.OPEN;
        const dueDate = taskStatus === TaskStatus.DONE 
          ? getRandomDate(5) 
          : new Date(Date.now() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000);

        await prisma.task.create({
          data: {
            leadId: lead.id,
            title: random([
              'Schedule property inspection',
              'Prepare purchase agreement',
              'Follow up on repair estimates',
              'Send comps analysis',
              'Review title report',
              'Coordinate closing date',
              'Submit earnest money deposit'
            ]),
            description: random([
              'Need to coordinate with the seller',
              'Waiting on third-party vendor',
              'High priority - deadline approaching',
              'Standard follow-up task'
            ]),
            dueAt: dueDate,
            status: taskStatus,
            assignedToId: assignedAgent.id,
            createdById: assignedAgent.id,
            createdAt: getRandomDate(10)
          }
        });
      }
    }

    // Add underwriting scenario for leads in later stages
    if (template.stageIdx >= 5) {
      const purchasePrice = Math.floor(Math.random() * 200000) + 100000;
      const arv = purchasePrice + Math.floor(Math.random() * 100000) + 50000;
      const rehabCost = Math.floor(Math.random() * 40000) + 10000;
      const estimatedProfit = arv - purchasePrice - rehabCost - (purchasePrice * 0.1); // 10% holding costs

      await prisma.underwritingScenario.create({
        data: {
          leadId: lead.id,
          name: 'Primary Analysis',
          isPrimary: true,
          inputs: {
            purchasePrice,
            arv,
            rehabCost,
            holdingTime: 6,
            closingCosts: purchasePrice * 0.03
          },
          outputs: {
            estimatedProfit,
            roi: ((estimatedProfit / purchasePrice) * 100).toFixed(2),
            cashOnCash: ((estimatedProfit / (purchasePrice * 0.2)) * 100).toFixed(2)
          },
          createdById: assignedAgent.id,
          createdAt: getRandomDate(15)
        }
      });
    }
  }

  console.log(`Created ${createdLeads.length} leads with activities`);
  return createdLeads;
}

async function createComparables(leads: any[]) {
  console.log('Creating comparable properties...');
  
  const cities = ['Charlotte', 'Raleigh', 'Durham', 'Greensboro', 'Winston-Salem', 'Fayetteville'];
  const compCount = 20;

  for (let i = 0; i < compCount; i++) {
    const city = random(cities);
    const comparable = await prisma.comparable.create({
      data: {
        address: `${Math.floor(Math.random() * 9000) + 1000} Comp Street ${i+1}`,
        city,
        state: 'NC',
        zip: `${27000 + Math.floor(Math.random() * 900)}`,
        beds: Math.floor(Math.random() * 4) + 2,
        baths: Math.floor(Math.random() * 3) + 1,
        sqft: Math.floor(Math.random() * 2000) + 1000,
        yearBuilt: Math.floor(Math.random() * 50) + 1970,
        salePrice: Math.floor(Math.random() * 300000) + 150000,
        dom: Math.floor(Math.random() * 90) + 10,
        dateSold: getRandomDate(180),
        createdAt: getRandomDate(200)
      }
    });

    // Link to random leads (2-4 comps per comparable)
    const numLeadsToLink = Math.floor(Math.random() * 3) + 2;
    const selectedLeads = leads.sort(() => 0.5 - Math.random()).slice(0, numLeadsToLink);

    for (const lead of selectedLeads) {
      await prisma.leadComparable.create({
        data: {
          leadId: lead.id,
          comparableId: comparable.id,
          addedAt: getRandomDate(30)
        }
      });
    }
  }

  console.log(`Created ${compCount} comparable properties`);
}

async function main() {
  console.log('🚀 Starting comprehensive test data seed...\n');

  try {
    // Create agents
    const agents = await createAgents();
    console.log('');

    // Create leads with activities
    const leads = await createLeadsWithActivities(agents);
    console.log('');

    // Create comparables
    await createComparables(leads);
    console.log('');

    console.log('✅ Test data seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ACQ Agents: ${agents.acqAgents.length}`);
    console.log(`- DISP Agents: ${agents.dispAgents.length}`);
    console.log(`- Leads Created: ${leads.length}`);
    console.log(`- Communications: ${leads.length * 3} (approx)`);
    console.log(`- Comparables: 20`);
    console.log('\n🔐 Test Agent Credentials:');
    console.log('Email: Any agent email (e.g., michael.rodriguez@test.com)');
    console.log('Password: Test@123');

  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

