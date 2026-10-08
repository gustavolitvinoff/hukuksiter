import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { Loading } from '@/components/ui';

export default function Index() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!profile) return <Loading />;
  return <Redirect href={profile.role === 'babysitter' ? '/availability' : '/search'} />;
}
