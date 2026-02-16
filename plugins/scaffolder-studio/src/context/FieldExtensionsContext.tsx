import { createContext, useContext } from 'react';
import { FieldExtensionOptions } from '@backstage/plugin-scaffolder-react';

export const FieldExtensionsContext = createContext<FieldExtensionOptions[]>([]);

export const useFieldExtensions = () => useContext(FieldExtensionsContext);
