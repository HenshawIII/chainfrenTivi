'use client';
import { useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/layout/AuthLayout';
import Spinner from '@/components/Spinner';

const LoginPage = () => {
  const { login, ready, authenticated } = usePrivy();
  const router = useRouter();
  const loginCalled = useRef(false);

  useEffect(() => {
    if (!ready) return;

    if (authenticated) {
      router.push('/dashboard');
    } else if (!loginCalled.current) {
      loginCalled.current = true;
      login();
    }
  }, [ready, authenticated, login, router]);

  // Render a spinner until the auth process or navigation occurs
  return (
    <AuthLayout>
      <div className="flex justify-center bg-black items-center h-screen">
        <Spinner />
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
