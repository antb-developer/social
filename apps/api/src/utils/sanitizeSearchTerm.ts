/**
 * Strips everything except letters/digits/space/hyphen before a search term
 * is interpolated into a PostgREST `.or()` filter string, so a query like
 * `q=),status.eq.paid,(` can't widen the filter beyond the intended search.
 */
export function sanitizeSearchTerm(q: string): string {
  return q.replace(/[^a-zA-Z0-9 -]/g, "").trim();
}
