import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getConversations } from './actions';

export default async function ChatPage(): Promise<React.ReactElement> {
  const conversations = await getConversations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chat</h1>
        <Button asChild>
          <Link href="/chat/new">New Chat</Link>
        </Button>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No conversations yet. Start a new chat with Skippy!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conversation => (
            <Link
              key={conversation.id}
              href={`/chat/${conversation.id}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <h3 className="font-medium">{conversation.title}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(conversation.updatedAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
