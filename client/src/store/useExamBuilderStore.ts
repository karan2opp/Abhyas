import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExamBuilderState {
  examId: string | null;
  step: 1 | 2;
  aiGeneratedQuestions: any[];
  
  // Actions
  setExamId: (id: string | null) => void;
  setStep: (step: 1 | 2) => void;
  setAiGeneratedQuestions: (questions: any[] | ((prev: any[]) => any[])) => void;
  clearAiGeneratedQuestions: () => void;
  resetStore: () => void;
}

export const useExamBuilderStore = create<ExamBuilderState>()(
  persist(
    (set) => ({
      examId: null,
      step: 1,
      aiGeneratedQuestions: [],
      
      setExamId: (id) => set({ examId: id }),
      setStep: (step) => set({ step }),
      setAiGeneratedQuestions: (questionsOrUpdater) => set((state) => {
        const nextQuestions = typeof questionsOrUpdater === 'function' 
          ? questionsOrUpdater(state.aiGeneratedQuestions) 
          : questionsOrUpdater;
        return { aiGeneratedQuestions: nextQuestions };
      }),
      clearAiGeneratedQuestions: () => set({ aiGeneratedQuestions: [] }),
      resetStore: () => set({ examId: null, step: 1, aiGeneratedQuestions: [] }),
    }),
    {
      name: 'exam-builder-storage', // name of item in storage
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage instead of localStorage
    }
  )
);
