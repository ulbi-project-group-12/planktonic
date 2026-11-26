import { RegisterPage } from '@/_pages/auth/register';

export default async function Page({ searchParams }: PageProps<'/register'>) {
  const { next } = await searchParams;
  return <RegisterPage next={typeof next === 'string' ? next : undefined} />;
}
