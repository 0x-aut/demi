<script setup lang="ts">
import { authClient } from "@@/lib/auth-client"

useSeoMeta({
    title: "Demi"
})

const { data: session } = await authClient.useSession(useFetch)
const isSignedIn = computed(() => !!session.value?.user)
</script>

<template>
    <!-- Page shell -->
    <div class="min-h-dvh flex items-center justify-center bg-white box-border hero-page-pad">

        <!-- Outer wrapper — fills screen minus margins -->
        <section class="hero-wrap">

            <!-- The card / squircle -->
            <div class="relative overflow-hidden flex items-center hero-card">

                <!-- Background image -->
                <div class="absolute inset-0 z-0 bg-cover hero-bg" />

                <!-- Noise / grain overlay -->
                <div class="absolute inset-0 z-10 bg-repeat pointer-events-none hero-noise" aria-hidden="true" />

                <!-- Content -->
                <div class="relative z-30 w-full flex flex-col items-center justify-center text-center hero-enter hero-content hero-content-pad">

                    <!-- Eyebrow pill -->
                    <p class="inline-block font-sans font-medium uppercase tracking-[0.16em] rounded-full m-0 hero-eyebrow hero-eyebrow-size">
                        Developer workspace
                    </p>

                    <!-- Headline -->
                    <h1 class="m-0 flex flex-col items-center gap-[0.04em]">
                        <span class="block font-display font-normal hero-headline-size">Understand any repo.</span>
                        <span class="block font-display font-normal hero-headline-size">Ship with confidence.</span>
                    </h1>

                    <!-- Body -->
                    <p class="m-0 font-sans font-normal leading-[1.65] max-w-[52ch] hero-body-size hero-body-shadow hero-body-color">
                        Demi turns an unfamiliar codebase into an actionable workspace — explore architecture, investigate issues, and coordinate AI agents to deliver pull requests, with you in control every step of the way.
                    </p>

                    <!-- CTAs -->
                    <div class="flex items-center flex-wrap justify-center mt-1 hero-actions-gap">
                        <template v-if="isSignedIn">
                            <NuxtLink to="/dashboard" class="font-sans font-medium no-underline rounded-full border transition-colors hero-btn-primary hero-btn-size">
                                Go to app
                            </NuxtLink>
                        </template>
                        <template v-else>
                            <NuxtLink to="/signup" class="font-sans font-medium no-underline rounded-full border transition-colors hero-btn-primary hero-btn-size">
                                Get started
                            </NuxtLink>
                            <NuxtLink to="/signin" class="font-sans font-medium no-underline rounded-full border bg-transparent transition-colors hero-btn-ghost hero-btn-size">
                                Sign in
                            </NuxtLink>
                        </template>
                    </div>

                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
/* clamp() values and things Tailwind can't express cleanly */

.hero-page-pad    { padding: 9px; }

.hero-wrap        { width: calc(100vw - 18px); height: calc(100dvh - 18px); }

.hero-card        { width: 100%; height: 100%; border-radius: 20px; }

.hero-bg {
    background-image: url('/demi_hero_rectangle_2.png');
    background-position: center 15%;
}

.hero-noise {
    opacity: 0.055;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-size: 300px 300px;
    mix-blend-mode: overlay;
}

.hero-content       { animation-delay: 0.1s; }
.hero-content-pad   { padding: clamp(28px, 6vw, 64px); gap: clamp(12px, 2.5vw, 22px); }

.hero-eyebrow       { color: rgba(255,237,195,0.72); background: rgba(255,237,195,0.07); border-color: rgba(255,237,195,0.18); padding: 0.35em 1.1em; }
.hero-eyebrow-size  { font-size: clamp(0.6rem, 1.4vw, 0.75rem); }

.hero-headline-size {
    font-size: clamp(2rem, 7vw, 5.2rem);
    line-height: 1.08;
    letter-spacing: -0.035em;
    color: #fffaf0;
    text-shadow: 0 2px 32px rgba(4,6,20,0.55), 0 1px 6px rgba(4,6,20,0.4);
}

.hero-body-size   { font-size: clamp(0.8rem, 2vw, 1rem); }
.hero-body-color  { color: rgba(255,248,230,0.92); }
.hero-body-shadow { text-shadow: 0 1px 8px rgba(4,6,20,0.9), 0 0px 2px rgba(4,6,20,0.8); }

.hero-actions-gap { gap: clamp(8px, 2vw, 14px); }

.hero-btn-size    { font-size: clamp(0.78rem, 1.6vw, 0.88rem); letter-spacing: -0.01em; padding: 0.62em 1.6em; }

.hero-btn-primary { color: #1a1208; background: #ffe9b0; border-color: rgba(255,233,176,0.6); }
.hero-btn-primary:hover { background: #fff3d0; }

.hero-btn-ghost   { color: rgba(255,248,230,0.95); border-color: rgba(255,248,230,0.5); }
.hero-btn-ghost:hover { color: #fffaf0; border-color: rgba(255,248,230,0.8); }
</style>
