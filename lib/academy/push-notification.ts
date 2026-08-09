import { getMainPrisma } from "@/lib/db/main-prisma";

export interface PushNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export interface NotificationPreference {
  userId: string;
  courseUpdates: boolean;
  lessonReminders: boolean;
  quizResults: boolean;
  certificateIssued: boolean;
  waitlistUpdates: boolean;
  discussionReplies: boolean;
  promotional: boolean;
}

export async function sendPushNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<any> {
  const prisma = getMainPrisma();

  // Check user notification preferences
  const preferences = await getUserNotificationPreferences(userId);
  const shouldSend = shouldSendNotification(type, preferences);

  if (!shouldSend) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      channel: "PUSH",
      status: "SENT",
      subject: title,
      body,
    },
  });

  return {
    id: notification.id,
    userId: notification.userId,
    type,
    title,
    body,
    data: data || {},
    read: notification.status !== "QUEUED",
    createdAt: notification.createdAt,
  };
}

export async function getUserNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<PushNotification[]> {
  const prisma = getMainPrisma();

  const where: any = { userId };
  if (unreadOnly) {
    where.status = "QUEUED";
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications.map((n: any) => ({
    id: n.id,
    userId: n.userId,
    type: n.channel,
    title: n.subject,
    body: n.body,
    read: n.status !== "QUEUED",
    createdAt: n.createdAt,
  }));
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const prisma = getMainPrisma();

  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: "SENT", sentAt: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const prisma = getMainPrisma();

  await prisma.notification.updateMany({
    where: { userId, status: "QUEUED" },
    data: { status: "SENT", sentAt: new Date() },
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const prisma = getMainPrisma();

  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreference> {
  // Return default preferences since schema doesn't support custom storage
  return {
    userId,
    courseUpdates: true,
    lessonReminders: true,
    quizResults: true,
    certificateIssued: true,
    waitlistUpdates: true,
    discussionReplies: true,
    promotional: false,
  };
}

export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreference>
): Promise<NotificationPreference> {
  // Return updated preferences but note they won't persist
  // Schema doesn't support custom preference storage
  const defaultPrefs = await getUserNotificationPreferences(userId);
  return {
    ...defaultPrefs,
    ...preferences,
  };
}

function shouldSendNotification(
  type: string,
  preferences: NotificationPreference
): boolean {
  switch (type) {
    case "COURSE_UPDATE":
      return preferences.courseUpdates;
    case "LESSON_REMINDER":
      return preferences.lessonReminders;
    case "QUIZ_RESULT":
      return preferences.quizResults;
    case "CERTIFICATE_ISSUED":
      return preferences.certificateIssued;
    case "WAITLIST_UPDATE":
      return preferences.waitlistUpdates;
    case "DISCUSSION_REPLY":
      return preferences.discussionReplies;
    case "PROMOTIONAL":
      return preferences.promotional;
    default:
      return true;
  }
}

export async function sendCourseUpdateNotification(
  userId: string,
  courseId: string,
  courseTitle: string,
  updateMessage: string
): Promise<void> {
  await sendPushNotification(
    userId,
    "COURSE_UPDATE",
    `Course Update: ${courseTitle}`,
    updateMessage,
    { courseId, type: "course_update" }
  );
}

export async function sendLessonReminderNotification(
  userId: string,
  courseId: string,
  lessonTitle: string
): Promise<void> {
  await sendPushNotification(
    userId,
    "LESSON_REMINDER",
    "Lesson Reminder",
    `Don't forget to complete: ${lessonTitle}`,
    { courseId, type: "lesson_reminder" }
  );
}

export async function sendQuizResultNotification(
  userId: string,
  quizTitle: string,
  score: number,
  passed: boolean
): Promise<void> {
  const title = passed ? "Quiz Passed!" : "Quiz Results";
  const body = `You scored ${score}% on ${quizTitle}`;

  await sendPushNotification(
    userId,
    "QUIZ_RESULT",
    title,
    body,
    { type: "quiz_result", score, passed }
  );
}

export async function sendCertificateIssuedNotification(
  userId: string,
  courseTitle: string,
  certificateId: string
): Promise<void> {
  await sendPushNotification(
    userId,
    "CERTIFICATE_ISSUED",
    "Certificate Issued!",
    `Congratulations! You've earned a certificate for ${courseTitle}`,
    { certificateId, courseTitle, type: "certificate_issued" }
  );
}

export async function sendWaitlistUpdateNotification(
  userId: string,
  courseTitle: string,
  message: string
): Promise<void> {
  await sendPushNotification(
    userId,
    "WAITLIST_UPDATE",
    `Waitlist Update: ${courseTitle}`,
    message,
    { type: "waitlist_update" }
  );
}

export async function sendDiscussionReplyNotification(
  userId: string,
  postTitle: string,
  replyAuthor: string
): Promise<void> {
  await sendPushNotification(
    userId,
    "DISCUSSION_REPLY",
    "New Reply",
    `${replyAuthor} replied to your post: ${postTitle}`,
    { type: "discussion_reply" }
  );
}
