'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#107EAA] flex items-center justify-center p-4">
      {/* Logo */}
      <div className="absolute top-6 left-6">
        <div className="flex items-center space-x-2">
          <Image
            src="/blox-logo.svg"
            alt="BLOX AI"
            width={100}
            height={100}
            className="w-24 h-24"
          />
        </div>
      </div>

      {/* Forgot Password Form */}
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-left mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Forgot Password?
          </h1>
          <p className="text-[#839EA9]">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="font-medium">Password reset email sent!</p>
              </div>
              <p className="mt-2 text-sm">
                Please check your email for instructions to reset your password.
                The link will expire in 1 hour.
              </p>
            </div>
            <Link
              href="/"
              className="block w-full text-center bg-[#107EAA] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#0d6b8a] focus:outline-none focus:ring-2 focus:ring-[#107EAA] focus:ring-offset-2 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#107EAA] ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#107EAA] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#0d6b8a] focus:outline-none focus:ring-2 focus:ring-[#107EAA] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-[#107EAA] hover:text-[#0d6b8a] hover:underline font-medium"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

