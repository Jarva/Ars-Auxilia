import type { MarkdownHeading } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import "core-js/es/array/to-sorted";
import {
  isVersionSegment,
  isVersionedCollection,
  type Version,
  type VersionedCollection,
} from "./versions";

type SidebarCollection = VersionedCollection | "spells";
export type GenericCollectionEntry = CollectionEntry<SidebarCollection>;

const getSourcePath = (entry: GenericCollectionEntry) =>
  entry.filePath ?? entry.id;

const getCollectionRelativePath = (entry: GenericCollectionEntry) => {
  const sourcePath = getSourcePath(entry).replace(/\.(md|mdx)$/, "");
  const marker = `/content/${entry.collection}/`;
  const markerIndex = sourcePath.indexOf(marker);

  if (markerIndex >= 0) {
    return sourcePath.slice(markerIndex + marker.length);
  }

  const fallbackPrefix = `src/content/${entry.collection}/`;
  return sourcePath.startsWith(fallbackPrefix)
    ? sourcePath.slice(fallbackPrefix.length)
    : sourcePath;
};

export interface SidebarEntry {
  id: string;
  title: string;
  href: string;
  weight: number;
  active: boolean;
  children?: SidebarEntry[];
}

export type ParentSection = SidebarEntry & {
  children: SidebarEntry[];
};

interface SectionAccumulatorEntry {
  parent?: SidebarEntry;
  children: SidebarEntry[];
  active: boolean;
}

interface SectionAccumulator {
  [k: string]: SectionAccumulatorEntry;
}

export type Sidebar = ParentSection[];

export const getVersionFromEntry = (entry: GenericCollectionEntry): Version => {
  const version = getCollectionRelativePath(entry).split("/")[0];
  if (!isVersionSegment(version)) {
    throw new Error(`Entry ${entry.id} is missing a supported version prefix.`);
  }

  return version;
};

export const getPublicSlug = (entry: GenericCollectionEntry) => {
  const slug = entry.data.slug ?? getCollectionRelativePath(entry);
  const [version, ...parts] = slug.split("/");
  const publicSlug = isVersionSegment(version) ? parts.join("/") : slug;

  return publicSlug.replace(/(^|\/)index$/, "").replace(/\/$/, "");
};

export const getEntryHref = (entry: GenericCollectionEntry) => {
  const publicSlug = getPublicSlug(entry);
  const suffix = publicSlug ? `${publicSlug}/` : "";

  if (!isVersionedCollection(entry.collection)) {
    return `/${entry.collection}/${suffix}`;
  }

  const version = getVersionFromEntry(entry);
  return `/${version}/${entry.collection}/${suffix}`;
};

const toSidebarEntry = (
  entry: GenericCollectionEntry,
  active: boolean,
): SidebarEntry => ({
  id: getPublicSlug(entry),
  title: entry.data.title,
  href: getEntryHref(entry),
  weight: entry.data.weight,
  active,
});

export const getSidebar = async (
  collection: SidebarCollection,
  versionOrSlug: Version | string,
  maybeSlug?: string,
): Promise<Sidebar> => {
  const isVersioned = isVersionedCollection(collection);
  const version = isVersioned ? versionOrSlug : undefined;
  const slug = isVersioned ? (maybeSlug ?? "") : versionOrSlug;
  const allEntries = await getCollection(
    collection,
    (entry) =>
      !isVersioned ||
      getCollectionRelativePath(entry).startsWith(`${version}/`),
  );

  const sectionEntries = allEntries.reduce<SectionAccumulator>((acc, curr) => {
    const top = getTopLevel(curr);
    const section = acc[top] || { children: [], active: false };
    const publicSlug = getPublicSlug(curr);
    const isActive = publicSlug === slug;

    if (publicSlug === top) {
      section.parent = toSidebarEntry(curr, isActive);
    } else if (publicSlug) {
      section.children.push(toSidebarEntry(curr, isActive));
      section.children.sort((a, b) => a.weight - b.weight);
    }

    if (isActive || slug.startsWith(`${top}/`)) {
      section.active = true;
    }

    acc[top] = section;
    return acc;
  }, {});

  return Object.values(sectionEntries)
    .filter(
      (
        section,
      ): section is SectionAccumulatorEntry & { parent: SidebarEntry } =>
        section.parent != null,
    )
    .map((section) => ({
      ...section.parent,
      active: section.active || section.parent.active,
      children: section.children,
    }))
    .toSorted((a, b) => a.weight - b.weight);
};

export const getFirstEntry = async (
  collection: SidebarCollection,
  version: Version,
) => {
  const allEntries = await getCollection(collection, (entry) =>
    getCollectionRelativePath(entry).startsWith(`${version}/`),
  );
  return (
    allEntries
      .filter((entry) => getPublicSlug(entry) === getTopLevel(entry))
      .toSorted((a, b) => a.data.weight - b.data.weight)[0] ?? null
  );
};

const getLeafEntries = (entries: SidebarEntry[]): SidebarEntry[] =>
  entries.flatMap((entry) =>
    entry.children?.length ? getLeafEntries(entry.children) : entry,
  );

export const getPreviousEntry = (slug: string, sidebar: Sidebar) => {
  const entries = getLeafEntries(sidebar);
  const idx = entries.findIndex((entry) => entry.id === slug);
  if (idx <= 0) return null;
  return entries[idx - 1];
};

export const getNextEntry = (slug: string, sidebar: Sidebar) => {
  const entries = getLeafEntries(sidebar);
  const idx = entries.findIndex((entry) => entry.id === slug);
  if (idx < 0 || idx === entries.length - 1) return null;
  return entries[idx + 1];
};

interface ChildHeading {
  entry: MarkdownHeading;
}

export type ParentHeading = ChildHeading & {
  children: ParentHeading[];
};

const pushHeading = (
  depth: number,
  heading: MarkdownHeading,
  parent: ParentHeading,
) => {
  if (depth === 2) {
    parent.children.push({ entry: heading, children: [] });
    return;
  }

  pushHeading(depth - 1, heading, parent.children[parent.children.length - 1]);
};

export const getHeadings = (headings: MarkdownHeading[]) => {
  return headings.reduce<ParentHeading[]>((acc, curr) => {
    if (curr.slug === "footnote-label") return acc;
    curr.depth = curr.depth - 1;

    if (curr.depth > 1) {
      const parent = acc[acc.length - 1];
      pushHeading(curr.depth, curr, parent);
    } else {
      acc.push({
        entry: curr,
        children: [],
      });
    }

    return acc;
  }, []);
};

export const getEditPath = (entry: GenericCollectionEntry): string => {
  const sourcePath = entry.filePath ?? entry.id;
  const marker = "content/";
  const idx = sourcePath.indexOf(marker);

  if (idx >= 0) {
    return sourcePath.slice(idx);
  }

  return `content/${entry.collection}/${entry.id}`;
};

export const getTopLevel = (entry: GenericCollectionEntry) => {
  const publicSlug = getPublicSlug(entry);
  return publicSlug.split("/")[0];
};
