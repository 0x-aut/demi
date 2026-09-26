import { createAuthClient } from "better-auth/vue";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000",
  plugins: [usernameClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
