import { v4 as uuidv4 } from 'uuid';

export const getNodeBase = () => {
  const id = uuidv4();
  return {
    id,
    selected: true,
  };
};
