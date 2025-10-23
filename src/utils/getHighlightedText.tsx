export const getHighlightedText = (text: string, highlight: string) => {
  if (!highlight.trim()) return text;

  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');

  return text.split(regex).map(part =>
    regex.test(part) ? (
      <mark key={part} className={'search-highlight'}>
        {part}
      </mark>
    ) : (
      part
    )
  );
};
