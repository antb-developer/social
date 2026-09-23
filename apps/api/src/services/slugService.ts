const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "dashboard",
  "help",
  "login",
  "logout",
  "members",
  "o",
  "orders",
  "products",
  "s",
  "seller",
  "sellers",
  "settings",
  "signup",
  "static",
  "store",
  "stores",
  "support",
  "templates",
  "www",
]);

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
