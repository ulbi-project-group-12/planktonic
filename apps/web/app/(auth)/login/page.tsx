import { LoginPage } from '@/_pages/auth/login';

export default async function Page({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  return <LoginPage next={typeof next === 'string' ? next : undefined} />;
}
