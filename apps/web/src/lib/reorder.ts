export function moveItem<T>(items: T[], fromId: T, toId: T): T[] {
  const fromIndex = items.indexOf(fromId);
  const toIndex = items.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return items;
  }
  const next = [...items];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, fromId);
  return next;
}
