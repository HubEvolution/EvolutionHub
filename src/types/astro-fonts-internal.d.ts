declare module 'virtual:astro:assets/fonts/internal' {
  interface PreloadItem {
    url: string;
    type: string;
  }
  interface FontData {
    preloadData: PreloadItem[];
    css: string;
  }
  export const fontsData: Map<string, FontData>;
}
