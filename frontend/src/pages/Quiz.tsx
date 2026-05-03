import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuizSetup } from "@/components/QuizSetup";
import { QuizPlayer } from "@/components/QuizPlayer";
import { generateQuiz } from "@/lib/anthropic";
import type { Quiz, QuizDifficulty } from "@/lib/study-types";

const QuizPage = () => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async (topic: string, difficulty: QuizDifficulty, numQuestions: number) => {
    setIsLoading(true);
    try {
      const data = await generateQuiz(topic, difficulty, numQuestions);
      setQuiz(data as Quiz);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reach the AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      {() => (
        <div className="h-full overflow-y-auto scrollbar-thin">
          <div className="px-4 py-8 md:py-12">
            {quiz ? (
              <QuizPlayer quiz={quiz} onRestart={() => { /* internal reset */ }} onNew={() => setQuiz(null)} />
            ) : (
              <QuizSetup isLoading={isLoading} onGenerate={generate} />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default QuizPage;
