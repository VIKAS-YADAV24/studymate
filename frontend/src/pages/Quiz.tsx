import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuizSetup } from "@/components/QuizSetup";
import { QuizPlayer } from "@/components/QuizPlayer";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz, QuizDifficulty } from "@/lib/study-types";
import { getUserApiKey } from "@/hooks/use-api-key";

const QuizPage = () => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async (topic: string, difficulty: QuizDifficulty, numQuestions: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("quiz", {
        body: { topic, difficulty, numQuestions },
        headers: getUserApiKey() ? { "x-user-api-key": getUserApiKey()! } : {},
      });
      if (error) {
        toast.error((data as { error?: string } | undefined)?.error || error.message || "Failed to generate quiz");
        return;
      }
      if ((data as { error?: string } | undefined)?.error) {
        toast.error((data as { error?: string }).error!);
        return;
      }
      setQuiz(data as Quiz);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach the AI. Please try again.");
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
