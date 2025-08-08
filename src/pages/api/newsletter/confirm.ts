import type { APIRoute } from 'astro';
import { z } from 'zod';

// Validation schema for confirmation request
const confirmationSchema = z.object({
  token: z.string().min(32, 'Invalid token format'),
  email: z.string().email('Invalid email format').optional()
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
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = url.searchParams;
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    // Validate query parameters
    const validation = confirmationSchema.safeParse({ token, email });
    if (!validation.success) {
      console.log('Validation failed:', validation.error.errors);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid confirmation link',
        details: validation.error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { token: validToken } = validation.data;

    // Find pending subscription by token
    const pending = pendingSubscriptions.get(validToken);
    if (!pending) {
      console.log('Token not found:', validToken);
      return new Response(JSON.stringify({
        success: false,
        error: 'Confirmation link expired or invalid'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - pending.createdAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (tokenAge > maxAge) {
      console.log('Token expired:', validToken, 'Age:', tokenAge);
      // Clean up expired token
      pendingSubscriptions.delete(validToken);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Confirmation link has expired. Please subscribe again.'
      }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email if provided
    if (email && email !== pending.email) {
      console.log('Email mismatch:', email, 'vs', pending.email);
      return new Response(JSON.stringify({
        success: false,
        error: 'Email address does not match confirmation link'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Save confirmed subscription to actual newsletter database
    console.log('Confirmed subscription for:', pending.email);
    console.log('Source:', pending.source);
    console.log('Consent given:', pending.consent);

    // Analytics event tracking (stubbed for now)
    console.log('Analytics: newsletter_confirmed', {
      email: pending.email,
      source: pending.source || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Clean up confirmed token
    pendingSubscriptions.delete(validToken);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Email address confirmed successfully! You are now subscribed to our newsletter.',
      email: pending.email,
      subscription_date: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error confirming newsletter subscription:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error during confirmation',
      message: 'Please try again later or contact support if the problem persists.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    consent: true
  };
  
  // Store pending subscription
  pendingSubscriptions.set(token, pendingSubscription);
  
  console.log('Created pending subscription:', email, 'Token:', token);
  
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
  
  console.log('Cleaned up', cleanedCount, 'expired tokens');
  return cleanedCount;
}
