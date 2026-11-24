export const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/gif';

export async function readCatalogImage(file: File): Promise<{ url: string; image: HTMLImageElement }> {
  if (!file.size || file.size > 8 * 1024 * 1024 || !acceptedImageTypes.split(',').includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG, WebP ou GIF de até 8 MB.');
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const tag = String.fromCharCode(...bytes);
  const signatures: Record<string, boolean> = {
    'image/png': tag.startsWith('\x89PNG\r\n\x1a\n'),
    'image/jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    'image/gif': tag.startsWith('GIF87a') || tag.startsWith('GIF89a'),
    'image/webp': tag.startsWith('RIFF') && tag.slice(8, 12) === 'WEBP',
  };
  if (!signatures[file.type]) throw new Error('O conteúdo da imagem não corresponde ao formato.');
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = url;
  try { await image.decode(); } catch { throw new Error('Arquivo de imagem inválido.'); }
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 24000000) {
    throw new Error('Escolha uma imagem com até 24 megapixels.');
  }
  return { url, image };
}
