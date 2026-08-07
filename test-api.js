const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  console.log("Testing database queries...");
  
  // Test listings
  const listings = await prisma.listing.findMany({ take: 5 });
  console.log(`Listings found: ${listings.length}`);
  console.log("First listing:", listings[0] ? { id: listings[0].id, title: listings[0].title, status: listings[0].status } : null);
  
  // Test users with roles
  const agents = await prisma.user.findMany({ where: { roles: { has: "AGENT" } }, take: 5 });
  console.log(`Agents found: ${agents.length}`);
  console.log("Agents:", agents.map(a => ({ id: a.id, name: a.name, roles: a.roles })));
  
  // Test all users
  const allUsers = await prisma.user.findMany({ take: 5 });
  console.log(`All users found: ${allUsers.length}`);
  console.log("Users:", allUsers.map(u => ({ id: u.id, name: u.name, roles: u.roles })));
  
  await prisma.$disconnect();
}

testAPI().catch(console.error);
