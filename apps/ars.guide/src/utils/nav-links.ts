import { IconBrandDiscord, IconBrandGithub } from "@tabler/icons-react";
import { getBookHref, getFirstBookEntry } from "./book";
import { getCollectionVersions, getLatestVersion } from "./versions";

const firstBookEntry = await getFirstBookEntry();
const latestVersion = await getLatestVersion();
const kubejsVersions = await getCollectionVersions("kubejs");
const latestKubejsVersion = kubejsVersions.at(-1) ?? latestVersion;

export const NavItems = [
  {
    label: "Book",
    link: firstBookEntry ? getBookHref(firstBookEntry) : "/book/",
    collection: "book",
  },
  {
    label: "Docs",
    link: `/${latestVersion}/docs/introduction/who-is-this-for/`,
    collection: "docs",
  },
  {
    label: "KubeJS",
    link: `/${latestKubejsVersion}/kubejs/getting-started/introduction/`,
    collection: "kubejs",
  },
  {
    label: "Spells",
    link: "/spells/introduction/compendium/",
    collection: "spells",
  },
];

export const SocialItems = [
  {
    label: "Discord",
    icon: IconBrandDiscord,
    link: "https://discord.gg/y7TMXZu",
  },
  {
    label: "GitHub",
    icon: IconBrandGithub,
    link: "https://github.com/Ars-Nouveau/Ars-Auxilia",
  },
];
