import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  css: ['@/assets/css/main.css'],

  runtimeConfig: {
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    githubClientKey: process.env.GITHUB_CLIENT_ID,
    betterAuthSecret: '',
    betterAuthUrl: '',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o',
    connectionString: process.env.CONNECTION_STRING,
    mongodbUri: process.env.MONGODB_URI,
  },

  fonts: {
    families: [
      { name: 'Switzer', provider: 'fontshare', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Gambarino', provider: 'fontshare', weights: [400], styles: ['normal', 'italic'] },
      { name: 'Geist', provider: 'google', weights:['100 600'], styles: ['normal'] }
    ],
  },


  modules: ['@nuxt/fonts', '@nuxt/image', 'v-gsap-nuxt']
})