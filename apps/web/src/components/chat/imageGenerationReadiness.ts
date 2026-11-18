import { createContext } from "react";

export interface GeneratedImageReadiness {
  readonly idsByPath: ReadonlyMap<string, readonly string[]>;
  readonly onSettled: (ids: readonly string[]) => void;
}

export const GeneratedImageSettledContext = createContext<GeneratedImageReadiness | null>(null);
