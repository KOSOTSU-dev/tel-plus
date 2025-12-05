import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthPage from '@/components/AuthPage';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <AuthPage />;
}

