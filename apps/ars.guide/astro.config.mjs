import cloudflare from "@astrojs/cloudflare";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import playformCompress from "@playform/compress";
import { defineConfig, envField, sessionDrivers } from "astro/config";
import expressiveCode from "astro-expressive-code";
import astroMetaTags from "astro-meta-tags";
import pagefind from "astro-pagefind";
import robotsTxt from "astro-robots-txt";
import { visit } from "unist-util-visit";

const addHeaderLinks = () => {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (
        ["h2", "h3", "h4", "h5"].includes(node.tagName) &&
        node.properties.id
      ) {
        node.children.push({
          type: "element",
          tagName: "a",
          properties: {
            class: "anchor",
            "aria-hidden": true,
            href: "#" + node.properties.id,
            "data-pagefind-ignore": "all",
            "aria-label": `${node.properties.id} permalink`,
          },
          children: [{ type: "text", value: "#" }],
        });
      }
    });
  };
};

export default defineConfig({
  output: "static",
  session: {
    driver: sessionDrivers.lruCache(),
  },
  adapter: cloudflare({
    prerenderEnvironment: "node",
    imageService: {
      build: "compile",
      runtime: "passthrough",
    },
  }),
  publicDir: "assets",
  outDir: "dist",
  site: "https://ars.guide",
  integrations: [
    expressiveCode({
      plugins: [pluginLineNumbers()],
      themes: ["poimandres", "material-theme-lighter"],
      themeCssSelector(theme) {
        return `[data-bs-theme="${theme.type}"]`;
      },
    }),
    mdx(),
    react(),
    svelte(),
    pagefind(),
    sitemap(),
    robotsTxt(),
    astroMetaTags(),
    playformCompress(),
  ],
  env: {
    schema: {
      BETTER_AUTH_SECRET: envField.string({
        context: "server",
        access: "secret",
      }),
      BETTER_AUTH_URL: envField.string({
        context: "server",
        access: "public",
        default: "https://ars.guide",
      }),
      DISCORD_CLIENT_ID: envField.string({
        context: "server",
        access: "secret",
      }),
      DISCORD_CLIENT_SECRET: envField.string({
        context: "server",
        access: "secret",
      }),
      GITHUB_APP_ID: envField.string({ context: "server", access: "secret" }),
      GITHUB_APP_INSTALLATION_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      GITHUB_APP_PRIVATE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      GITHUB_OWNER: envField.string({
        context: "server",
        access: "public",
        default: "Ars-Nouveau",
      }),
      GITHUB_REPO: envField.string({
        context: "server",
        access: "public",
        default: "Ars-Auxilia",
      }),
      GITHUB_BASE_BRANCH: envField.string({
        context: "server",
        access: "public",
        default: "main",
      }),
    },
  },
  markdown: {
    rehypePlugins: [rehypeHeadingIds, addHeaderLinks],
  },
});
