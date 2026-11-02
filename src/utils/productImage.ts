/** Imgur's documented proportional thumbnails: https://api.imgur.com/models/image#thumbs */
export function productCardImage(source: string): {src: string; srcSet?: string} {
  const match = source.match(/^https:\/\/i\.imgur\.com\/([A-Za-z0-9]{5}|[A-Za-z0-9]{7})\.(png|jpe?g|webp)(\?[^#]*)?$/i);
  if (!match) return {src: source};
  const image = (size: string) => `https://i.imgur.com/${match[1]}${size}.${match[2]}${match[3] || ''}`;
  return {src: image('l'), srcSet: `${image('m')} 320w, ${image('l')} 640w, ${image('h')} 1024w`};
}
