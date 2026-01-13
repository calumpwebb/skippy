'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { auth } from '@/lib/auth';
import type { Conversation, Message } from '@/db/schema';

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id ?? null;
}

export async function getConversations(): Promise<Conversation[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: string): Promise<ConversationWithMessages | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conversation || conversation.userId !== userId) {
    return null;
  }

  const conversationMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  return {
    ...conversation,
    messages: conversationMessages,
  };
}

export async function createConversation(): Promise<never> {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect('/login');
  }

  const id = nanoid();
  const now = new Date();

  await db.insert(conversations).values({
    id,
    userId,
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
  });

  redirect(`/chat/${id}`);
}
