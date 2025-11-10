
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  role: MessageRole;
  text: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  starterPrompt: string;
}
