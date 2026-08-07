import { getMainPrisma } from "@/lib/db/main-prisma";

export interface QuizAttemptEnhanced {
  id: string;
  quizId: string;
  agentId: string;
  score: number;
  answers: any;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  status: string;
  maxScore?: number;
  percentage?: number;
  passed?: boolean;
  feedback?: Record<string, string>;
}

export async function calculateQuizScore(quizId: string, answers: Record<string, any>): Promise<{
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  feedback: Record<string, string>;
}> {
  const prisma = getMainPrisma();
  
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true,
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  let totalScore = 0;
  let maxScore = 0;
  const feedback: Record<string, string> = {};

  for (const question of quiz.questions) {
    maxScore += question.points;
    const userAnswer = answers[question.id];
    
    let questionScore = 0;
    let questionFeedback = "";

    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      const correctAnswer = question.correctAnswer;
      if (userAnswer === correctAnswer) {
        questionScore = question.points;
        questionFeedback = "Correct!";
      } else {
        questionFeedback = `Incorrect. The correct answer is: ${correctAnswer}`;
      }
    } else if (question.type === "ESSAY") {
      // For essay answers, we'd need more sophisticated grading
      // For now, we'll mark as pending manual review
      questionScore = 0;
      questionFeedback = "Pending manual review";
    } else if (question.type === "MULTIPLE_ANSWER") {
      const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      
      const correctCount = correctAnswers.filter(a => userAnswers.includes(a)).length;
      const incorrectCount = userAnswers.filter(a => !correctAnswers.includes(a)).length;
      
      // Partial credit: correct answers - incorrect answers
      questionScore = Math.max(0, (correctCount - incorrectCount) / correctAnswers.length) * question.points;
      
      if (questionScore === question.points) {
        questionFeedback = "Correct!";
      } else if (questionScore > 0) {
        questionFeedback = `Partially correct. You got ${correctCount} out of ${correctAnswers.length} correct.`;
      } else {
        questionFeedback = `Incorrect. The correct answers are: ${correctAnswers.join(", ")}`;
      }
    } else {
      // For other question types, mark as pending review
      questionScore = 0;
      questionFeedback = "Pending manual review";
    }

    totalScore += questionScore;
    feedback[question.id] = questionFeedback;
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const passed = percentage >= quiz.passingPercentage;

  return {
    score: totalScore,
    maxScore,
    percentage: Math.round(percentage),
    passed,
    feedback,
  };
}

export async function submitQuizAttempt(
  quizId: string,
  agentId: string,
  answers: Record<string, any>
): Promise<QuizAttemptEnhanced> {
  const prisma = getMainPrisma();
  
  const { score, maxScore, percentage, passed, feedback } = await calculateQuizScore(quizId, answers);

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      agentId,
      score,
      answers,
      startedAt: new Date(),
      submittedAt: new Date(),
      gradedAt: new Date(),
      status: "GRADED",
    },
  });

  return {
    ...attempt,
    score: Number(attempt.score),
    maxScore,
    percentage,
    passed,
    feedback,
  };
}

export async function getQuizAttempts(quizId: string, agentId?: string): Promise<QuizAttemptEnhanced[]> {
  const prisma = getMainPrisma();
  
  const where: any = { quizId };
  if (agentId) {
    where.agentId = agentId;
  }

  const attempts = await prisma.quizAttempt.findMany({
    where,
    orderBy: { submittedAt: "desc" },
  });

  return attempts.map((attempt: any) => ({
    ...attempt,
    score: Number(attempt.score),
  }));
}

export async function getQuizStatistics(quizId: string): Promise<{
  totalAttempts: number;
  averageScore: number;
  passRate: number;
}> {
  const prisma = getMainPrisma();
  
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
  });

  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
    };
  }

  const totalAttempts = attempts.length;
  const averageScore = attempts.reduce((sum, a: any) => sum + Number(a.score), 0) / totalAttempts;
  
  // Calculate pass rate based on quiz passing percentage
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  const passingScore = quiz ? quiz.passingPercentage : 70;
  const passRate = attempts.filter((a: any) => Number(a.score) >= passingScore).length / totalAttempts * 100;

  return {
    totalAttempts,
    averageScore: Math.round(averageScore),
    passRate: Math.round(passRate),
  };
}

export async function getAgentQuizHistory(agentId: string): Promise<QuizAttemptEnhanced[]> {
  const prisma = getMainPrisma();
  
  const attempts = await prisma.quizAttempt.findMany({
    where: { agentId },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  return attempts.map((attempt: any) => ({
    ...attempt,
    score: Number(attempt.score),
  }));
}

export async function retryQuiz(attemptId: string): Promise<QuizAttemptEnhanced> {
  const prisma = getMainPrisma();
  
  const previousAttempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
  });

  if (!previousAttempt) {
    throw new Error("Quiz attempt not found");
  }

  // Create a new attempt based on the previous one
  const newAttempt = await prisma.quizAttempt.create({
    data: {
      quizId: previousAttempt.quizId,
      agentId: previousAttempt.agentId,
      score: 0,
      answers: {},
      startedAt: new Date(),
      submittedAt: null,
      gradedAt: null,
      status: "IN_PROGRESS",
    },
  });

  return {
    ...newAttempt,
    score: Number(newAttempt.score),
  };
}

