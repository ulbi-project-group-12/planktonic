function useCounter(): number {
  return 1;
}

export function Bad({ items, on }: { items: string[]; on: boolean }) {
  if (on) useCounter();
  return (
    <ul>
      <img src="/avatar.png" />
      {items.map((item) => (
        <li>{item}</li>
      ))}
    </ul>
  );
}
