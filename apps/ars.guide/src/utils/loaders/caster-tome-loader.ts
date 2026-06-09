import type { Loader } from "astro/loaders";

const ASSETS_BASE_URL = "https://assets.ars.guide";
const TOME_MANIFEST_URL = `${ASSETS_BASE_URL}/tome.json`;

export interface CasterTome {
  type: string;
  name: string;
  flavour_text: string;
  spell: string[];
  sound?: {
    sound?: {
      id: string;
    };
  };
  color: {
    r: number;
    g: number;
    b: number;
    id: string;
  };
}

const getTomeId = (path: string) =>
  path
    .split("/")
    .pop()
    ?.replace(/\.json$/, "") ?? path;

export function casterTomeLoader() {
  return {
    name: "caster-tome-loader",
    load: async ({ store, parseData }) => {
      store.clear();

      const manifestRes = await fetch(TOME_MANIFEST_URL);
      if (!manifestRes.ok) {
        throw new Error(
          `Failed to fetch tome manifest: ${manifestRes.status} ${manifestRes.statusText}`,
        );
      }
      const tomePaths = (await manifestRes.json()) as string[];

      for (const tomePath of tomePaths) {
        const tomeRes = await fetch(`${ASSETS_BASE_URL}/${tomePath}`);
        if (!tomeRes.ok) {
          console.warn(
            `Failed to fetch ${tomePath}: ${tomeRes.status} ${tomeRes.statusText}`,
          );
          continue;
        }

        const tome = (await tomeRes.json()) as CasterTome;
        if (tome.name.length <= 0) {
          console.warn(`${tomePath} has a 0-length name`);
          continue;
        }

        const id = getTomeId(tomePath);
        const data = await parseData({
          id,
          data: tome as unknown as Record<string, unknown>,
        });
        store.set({
          id,
          data,
        });
      }
    },
  } satisfies Loader;
}
