import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExamBuilderState {
  examId: string | null;
  step: 1 | 2 | 3;
  aiGeneratedQuestions: any[];
  isAddingSection: boolean;
  isAiMode: boolean;
  
  // Actions
  setExamId: (id: string | null) => void;
  setStep: (step: 1 | 2 | 3) => void;
  setAiGeneratedQuestions: (questions: any[] | ((prev: any[]) => any[])) => void;
  clearAiGeneratedQuestions: () => void;
  resetStore: () => void;
  setIsAddingSection: (val: boolean) => void;
  setIsAiMode: (val: boolean) => void;
}

export const useExamBuilderStore = create<ExamBuilderState>()(
  persist(
    (set) => ({
      examId: null,
      step: 1,
      aiGeneratedQuestions: [],
      isAddingSection: false,
      isAiMode: false,
      
      setExamId: (id) => set({ examId: id }),
      setStep: (step) => set({ step }),
      setAiGeneratedQuestions: (questionsOrUpdater) => set((state) => {
        const nextQuestions = typeof questionsOrUpdater === 'function' 
          ? questionsOrUpdater(state.aiGeneratedQuestions) 
          : questionsOrUpdater;
        return { aiGeneratedQuestions: nextQuestions };
      }),
      clearAiGeneratedQuestions: () => set({ aiGeneratedQuestions: [] }),
      resetStore: () => set({ examId: null, step: 1, aiGeneratedQuestions: [], isAddingSection: false, isAiMode: false }),
      setIsAddingSection: (val) => set({ isAddingSection: val }),
      setIsAiMode: (val) => set({ isAiMode: val }),
    }),
    {
      name: 'exam-builder-storage', // name of item in storage
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage instead of localStorage
    }
  )
);
