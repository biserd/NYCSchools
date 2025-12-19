export interface OpenAiGlobals {
  toolInput: Record<string, any>;
  toolOutput: Record<string, any>;
  toolResponseMetadata: Record<string, any>;
  widgetState: Record<string, any>;
  theme: 'light' | 'dark';
  displayMode: 'inline' | 'fullscreen' | 'pip';
  maxHeight: number;
  safeArea: { top: number; bottom: number; left: number; right: number };
  view: string;
  userAgent: string;
  locale: string;
  setWidgetState: (state: Record<string, any>) => void;
  callTool: (name: string, args: Record<string, any>) => Promise<void>;
  sendFollowUpMessage: (options: { prompt: string }) => Promise<void>;
  requestDisplayMode: (options: { mode: 'inline' | 'fullscreen' | 'pip' }) => Promise<void>;
  requestClose: () => void;
  openExternal: (options: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
}

declare global {
  interface Window {
    openai?: OpenAiGlobals;
  }
}

export const SET_GLOBALS_EVENT_TYPE = 'openai:set_globals';

export interface SetGlobalsEvent extends CustomEvent {
  detail: {
    globals: Partial<OpenAiGlobals>;
  };
}
