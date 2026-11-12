export function Legacy({ items, on }) {
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

function useCounter() {
  return 1;
}
