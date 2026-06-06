import { type CollectionEntry, getCollection } from "astro:content";
import type { ParentSection, Sidebar, SidebarEntry } from "./sidebar";

export interface BookSidebarEntry extends SidebarEntry {
  namespace?: string;
}

export type BookSidebar = (ParentSection & {
  children: BookSidebarEntry[];
})[];

export type BookCollectionEntry = CollectionEntry<"book">;
export type BookCategoryEntry = BookCollectionEntry & {
  data: Extract<BookCollectionEntry["data"], { type: "category" }>;
};
export type BookPageEntry = BookCollectionEntry & {
  data: Extract<BookCollectionEntry["data"], { type: "entry" }>;
};

let bookCollectionPromise: Promise<BookCollectionEntry[]> | undefined;

const getBookCollection = () => {
  bookCollectionPromise ??= getCollection("book");
  return bookCollectionPromise;
};

export const isBookCategory = (
  entry: BookCollectionEntry,
): entry is BookCategoryEntry => entry.data.type === "category";
export const isBookPage = (
  entry: BookCollectionEntry,
): entry is BookPageEntry => entry.data.type === "entry";

export const getBookHref = (entry: BookPageEntry) =>
  `/book/${entry.data.slug}/`;

export const getBookCategoryHref = (category: BookCategoryEntry) =>
  `/book/${category.data.slug}/`;

export const getBookEntries = async () => {
  const entries = await getBookCollection();
  return entries.filter(isBookPage);
};

export const getBookCategories = async () => {
  const entries = await getBookCollection();
  return entries.filter(isBookCategory);
};

export const getBookEntryBySlug = async (slug: string) => {
  const entries = await getBookEntries();
  return entries.find((entry) => entry.data.slug === slug) ?? null;
};

export const getBookCategoryBySlug = async (slug: string) => {
  const categories = await getBookCategories();
  return categories.find((category) => category.data.slug === slug) ?? null;
};

export const getBookIndexHref = () => "/book/";

const byOrderThenTitle = <T extends { data: { order: number; title: string } }>(
  a: T,
  b: T,
) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title);

type CategoryLookup = Map<string, BookCategoryEntry>;
type EntriesByCategory = Record<string, BookPageEntry[]>;

const getSortedSubCategories = (
  category: BookCategoryEntry,
  categories: BookCategoryEntry[],
  categoryById: CategoryLookup,
) => {
  const declaredIds = category.data.subCategories;
  const declared = declaredIds
    .map((id) => categoryById.get(id))
    .filter((entry): entry is BookCategoryEntry => entry != null);

  const discovered = categories.filter(
    (candidate) =>
      candidate.data.parents.includes(category.data.id) &&
      !declaredIds.includes(candidate.data.id),
  );

  return [...declared, ...discovered.toSorted(byOrderThenTitle)];
};

const getBookPagesForCategory = (
  category: BookCategoryEntry,
  categories: BookCategoryEntry[],
  categoryById: CategoryLookup,
  entriesByCategory: EntriesByCategory,
  seen = new Set<string>(),
): BookPageEntry[] => {
  if (seen.has(category.data.id)) {
    throw new Error(
      `Circular book category hierarchy detected at ${category.data.id}.`,
    );
  }

  const nextSeen = new Set(seen).add(category.data.id);
  const pageGroups = (entriesByCategory[category.data.id] ?? []).map(
    (entry) => ({
      weight: entry.data.order,
      title: entry.data.title,
      entries: [entry],
    }),
  );
  const subCategoryGroups = getSortedSubCategories(
    category,
    categories,
    categoryById,
  ).map((subCategory) => ({
    weight: subCategory.data.order,
    title: subCategory.data.title,
    entries: getBookPagesForCategory(
      subCategory,
      categories,
      categoryById,
      entriesByCategory,
      nextSeen,
    ),
  }));

  return [...subCategoryGroups, ...pageGroups]
    .toSorted((a, b) => a.weight - b.weight || a.title.localeCompare(b.title))
    .flatMap((group) => group.entries);
};

const categoryContainsCategory = (
  category: BookCategoryEntry,
  targetCategoryId: string,
  categories: BookCategoryEntry[],
  categoryById: CategoryLookup,
  seen = new Set<string>(),
): boolean => {
  if (category.data.id === targetCategoryId) return true;
  if (seen.has(category.data.id)) return false;

  const nextSeen = new Set(seen).add(category.data.id);
  return getSortedSubCategories(category, categories, categoryById).some(
    (subCategory) =>
      categoryContainsCategory(
        subCategory,
        targetCategoryId,
        categories,
        categoryById,
        nextSeen,
      ),
  );
};

export const getBookCategoryEntries = async (categoryId: string) => {
  const collection = await getBookCollection();
  const categories = collection.filter(isBookCategory);
  const entries = collection.filter(isBookPage);
  const categoryById = new Map(
    categories.map((category) => [category.data.id, category]),
  );
  const category = categoryById.get(categoryId);
  if (!category) return [];

  const entriesByCategory = entries.reduce<EntriesByCategory>((acc, entry) => {
    acc[entry.data.category] ??= [];
    acc[entry.data.category].push(entry);
    return acc;
  }, {});

  return getBookPagesForCategory(
    category,
    categories,
    categoryById,
    entriesByCategory,
  );
};

const toPageSidebarEntry = (
  entry: BookPageEntry,
  currentSlug: string,
): BookSidebarEntry => ({
  id: entry.data.slug,
  title: entry.data.title,
  href: getBookHref(entry),
  weight: entry.data.order,
  active: entry.data.slug === currentSlug,
  namespace: entry.data.namespace,
});

const hasActiveChild = (entry: SidebarEntry): boolean =>
  entry.active || entry.children?.some(hasActiveChild) === true;

const getFirstLeafHref = (entries: SidebarEntry[]): string | undefined => {
  for (const entry of entries) {
    if (entry.children?.length) {
      const href = getFirstLeafHref(entry.children);
      if (href) return href;
      continue;
    }

    return entry.href;
  }

  return undefined;
};

export const getBookSidebar = async (currentSlug = ""): Promise<Sidebar> => {
  const collection = await getBookCollection();
  const categories = collection.filter(isBookCategory);
  const entries = collection.filter(isBookPage);
  const categoryById = new Map(
    categories.map((category) => [category.data.id, category]),
  );

  const entriesByCategory = entries.reduce<EntriesByCategory>((acc, entry) => {
    acc[entry.data.category] ??= [];
    acc[entry.data.category].push(entry);
    return acc;
  }, {});
  const currentEntry = entries.find((entry) => entry.data.slug === currentSlug);

  const buildCategory = (
    category: BookCategoryEntry,
    includeEntries: boolean,
    seen = new Set<string>(),
  ): ParentSection => {
    if (seen.has(category.data.id)) {
      throw new Error(
        `Circular book category hierarchy detected at ${category.data.id}.`,
      );
    }

    const nextSeen = new Set(seen).add(category.data.id);
    const subCategories = getSortedSubCategories(
      category,
      categories,
      categoryById,
    ).map((subCategory) => buildCategory(subCategory, false, nextSeen));
    const pages = includeEntries
      ? (entriesByCategory[category.data.id] ?? [])
          .toSorted(byOrderThenTitle)
          .map((entry) => toPageSidebarEntry(entry, currentSlug))
      : [];
    const children = [...subCategories, ...pages].toSorted(
      (a, b) => a.weight - b.weight || a.title.localeCompare(b.title),
    );
    const active =
      category.data.slug === currentSlug ||
      children.some(hasActiveChild) ||
      (currentEntry != null &&
        categoryContainsCategory(
          category,
          currentEntry.data.category,
          categories,
          categoryById,
        ));

    return {
      id: category.data.slug,
      title: category.data.title,
      href: includeEntries
        ? (getFirstLeafHref(children) ?? getBookIndexHref())
        : getBookCategoryHref(category),
      weight: category.data.order,
      active,
      children,
    };
  };

  const rootCategories = categories
    .filter((category) => category.data.parents.length === 0)
    .toSorted(byOrderThenTitle);

  const rootCategoryIds = new Set(
    rootCategories.map((category) => category.data.id),
  );
  const orphanCategoryIds = new Set<string>();

  for (const entry of entries) {
    const category = categoryById.get(entry.data.category);
    if (!category || category.data.parents.length > 0) continue;
    rootCategoryIds.add(category.data.id);
  }

  for (const category of categories) {
    for (const parentId of category.data.parents) {
      if (!categoryById.has(parentId)) orphanCategoryIds.add(category.data.id);
    }
  }

  const roots = [...rootCategoryIds, ...orphanCategoryIds]
    .map((id) => categoryById.get(id))
    .filter((entry): entry is BookCategoryEntry => entry != null)
    .toSorted(byOrderThenTitle)
    .map((category) => buildCategory(category, true));

  const uncategorizedEntries = entries
    .filter((entry) => !categoryById.has(entry.data.category))
    .toSorted(byOrderThenTitle)
    .map((entry) => toPageSidebarEntry(entry, currentSlug));

  if (uncategorizedEntries.length === 0) return roots;

  return [
    ...roots,
    {
      id: "uncategorized",
      title: "Uncategorized",
      href: getFirstLeafHref(uncategorizedEntries) ?? getBookIndexHref(),
      weight: Number.MAX_SAFE_INTEGER,
      active: uncategorizedEntries.some(hasActiveChild),
      children: uncategorizedEntries,
    },
  ];
};

const collectNamespaces = (
  entries: SidebarEntry[],
  result: Set<string>,
): void => {
  for (const entry of entries) {
    if ("namespace" in entry && typeof entry.namespace === "string") {
      result.add(entry.namespace);
    }
    if (entry.children?.length) {
      collectNamespaces(entry.children, result);
    }
  }
};

export const getBookNamespaces = (sidebar: Sidebar): string[] => {
  const namespaces = new Set<string>();
  collectNamespaces(sidebar, namespaces);
  return [...namespaces];
};

export const getFirstBookEntry = async () => {
  const sidebar = await getBookSidebar();
  const firstHref = getFirstLeafHref(sidebar);
  if (!firstHref) return null;

  const slug = firstHref.replace(/^\/book\//, "").replace(/\/$/, "");
  return getBookEntryBySlug(slug);
};
