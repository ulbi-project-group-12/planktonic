interface MarkdownNode {
  type: string;
  value?: string;
  alt?: string | null;
  url?: string;
  children?: MarkdownNode[];
}

const linkTypes = new Set(['link', 'linkReference']);
const imageTypes = new Set(['image', 'imageReference']);

/**
 * Remark plugin: an image inside a link becomes its alt text. Images render as links
 * (see `img` in markdown.tsx), and `[![badge](image-url)](target)` would otherwise put
 * one `<a>` inside another, with the label pointing at the image instead of the target.
 */
function remarkLinkedImages() {
  return (tree: MarkdownNode): void => {
    const pending: { node: MarkdownNode; inLink: boolean }[] = [{ node: tree, inLink: false }];

    for (let entry = pending.pop(); entry; entry = pending.pop()) {
      const { node, inLink } = entry;
      const children = node.children ?? [];

      children.forEach((child, index) => {
        if (inLink && imageTypes.has(child.type)) {
          children[index] = { type: 'text', value: child.alt ?? child.url ?? '' };
          return;
        }
        if (child.children) {
          pending.push({ node: child, inLink: inLink || linkTypes.has(child.type) });
        }
      });
    }
  };
}

export { remarkLinkedImages };
