import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarGroup } from './avatar';

describe('Avatar', () => {
  it('renders initials from the first two words', () => {
    render(<Avatar name="Александр Кузнецов" />);
    expect(screen.getByText('АК')).toBeInTheDocument();
  });

  it('falls back to «?» without a name', () => {
    render(<Avatar name="  " />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('keeps the background color deterministic for the same name', () => {
    const { container: first } = render(<Avatar name="Мария Светлова" />);
    const firstClasses = first.querySelector('[data-slot="avatar"] > span')?.className;
    const { container: second } = render(<Avatar name="Мария Светлова" />);
    const secondClasses = second.querySelector('[data-slot="avatar"] > span')?.className;
    expect(firstClasses).toBeTruthy();
    expect(secondClasses).toBe(firstClasses);
  });

  it('renders a presence dot with the palette color', () => {
    render(<Avatar name="Иван Петров" presence="dnd" />);
    const dot = document.querySelector('[data-slot="avatar-presence"]');
    expect(dot).toHaveClass('bg-danger');
    expect(dot).toHaveAttribute('title', 'Не беспокоить');
  });

  it('renders an image when src is given', () => {
    render(<Avatar name="Иван Петров" src="/avatar.png" />);
    expect(screen.getByRole('img', { name: 'Иван Петров' })).toHaveAttribute('src', '/avatar.png');
  });
});

describe('AvatarGroup', () => {
  const users = [
    { name: 'Александр Кузнецов' },
    { name: 'Мария Светлова' },
    { name: 'Дмитрий Волков' },
    { name: 'Иван Петров' },
    { name: 'Ольга Смирнова' },
  ];

  it('shows up to max avatars and the rest counter', () => {
    render(<AvatarGroup users={users} max={3} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3);
  });

  it('shows all avatars when within the limit', () => {
    render(<AvatarGroup users={users.slice(0, 2)} />);
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });
});
