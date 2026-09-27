import { Markdown } from "@comark/vue"

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("Markdown", Markdown)
})
