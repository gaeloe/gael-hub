export default function manifest() {
  return {
    name: "Gaël's Work Hub",
    short_name: "Hub",
    description: "Tasks, ideas, and Claude sessions — all in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#3a6b5c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
