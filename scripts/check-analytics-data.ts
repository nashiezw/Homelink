import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAnalyticsData() {
  console.log('=== Checking Academy Analytics Data ===\n');

  // Check users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerifiedAt: true,
    },
    take: 10,
  });
  console.log(`Total users: ${await prisma.user.count()}`);
  console.log('Sample users:', users.map(u => ({ id: u.id, email: u.email, name: u.name, verified: !!u.emailVerifiedAt })));

  // Check training courses
  const courses = await prisma.trainingCourse.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      _count: {
        select: {
          enrolments: true,
          progress: true,
          certificateIssues: true,
        },
      },
    },
    take: 10,
  });
  console.log(`\nTotal courses: ${await prisma.trainingCourse.count()}`);
  console.log('Sample courses:', courses.map(c => ({ id: c.id, title: c.title, status: c.status, enrolments: c._count.enrolments, progress: c._count.progress, certificates: c._count.certificateIssues })));

  // Check course enrolments
  const enrolments = await prisma.courseEnrolment.findMany({
    select: {
      id: true,
      courseId: true,
      agentId: true,
      status: true,
      enrolledAt: true,
    },
    take: 10,
  });
  console.log(`\nTotal enrolments: ${await prisma.courseEnrolment.count()}`);
  console.log('Sample enrolments:', enrolments.map(e => ({ id: e.id, courseId: e.courseId, agentId: e.agentId, status: e.status, enrolledAt: e.enrolledAt })));

  // Check course progress
  const progress = await prisma.courseProgress.findMany({
    select: {
      id: true,
      courseId: true,
      agentId: true,
      status: true,
      percentComplete: true,
      averageScore: true,
      completedAt: true,
    },
    take: 10,
  });
  console.log(`\nTotal course progress records: ${await prisma.courseProgress.count()}`);
  console.log('Sample progress:', progress.map(p => ({ id: p.id, courseId: p.courseId, agentId: p.agentId, status: p.status, percentComplete: p.percentComplete, averageScore: p.averageScore, completedAt: p.completedAt })));

  // Check lesson progress
  const lessonProgress = await prisma.lessonProgress.findMany({
    select: {
      id: true,
      lessonId: true,
      agentId: true,
      status: true,
      percentComplete: true,
      lastViewedAt: true,
    },
    take: 10,
  });
  console.log(`\nTotal lesson progress records: ${await prisma.lessonProgress.count()}`);
  console.log('Sample lesson progress:', lessonProgress.map(lp => ({ id: lp.id, lessonId: lp.lessonId, agentId: lp.agentId, status: lp.status, percentComplete: lp.percentComplete, lastViewedAt: lp.lastViewedAt })));

  // Check certificate issues
  const certificates = await prisma.certificateIssue.findMany({
    select: {
      id: true,
      courseId: true,
      agentId: true,
      issuedAt: true,
    },
    take: 10,
  });
  console.log(`\nTotal certificates: ${await prisma.certificateIssue.count()}`);
  console.log('Sample certificates:', certificates.map(c => ({ id: c.id, courseId: c.courseId, agentId: c.agentId, issuedAt: c.issuedAt })));

  console.log('\n=== Checking Library Analytics Data ===\n');

  // Check library products
  const products = await prisma.libraryProduct.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      viewCount: true,
      downloadCount: true,
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
    take: 10,
  });
  console.log(`Total library products: ${await prisma.libraryProduct.count()}`);
  console.log('Sample products:', products.map(p => ({ id: p.id, title: p.title, status: p.status, views: p.viewCount, downloads: p.downloadCount, orderItems: p._count.orderItems })));

  // Check library orders
  const orders = await prisma.libraryOrder.findMany({
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
    take: 10,
  });
  console.log(`\nTotal library orders: ${await prisma.libraryOrder.count()}`);
  console.log('Sample orders:', orders.map(o => ({ id: o.id, status: o.status, total: o.total, createdAt: o.createdAt, items: o._count.items })));

  // Check library download access
  const downloads = await prisma.libraryDownloadAccess.findMany({
    select: {
      id: true,
      productId: true,
      createdAt: true,
    },
    take: 10,
  });
  console.log(`\nTotal download access records: ${await prisma.libraryDownloadAccess.count()}`);
  console.log('Sample downloads:', downloads.map(d => ({ id: d.id, productId: d.productId, createdAt: d.createdAt })));

  await prisma.$disconnect();
}

checkAnalyticsData().catch(console.error);
