'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Incorrect email or password attempt. Try again.');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
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

      {/* Login Form */}
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-left mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back!
          </h1>
          <p className="text-[#839EA9]">
            Enter your credentials to access the Document Repository
          </p>
        </div>

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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
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
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-left">
          <p className="text-sm text-[#839EA9]">
            No Sign Up option available. Contact your admin for access.
          </p>
        </div>
      </div>
    </div>
  );
}
