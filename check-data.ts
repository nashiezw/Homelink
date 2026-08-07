import { getMainPrisma } from "./lib/db/main-prisma";

async function checkData() {
  const prisma = getMainPrisma();
  
  console.log("Checking database for data...");
  
  const userCount = await prisma.user.count();
  console.log(`Users: ${userCount}`);
  
  const listingCount = await prisma.listing.count();
  console.log(`Listings: ${listingCount}`);
  
  const courseCount = await prisma.trainingCourse.count();
  console.log(`Courses: ${courseCount}`);
  
  if (userCount > 0) {
    const users = await prisma.user.findMany({ take: 5 });
    console.log("Sample users:", users.map(u => ({ id: u.id, name: u.name, email: u.email })));
  }
  
  if (listingCount > 0) {
    const listings = await prisma.listing.findMany({ take: 5 });
    console.log("Sample listings:", listings.map(l => ({ id: l.id, title: l.title })));
  }
  
  if (courseCount > 0) {
    const courses = await prisma.trainingCourse.findMany({ take: 5 });
    console.log("Sample courses:", courses.map(c => ({ id: c.id, title: c.title })));
  }
  
  await prisma.$disconnect();
}

checkData().catch(console.error);
