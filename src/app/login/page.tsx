'use client';

import { Suspense, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Chrome } from 'lucide-react';
import Image from 'next/image';

type AuthMode = 'signin' | 'signup' | 'confirmation-sent';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectedFrom') || '/dashboard';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRedirectUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${baseUrl}/auth/callback`;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
            data: {
              full_name: email.split('@')[0], // Default name from email
            },
          },
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          // Email already exists
          setError('An account with this email already exists. Please sign in instead.');
          setMode('signin');
        } else if (data.user && !data.session) {
          // Email confirmation required
          setMode('confirmation-sent');
        } else {
          // Auto-confirmed (development mode)
          router.push('/dashboard');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push(redirectTo);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  // Confirmation sent screen
  if (mode === 'confirmation-sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-600" size={32} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600 mb-6">
            We sent a confirmation link to <strong>{email}</strong>
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              Click the link in the email to confirm your account. The link will expire in 24 hours.
            </p>
          </div>

          <button
            onClick={() => setMode('signin')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between">
        <div>
          <Image src="/logo.png" alt="BookLogex" width={200} height={60} className="mb-12" />
          <h1 className="text-4xl font-bold text-white mb-4">Payroll & Bookkeeping Made Simple</h1>
          <p className="text-blue-100 text-lg">
            Australian-compliant payroll, BAS reporting, and bookkeeping for small businesses.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-400 flex-shrink-0 mt-1" size={20} />
            <div className="text-white">
              <div className="font-medium">STP Compliant</div>
              <div className="text-sm text-blue-200">Automatic ATO reporting</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-400 flex-shrink-0 mt-1" size={20} />
            <div className="text-white">
              <div className="font-medium">BAS Ready</div>
              <div className="text-sm text-blue-200">Quarterly GST made easy</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-400 flex-shrink-0 mt-1" size={20} />
            <div className="text-white">
              <div className="font-medium">Fair Work Compliant</div>
              <div className="text-sm text-blue-200">Award rates & super</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Image src="/logo.png" alt="BookLogex" width={160} height={48} className="mx-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-gray-600">
                {mode === 'signup'
                  ? 'Start managing your payroll in minutes'
                  : 'Sign in to your BookLogex account'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-900">{error}</div>
              </div>
            )}

            {/* Google Sign In */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="w-full mb-6 h-12 text-base font-medium border-2 hover:bg-gray-50"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-5 w-5" />
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handlePasswordAuth} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="mt-1"
                  required
                />
                {mode === 'signup' && (
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                )}
              </div>

              {mode === 'signin' && (
                <div className="flex items-center justify-end text-sm">
                  <button
                    type="button"
                    onClick={() => router.push('/reset-password')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Create account' : 'Sign in'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Toggle Sign In/Sign Up */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              </span>{' '}
              <button
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setError(null);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={loading}
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </div>

            {/* Terms & Privacy */}
            {mode === 'signup' && (
              <p className="mt-6 text-xs text-center text-gray-500">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            )}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@booklogex.com" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
