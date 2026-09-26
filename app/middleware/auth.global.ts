import { authClient } from "@@/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ["/", "/signin", "/signup"];

  if (publicRoutes.includes(to.path)) {
    return;
  }

  const { data: session } = await authClient.useSession(useFetch);

  if (!session) {
    return navigateTo("/signin");
  }
});
