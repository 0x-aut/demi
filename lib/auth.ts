import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
  database: new Database("./sqlite.db"),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  plugins: [username()],
});
