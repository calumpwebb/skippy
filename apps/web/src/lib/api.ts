import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export type ProtectedHandler<T = unknown> = (
  request: NextRequest,
  session: AuthenticatedSession,
  context?: T
) => Promise<Response> | Response;

export function protectedRoute<T = unknown>(
  handler: ProtectedHandler<T>
): (request: NextRequest, context?: T) => Promise<Response> {
  return async (request: NextRequest, context?: T): Promise<Response> => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(request, session as AuthenticatedSession, context);
  };
}
