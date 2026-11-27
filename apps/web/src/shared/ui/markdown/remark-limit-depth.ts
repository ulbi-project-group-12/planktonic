/** The deepest tree level that still renders as markup; anything below it stays plain text. */
const MAX_DEPTH = 20;

interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

/** Parents whose children are blocks: an over-deep child becomes a paragraph of its source. */
const blockParents = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition']);
/** Parents whose children are inline: an over-deep child becomes its source text. */
const inlineParents = new Set([
  'paragraph',
  'heading',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference',
  'tableCell',
]);

/**
 * Remark plugin: cuts the tree at MAX_DEPTH levels. The later stages (markdown → HTML tree,
 * sanitizer, React elements) recurse once per level, so a message of a few thousand `>`
 * overflows the call stack and takes the whole message list down with it. Legitimate
 * messages never nest this deep; whatever does is shown as the text the author typed.
 */
function remarkLimitDepth() {
  return (tree: MarkdownNode, file: { value: unknown }): void => {
    const source = String(file.value);
    // An explicit stack instead of recursion: this walk must survive the trees it guards against.
    const pending: { node: MarkdownNode; depth: number }[] = [{ node: tree, depth: 0 }];

    for (let entry = pending.pop(); entry; entry = pending.pop()) {
      const { node, depth } = entry;
      const children = node.children ?? [];

      children.forEach((child, index) => {
        if (!child.children) return;

        const tooDeep = depth + 1 >= MAX_DEPTH;
        if (tooDeep && (blockParents.has(node.type) || inlineParents.has(node.type))) {
          const text: MarkdownNode = {
            type: 'text',
            value: source.slice(child.position?.start.offset, child.position?.end.offset),
          };
          children[index] = blockParents.has(node.type)
            ? { type: 'paragraph', children: [text] }
            : text;
          return;
        }

        // list → listItem, table → tableRow → tableCell: the parent accepts nothing else,
        // so go one level further; the cut then happens inside the item or the cell.
        pending.push({ node: child, depth: depth + 1 });
      });
    }
  };
}

export { MAX_DEPTH, remarkLimitDepth };
