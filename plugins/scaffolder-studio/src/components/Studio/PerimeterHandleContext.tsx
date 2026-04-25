import { createContext, useContext } from 'react';
import type { Connection } from '@xyflow/react';

export type PerimeterHandleContextValue = {
  selectedNodeId?: string;
  connectionInProgress: boolean;
  connectingNodeId?: string;
  connectingHandleId?: string | null;
  connectingHandleType?: 'source' | 'target' | null;
  isValidConnection: (connection: Connection) => boolean;
};

const EMPTY_CONTEXT: PerimeterHandleContextValue = {
  connectionInProgress: false,
  isValidConnection: () => false,
};

export const PerimeterHandleContext =
  createContext<PerimeterHandleContextValue>(EMPTY_CONTEXT);

export const usePerimeterHandleContext = (): PerimeterHandleContextValue =>
  useContext(PerimeterHandleContext);
