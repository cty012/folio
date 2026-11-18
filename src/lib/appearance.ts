// Reader display preferences, kept in this browser only.
export const THEME_KEY = "folio:theme";
export const SIZE_KEY = "folio:reading-size";
export const SIZES = 5;
export const DEFAULT_SIZE = 2;

// Inlined in <head>: runs before first paint so a saved choice never flashes the other theme.
export const appearanceScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}"),s=localStorage.getItem("${SIZE_KEY}");if(t==="light"||t==="dark")d.dataset.theme=t;if(/^[0-${SIZES - 1}]$/.test(s||""))d.dataset.readingSize=s}catch(e){}})()`;
/** Where the reader last opened a chapter of this novel; read by the novel page's Continue button. */
export const lastReadKey = (novelId: string) => `folio:last-read:${novelId}`;
