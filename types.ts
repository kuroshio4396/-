export type CharacterRole = '主角' | '主要配角' | '反派BOSS' | '次要配角' | '群演';

export interface Character {
  id: string;
  name: string;
  description: string;
  role: CharacterRole;
}

export interface UserInputs {
  worldSetting: string;
  characters: Character[];
  plotSnippets: string;
  theme: string;
}

export interface ScriptAct {
  id?: string;
  title: string;
  description: string;
}

export interface ScriptPlan {
  id: string; // Unique ID for tracking
  title: string;
  logline: string; // One sentence summary
  synopsis: string; // Short summary
  tone: string; // e.g., Dark, Comedic, Fast-paced
  acts: ScriptAct[]; // Structure (Setup, Confrontation, Resolution)
  mainConflict: string;
}

export type AppView = 'input' | 'selection' | 'outline' | 'structure_editor';

export type AIProvider = 'default' | 'gemini' | 'deepseek';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string; // For OpenAI-compatible endpoints like DeepSeek
}