// Stands in for React's JSX types, so the fixture needs no react install.
declare namespace JSX {
  type Element = object;
  interface IntrinsicElements {
    [name: string]: { onClick?: () => void; [attribute: string]: unknown };
  }
}
