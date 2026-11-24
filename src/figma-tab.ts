export interface FigmaFile {
  origin: string;
  path: string;
}

export function getFigmaFile(address: string | undefined): FigmaFile | undefined {
  if (!address) return;

  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return;
  }
  if (!['https://www.figma.com', 'https://figma.com'].includes(url.origin)) return;

  const path = /^\/(?:design|file)\/[a-zA-Z0-9]+(?=\/|$)/.exec(url.pathname)?.[0];
  if (path) return { origin: url.origin, path };
}
