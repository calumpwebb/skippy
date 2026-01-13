import { createConversation } from '../actions';

export default async function NewChatPage(): Promise<React.ReactElement> {
  // This will redirect, so this return is never reached
  return createConversation();
}
