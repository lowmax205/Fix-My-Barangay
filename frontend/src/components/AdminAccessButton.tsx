'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@/lib/clerk';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const ADMIN_CODE = '072100';

export default function AdminAccessButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (enteredCode === ADMIN_CODE) {
      // Code is correct, redirect to admin area
      setIsOpen(false);
      setEnteredCode('');
      router.push('/admin/sign-in');
    } else {
      setError('Invalid admin code. Please try again.');
      setEnteredCode('');
    }
    
    setIsVerifying(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEnteredCode('');
      setError('');
      setShowCode(false);
    }
  };

  return (
    <>
      {/* When signed in: direct link to dashboard */}
      <SignedIn>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-xs cursor-pointer px-2 sm:px-3"
        >
          <Link href="/admin" aria-label="Go to Admin Dashboard" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden xs:inline">Admin</span>
            <span className="inline xs:hidden sr-only">Admin</span>
          </Link>
        </Button>
      </SignedIn>

      {/* When signed out (or Clerk not configured): show code dialog leading to sign-in */}
      <SignedOut>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs px-2 sm:px-3"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden xs:inline">Admin Access</span>
              <span className="sr-only xs:hidden">Admin Access</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-0">
            <ScrollArea className="max-h-[80vh] p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  Admin Area Access
                </DialogTitle>
                <DialogDescription>
                  Enter the admin access code to proceed to the administrative portal.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCodeSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="adminCode">Access Code</Label>
                  <div className="relative">
                    <Input
                      id="adminCode"
                      type={showCode ? 'text' : 'password'}
                      placeholder="Enter 6-digit code"
                      value={enteredCode}
                      onChange={(e) => {
                        setEnteredCode(e.target.value);
                        setError('');
                      }}
                      maxLength={6}
                      className="pr-10"
                      disabled={isVerifying}
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowCode(!showCode)}
                      disabled={isVerifying}
                      tabIndex={-1}
                    >
                      {showCode ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium mb-1">For Authorized Personnel Only</p>
                  <p>This area is restricted to barangay officials and authorized staff members. Unauthorized access is prohibited.</p>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={isVerifying}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={enteredCode.length !== 6 || isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Access Admin'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </SignedOut>
    </>
  );
}