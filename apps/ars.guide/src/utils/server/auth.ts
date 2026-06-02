import { betterAuth } from "better-auth";
import type { GuideEnv } from "./env";

export type AuthSession = Awaited<
  ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>
>;

export const createAuth = (env: GuideEnv) =>
  betterAuth({
    appName: "Ars Guide",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      env.BETTER_AUTH_URL
    ],
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 30,
        strategy: "jwe",
        refreshCache: true,
      },
    },
    account: {
      storeStateStrategy: "cookie",
      storeAccountCookie: true,
    },
  });

export const getAuthSession = async (request: Request, env: GuideEnv) => {
  const auth = createAuth(env);
  return auth.api.getSession({ headers: request.headers });
};

type DiscordAccountInfo = Awaited<
  ReturnType<ReturnType<typeof createAuth>["api"]["accountInfo"]>
>;

export const getDiscordAccountInfo = async (
  request: Request,
  env: GuideEnv,
) => {
  const auth = createAuth(env);
  try {
    return await auth.api.accountInfo({
      headers: request.headers,
      query: { providerId: "discord" },
    });
  } catch {
    return null;
  }
};

export const getSubmitterIdentity = (
  session: NonNullable<AuthSession>,
  discordAccountInfo?: DiscordAccountInfo | null,
) => {
  const user = session.user as {
    name?: string | null;
    username?: string | null;
    displayName?: string | null;
  };
  const discordUser = discordAccountInfo?.user as
    | {
        id?: string;
        name?: string | null;
        username?: string | null;
        global_name?: string | null;
      }
    | undefined;
  const displayName =
    discordUser?.global_name ||
    discordUser?.name ||
    user.displayName ||
    user.name ||
    user.username;

  if (!displayName) {
    throw new Error("Discord profile is missing a display name.");
  }

  return {
    displayName,
    username: discordUser?.username || user.username || displayName,
    userId: discordUser?.id,
  };
};
