import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { Pool } from "pg";
import { readFileSync } from "fs";

export const auth = betterAuth({
  database: new Pool({
    connectionString: `${process.env.CONNECTION_STRING}defaultdb`,
    ssl: { rejectUnauthorized: false },
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      mapProfileToUser: (profile) => ({
        email: profile.email ?? `${profile.id}@github.placeholder.invalid`,
      }),
      disableSignUp: false,
    },
    // google: {
    //   clientId: process.env.GOOGLE_CLIENT_ID as string,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    // },
  },

  plugins: [username()],
});
