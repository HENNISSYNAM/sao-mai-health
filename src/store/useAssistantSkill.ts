import { create } from "zustand";

export type AssistantSkill = "general" | "triage" | "doctor";

interface AssistantSkillState {
  isOpen: boolean;
  skill: AssistantSkill;
  /** Optional pre-fill text sent to the assistant when opened. */
  prefill: string;
  open: (skill?: AssistantSkill, prefill?: string) => void;
  close: () => void;
  setSkill: (skill: AssistantSkill) => void;
  consumePrefill: () => string;
}

export const useAssistantSkill = create<AssistantSkillState>((set, get) => ({
  isOpen: false,
  skill: "general",
  prefill: "",
  open: (skill = "general", prefill = "") => set({ isOpen: true, skill, prefill }),
  close: () => set({ isOpen: false }),
  setSkill: (skill) => set({ skill }),
  consumePrefill: () => {
    const p = get().prefill;
    if (p) set({ prefill: "" });
    return p;
  },
}));
