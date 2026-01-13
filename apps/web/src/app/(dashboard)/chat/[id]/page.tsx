import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat/chat';
import { getConversation } from '../actions';
import type { UIMessage } from 'ai';

interface ChatDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatDetailPage({
  params,
}: ChatDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const conversation = await getConversation(id);

  if (!conversation) {
    notFound();
  }

  const initialMessages: UIMessage[] = conversation.messages.map(message => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    parts: [{ type: 'text' as const, text: message.content }],
  }));

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="font-semibold">{conversation.title}</h1>
      </div>
      <div className="flex-1">
        <Chat conversationId={id} initialMessages={initialMessages} />
      </div>
    </div>
  );
}
