export type ConversationType = 
  | 'conversation' 
  | 'technical' 
  | 'gaia';

export interface ConversationContext {
  type: ConversationType;
}
