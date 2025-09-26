'use client';

import React from 'react';
import { SignUp } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AdminSignUpPage() {
  if (!isClerkConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardContent className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Authentication not configured. Please set up Clerk environment variables to enable admin access.
                </AlertDescription>
              </Alert>
              <div className="mt-4 text-center">
                <Link href="/" className="text-blue-600 hover:underline text-sm">
                  ← Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardContent className="p-6">
            <SignUp
              routing="hash"
              signInUrl="/admin/sign-in"
            />
          </CardContent>
        </Card>
        <div className="text-center">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}