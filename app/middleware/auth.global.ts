import { useSession } from "@@/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ["/", "/signin", "/signup"];

  if (publicRoutes.includes(to.path)) {
    return;
  }

  const { data: session } = await useSession(useFetch);

  if (!session.value) {
    return navigateTo("/signin");
  }
});
