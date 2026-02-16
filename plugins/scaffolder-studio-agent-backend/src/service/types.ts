import { UIMessage } from 'ai';

export type Conversation = {
  id: string;
  messages: UIMessage[];
  visual_template_id: string;
  created_at?: string;
  title?: string;
};
