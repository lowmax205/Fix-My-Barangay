'use client';

import React from 'react';
import { UserButton, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import AppIcon from '@/components/AppIcon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AdminContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onDashboardRoot = pathname === '/admin' || pathname === '/admin/';
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AppIcon size={32} className="flex-shrink-0" />
            <Link href="/admin" className="flex items-center justify-center font-semibold text-blue-600 hover:underline">
              Fix My Barangay Admin
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle link: when on dashboard root show Home (public), else show Admin Dashboard */}
            <SignedIn>
              {onDashboardRoot ? (
                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-2">
                  <Link href="/">Home</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-2">
                  <Link href="/admin">Admin Dashboard</Link>
                </Button>
              )}
            </SignedIn>
            {isClerkConfigured ? (
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/admin/sign-in"
                  appearance={{
                    elements: {
                      avatarBox: 'h-8 w-8'
                    }
                  }}
                />
              </SignedIn>
            ) : (
              <Badge variant="outline" className="text-xs">
                Auth Disabled
              </Badge>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      <footer className="border-t bg-gray-50 py-4">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            ← Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Auth base paths (catch-all handled with startsWith)
  const isAuthPage = (pathname || '').startsWith('/admin/sign-in') || (pathname || '').startsWith('/admin/sign-up');

  if (!isClerkConfigured) {
    return <AdminContent>{children}</AdminContent>;
  }

  return (
    <>
      <SignedIn>
        <AdminContent>{children}</AdminContent>
      </SignedIn>
      <SignedOut>
        {isAuthPage ? (
          <AdminContent>{children}</AdminContent>
        ) : (
          <>
            {console.warn('[Auth] Unauthenticated access to protected admin route, redirecting to sign-in')} 
            <RedirectToSignIn />
          </>
        )}
      </SignedOut>
    </>
  );
}
