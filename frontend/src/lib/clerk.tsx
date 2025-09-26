'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

// Check if Clerk is configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) {
    // Fallback passthrough when Clerk not configured
    console.warn('Clerk not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable authentication.');
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      {children}
    </ClerkProvider>
  );
}

export default AppClerkProvider;

// Export useful Clerk hooks and components for use in other components
export { 
  SignIn, 
  SignUp, 
  UserButton, 
  useUser, 
  useAuth,
  SignedIn,
  SignedOut,
  RedirectToSignIn
} from '@clerk/nextjs';
