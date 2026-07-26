export type PublicQuizAnswer = {
  id: string;
  label: string;
  value: string;
};

export function toPublicShuffledAnswers<T extends PublicQuizAnswer>(answers: T[]) {
  return shuffleArray(answers.map((answer) => ({ id: answer.id, label: answer.label, value: answer.value })));
}

export function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
