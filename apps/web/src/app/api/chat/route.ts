import { NextRequest, NextResponse } from 'next/server';
import { streamText, type ModelMessage } from 'ai';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { protectedRoute, type AuthenticatedSession } from '@/lib/api';
import { getModel } from '@/lib/ai';
import { createSkippyTools } from '@/lib/tools';
import { getToolContext } from '@/lib/data-loader';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';

const SYSTEM_PROMPT =
  'You are Skippy, a helpful assistant for Arc Raiders. You can search for items, ARCs (enemies), quests, traders, and events in the game.';

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
}

async function handleChat(request: NextRequest, session: AuthenticatedSession): Promise<Response> {
  const body = (await request.json()) as ChatRequestBody;
  const { messages: userMessages, conversationId: providedConversationId } = body;

  if (!userMessages || userMessages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
  }

  const userId = session.user.id;
  let conversationId = providedConversationId;

  // Create new conversation if none provided
  if (!conversationId) {
    conversationId = nanoid();
    const firstUserMessage = userMessages.find(message => message.role === 'user');
    const title = firstUserMessage?.content.slice(0, 100) ?? 'New conversation';

    await db.insert(conversations).values({
      id: conversationId,
      userId,
      title,
    });
  } else {
    // Verify user owns this conversation
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (existingConversation.length === 0 || existingConversation[0].userId !== userId) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
  }

  // Save the latest user message to DB
  const lastUserMessage = userMessages.findLast(message => message.role === 'user');
  if (lastUserMessage) {
    await db.insert(messages).values({
      id: nanoid(),
      conversationId,
      role: 'user',
      content: lastUserMessage.content,
    });
  }

  // Get tool context and create tools
  const toolContext = await getToolContext();
  const tools = createSkippyTools(toolContext);

  // Convert to ModelMessage format for AI SDK
  const modelMessages: ModelMessage[] = userMessages.map(message => ({
    role: message.role,
    content: message.content,
  }));

  // Store conversationId for use in onFinish
  const finalConversationId = conversationId;

  // Stream the response
  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    onFinish: async ({ text }) => {
      // Save assistant response to DB
      if (text) {
        await db.insert(messages).values({
          id: nanoid(),
          conversationId: finalConversationId,
          role: 'assistant',
          content: text,
        });
      }
    },
  });

  // Return the streaming response with conversationId header
  const response = result.toUIMessageStreamResponse({
    headers: {
      'X-Conversation-Id': conversationId,
    },
  });
  return response;
}

export const POST = protectedRoute(handleChat);
