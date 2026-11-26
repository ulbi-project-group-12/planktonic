import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LandingPage } from './landing-page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('LandingPage', () => {
  it('renders the hero with the promise and the main call to action', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Обсуждения, задачи и код/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Зарегистрироваться/ }).length).toBeGreaterThan(0);
  });

  it('renders the «Как это работает» and «Возможности» sections', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: /Как это работает/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Возможности/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Каналы и ветки/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Интеграция с GitHub/ })).toBeInTheDocument();
  });

  it('offers the login and registration entry points', () => {
    render(<LandingPage />);

    expect(screen.getAllByRole('button', { name: /Войти/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Регистрация/ })).toHaveAttribute('href', '/register');
  });
});
