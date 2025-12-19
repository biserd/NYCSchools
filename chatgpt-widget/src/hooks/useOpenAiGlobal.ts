import { useSyncExternalStore } from 'react';
import { OpenAiGlobals, SET_GLOBALS_EVENT_TYPE, SetGlobalsEvent } from '../types/openai';

export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] | undefined {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: Event) => {
        const customEvent = event as SetGlobalsEvent;
        const value = customEvent.detail?.globals?.[key];
        if (value === undefined) {
          return;
        }
        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => window.openai?.[key]
  );
}

export function useToolInput() {
  return useOpenAiGlobal('toolInput');
}

export function useToolOutput() {
  return useOpenAiGlobal('toolOutput');
}

export function useToolResponseMetadata() {
  return useOpenAiGlobal('toolResponseMetadata');
}

export function useTheme() {
  return useOpenAiGlobal('theme') ?? 'light';
}

export function useDisplayMode() {
  return useOpenAiGlobal('displayMode') ?? 'inline';
}
