/**
 * Recursively extracts plain text from a TipTap JSON document.
 * 
 * @param {Object|Array} node - The TipTap JSON node or array of nodes.
 * @returns {string} The extracted plain text.
 */
export function extractTextFromTipTap(node) {
  if (!node) return "";
  
  // If it's an array of nodes, extract from each
  if (Array.isArray(node)) {
    return node.map(extractTextFromTipTap).join("\n");
  }

  // If it's a text node, return its text
  if (node.type === "text" && node.text) {
    return node.text;
  }

  // If it has children (content), recurse
  if (node.content && Array.isArray(node.content)) {
    const childText = node.content.map(extractTextFromTipTap).join("");
    // Add spacing for block elements like paragraphs and headings
    if (["paragraph", "heading", "listItem"].includes(node.type)) {
      return childText + "\n";
    }
    return childText;
  }

  return "";
}
