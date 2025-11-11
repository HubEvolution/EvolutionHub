import type { APIRoute } from 'astro';
import { z } from 'zod';
import { formatZodError } from '@/lib/validation';
import { loggerFactory } from '@/server/utils/logger-factory';

// Logger-Instanzen erstellen
const logger = loggerFactory.createLogger('newsletter-confirm');
const securityLogger = loggerFactory.createSecurityLogger();

// Validation schema for confirmation request
const confirmationSchema = z.object({
  token: z.string().min(32, 'Invalid token format'),
  email: z.string().email('Invalid email format').optional(),
});

// Mock database operations - replace with actual database calls
interface PendingSubscription {
  email: string;
  token: string;
  createdAt: Date;
  source?: string;
  consent: boolean;
}

// Mock storage for pending subscriptions
// In production, this should be stored in a database (D1, KV, etc.)
const pendingSubscriptions = new Map<string, PendingSubscription>();

/**
 * Newsletter subscription confirmation endpoint
 * Handles double opt-in email confirmations
 */
export const GET: APIRoute = async ({ request: _request, url }) => {
  const searchParams = url.searchParams;
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  try {
    // Validate query parameters
    const validation = confirmationSchema.safeParse({ token, email });
    if (!validation.success) {
      logger.warn('Validation failed for newsletter confirmation', {
        metadata: {
          errors: validation.error.errors,
          hasToken: !!token,
          email: email || undefined,
        },
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid confirmation link',
          details: formatZodError(validation.error),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { token: validToken } = validation.data;

    // Find pending subscription by token
    const pending = pendingSubscriptions.get(validToken);
    if (!pending) {
      securityLogger.logSecurityEvent('USER_EVENT', {
        action: 'newsletter_confirmation_token_not_found',
        tokenHash: validToken.substring(0, 8) + '...',
        email: email || undefined,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Confirmation link expired or invalid',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - pending.createdAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (tokenAge > maxAge) {
      securityLogger.logSecurityEvent('USER_EVENT', {
        action: 'newsletter_confirmation_token_expired',
        tokenHash: validToken.substring(0, 8) + '...',
        tokenAge: tokenAge,
        maxAge: maxAge,
        email: pending.email,
      });
      // Clean up expired token
      pendingSubscriptions.delete(validToken);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Confirmation link has expired. Please subscribe again.',
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email if provided
    if (email && email !== pending.email) {
      logger.warn('Email mismatch in newsletter confirmation', {
        metadata: {
          providedEmail: email,
          storedEmail: pending.email,
          tokenHash: validToken.substring(0, 8) + '...',
        },
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email address does not match confirmation link',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Save confirmed subscription to actual newsletter database
    logger.info('Newsletter subscription confirmed successfully', {
      metadata: {
        email: pending.email,
        source: pending.source,
        consent: pending.consent,
        tokenHash: validToken.substring(0, 8) + '...',
      },
    });

    // Analytics event tracking (stubbed for now)
    logger.info('Newsletter confirmation analytics event', {
      metadata: {
        event: 'newsletter_confirmed',
        email: pending.email,
        source: pending.source || 'unknown',
        timestamp: new Date().toISOString(),
        tokenHash: validToken.substring(0, 8) + '...',
      },
    });

    // Clean up confirmed token
    pendingSubscriptions.delete(validToken);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email address confirmed successfully! You are now subscribed to our newsletter.',
        email: pending.email,
        subscription_date: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error confirming newsletter subscription', {
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // Generischer Server-Fehler
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during confirmation',
        message: 'Please try again later or contact support if the problem persists.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Utility function to create pending subscription
// This will be called from the main newsletter subscribe API
export function createPendingSubscription(email: string, source?: string): string {
  // Generate secure random token
  const token = generateSecureToken();

  const pendingSubscription: PendingSubscription = {
    email,
    token,
    createdAt: new Date(),
    source: source || 'website',
    consent: true,
  };

  // Store pending subscription
  pendingSubscriptions.set(token, pendingSubscription);

  securityLogger.logSecurityEvent('USER_EVENT', {
    action: 'newsletter_pending_subscription_created',
    email: email,
    tokenHash: token.substring(0, 8) + '...',
    source: source || 'website',
  });

  return token;
}

// Utility function to generate secure token
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  // Generate 64-character token
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Add timestamp component for uniqueness
  return token + Date.now().toString(36);
}

// Utility function to cleanup expired tokens (should be called periodically)
export function cleanupExpiredTokens(): number {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  let cleanedCount = 0;

  for (const [token, subscription] of pendingSubscriptions.entries()) {
    if (now - subscription.createdAt.getTime() > maxAge) {
      pendingSubscriptions.delete(token);
      cleanedCount++;
    }
  }

  logger.info('Newsletter token cleanup completed', {
    metadata: {
      cleanedCount: cleanedCount,
      remainingTokens: pendingSubscriptions.size,
      maxAgeHours: 24,
    },
  });
  return cleanedCount;
}
