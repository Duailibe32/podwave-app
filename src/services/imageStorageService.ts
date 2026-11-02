import { Brand, ProductModel, BannerSlide, ImageStorageConfig } from '../types/catalog';

export interface StorageDiagnostics {
  localStorageBytes: number;
  localStorageFormatted: string;
  localStorageQuotaBytes: number;
  localStoragePercent: number;
  totalCatalogImages: number;
  base64ImagesCount: number;
  base64Bytes: number;
  base64Formatted: string;
  cacheStorageCachesCount: number;
  cacheStorageNames: string[];
  studioDraftsCount: number;
  studioDraftsBytes: number;
  studioDraftsFormatted: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export const ESTIMATED_LOCAL_STORAGE_QUOTA = 5 * 1024 * 1024; // 5 MB baseline across modern browsers

/**
 * Formata bytes de forma legível (B, KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calcula o tamanho de uma string UTF-16 aproximada no localStorage (2 bytes por caractere)
 */
export function estimateStringBytes(str: string): number {
  return (str || '').length * 2;
}

/**
 * Verifica se uma string de imagem é um Data URL Base64 embutido
 */
export function isBase64Image(url: string | undefined): boolean {
  return typeof url === 'string' && url.startsWith('data:image/');
}

/**
 * Coleta diagnóstico em tempo real do uso de armazenamento e cache de imagens
 */
export async function getStorageDiagnostics(
  brands: Brand[] = [],
  models: ProductModel[] = [],
  banners: BannerSlide[] = []
): Promise<StorageDiagnostics> {
  let localStorageBytes = 0;
  let studioDraftsCount = 0;
  let studioDraftsBytes = 0;

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          const itemBytes = estimateStringBytes(key) + estimateStringBytes(val);
          localStorageBytes += itemBytes;

          if (
            key.startsWith('podwave_studio_') ||
            key.startsWith('podwave_image_cache') ||
            key.startsWith('podwave_banner_draft_')
          ) {
            studioDraftsCount++;
            studioDraftsBytes += itemBytes;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao calcular uso do localStorage:', e);
    }
  }

  // Análise de imagens no catálogo
  let totalCatalogImages = 0;
  let base64ImagesCount = 0;
  let base64Bytes = 0;

  // 1. Logos de marcas
  for (const b of brands) {
    if (b.logoUrl) {
      totalCatalogImages++;
      if (isBase64Image(b.logoUrl)) {
        base64ImagesCount++;
        base64Bytes += estimateStringBytes(b.logoUrl);
      }
    }
  }

  // 2. Imagens de modelos e sabores
  for (const m of models) {
    if (m.imageUrl) {
      totalCatalogImages++;
      if (isBase64Image(m.imageUrl)) {
        base64ImagesCount++;
        base64Bytes += estimateStringBytes(m.imageUrl);
      }
    }
    for (const f of m.flavors || []) {
      if (f.customImage) {
        totalCatalogImages++;
        if (isBase64Image(f.customImage)) {
          base64ImagesCount++;
          base64Bytes += estimateStringBytes(f.customImage);
        }
      }
    }
  }

  // 3. Banners
  for (const bn of banners) {
    if (bn.imageUrl) {
      totalCatalogImages++;
      if (isBase64Image(bn.imageUrl)) {
        base64ImagesCount++;
        base64Bytes += estimateStringBytes(bn.imageUrl);
      }
    }
  }

  // Análise do Cache Storage do navegador (PWA / Service Worker)
  let cacheStorageCachesCount = 0;
  let cacheStorageNames: string[] = [];
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await window.caches.keys();
      cacheStorageNames = keys;
      cacheStorageCachesCount = keys.length;
    } catch (err) {
      console.warn('Cache Storage API não acessível:', err);
    }
  }

  const localStoragePercent = Math.min(
    100,
    Math.round((localStorageBytes / ESTIMATED_LOCAL_STORAGE_QUOTA) * 100)
  );

  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (localStoragePercent >= 80 || base64Bytes > 2.5 * 1024 * 1024) {
    healthStatus = 'critical';
  } else if (localStoragePercent >= 50 || base64Bytes > 1 * 1024 * 1024) {
    healthStatus = 'warning';
  }

  return {
    localStorageBytes,
    localStorageFormatted: formatBytes(localStorageBytes),
    localStorageQuotaBytes: ESTIMATED_LOCAL_STORAGE_QUOTA,
    localStoragePercent,
    totalCatalogImages,
    base64ImagesCount,
    base64Bytes,
    base64Formatted: formatBytes(base64Bytes),
    cacheStorageCachesCount,
    cacheStorageNames,
    studioDraftsCount,
    studioDraftsBytes,
    studioDraftsFormatted: formatBytes(studioDraftsBytes),
    healthStatus,
  };
}

/**
 * Limpa o Cache Storage do navegador (Cache API do PWA / Service Worker)
 * e chaves de imagens temporárias
 */
export async function clearBrowserImageCaches(): Promise<{
  success: boolean;
  clearedCount: number;
  message: string;
}> {
  let clearedCount = 0;

  // 1. Limpa Cache Storage se disponível
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        // Limpa caches de runtime, imagens e assets dinâmicos
        await window.caches.delete(name);
        clearedCount++;
      }
    } catch (err) {
      console.warn('Erro ao limpar window.caches:', err);
    }
  }

  // 2. Limpa chaves temporárias do localStorage ligadas a cache de imagens
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('podwave_image_cache') ||
            key.startsWith('podwave_cached_images') ||
            key.startsWith('podwave_studio_preview') ||
            key.startsWith('podwave_banner_draft_preview'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        localStorage.removeItem(k);
        clearedCount++;
      });
    } catch (err) {
      console.warn('Erro ao remover chaves de cache do localStorage:', err);
    }
  }

  // 3. Dispara evento para invalidar imagens em cache na página
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('podwave_image_cache_cleared', { detail: { clearedCount } }));
  }

  return {
    success: true,
    clearedCount,
    message:
      clearedCount > 0
        ? `Cache do navegador limpo com sucesso! ${clearedCount} registros e caches de imagem liberados.`
        : 'Cache do navegador já estava limpo e livre de arquivos temporários.',
  };
}

/**
 * Purga apenas rascunhos e históricos do Studio de Imagens
 */
export function clearStudioDrafts(): { success: boolean; clearedCount: number; message: string } {
  let count = 0;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('podwave_studio_') ||
            key.startsWith('podwave_banner_draft') ||
            key.includes('_image_history'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        localStorage.removeItem(k);
        count++;
      });
    } catch (err) {
      console.warn('Erro ao purgar studio drafts:', err);
    }
  }

  return {
    success: true,
    clearedCount: count,
    message: count > 0 ? `${count} rascunhos e históricos do Studio purgados com sucesso!` : 'Nenhum rascunho temporário encontrado.',
  };
}

/**
 * Comprime uma imagem Base64 individual para as dimensões e qualidade configuradas
 */
export function compressBase64Image(
  dataUrl: string,
  maxDimension = 480,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    if (!isBase64Image(dataUrl)) {
      resolve(dataUrl);
      return;
    }

    if (typeof window === 'undefined') {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Preenchimento suave
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Tenta WebP primeiro para máxima economia; se o navegador não suportar, fallback para JPEG
      let compressed = canvas.toDataURL('image/webp', quality);
      if (!compressed.startsWith('data:image/webp')) {
        compressed = canvas.toDataURL('image/jpeg', quality);
      }

      // Se a versão comprimida for maior que a original, mantém a original
      if (compressed.length < dataUrl.length) {
        resolve(compressed);
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Executa otimização e compressão em lote de todas as imagens Base64 do catálogo local
 */
export async function optimizeCatalogImages(
  brands: Brand[],
  models: ProductModel[],
  banners: BannerSlide[],
  config?: ImageStorageConfig
): Promise<{
  updatedBrands: Brand[];
  updatedModels: ProductModel[];
  updatedBanners: BannerSlide[];
  optimizedCount: number;
  bytesSaved: number;
  bytesSavedFormatted: string;
}> {
  const maxDimension = config?.maxImageDimension || 480;
  const quality = config?.compressionQuality || 0.82;

  let optimizedCount = 0;
  let bytesSaved = 0;

  // 1. Otimiza Marcas
  const updatedBrands: Brand[] = [];
  for (const b of brands) {
    if (b.logoUrl && isBase64Image(b.logoUrl)) {
      const originalLen = b.logoUrl.length * 2;
      const compressed = await compressBase64Image(b.logoUrl, maxDimension, quality);
      const newLen = compressed.length * 2;
      if (newLen < originalLen) {
        bytesSaved += originalLen - newLen;
        optimizedCount++;
        updatedBrands.push({ ...b, logoUrl: compressed });
        continue;
      }
    }
    updatedBrands.push(b);
  }

  // 2. Otimiza Modelos e Sabores
  const updatedModels: ProductModel[] = [];
  for (const m of models) {
    let modelImg = m.imageUrl;
    if (modelImg && isBase64Image(modelImg)) {
      const originalLen = modelImg.length * 2;
      const compressed = await compressBase64Image(modelImg, maxDimension, quality);
      const newLen = compressed.length * 2;
      if (newLen < originalLen) {
        bytesSaved += originalLen - newLen;
        optimizedCount++;
        modelImg = compressed;
      }
    }

    const updatedFlavors = [];
    for (const f of m.flavors || []) {
      if (f.customImage && isBase64Image(f.customImage)) {
        const originalLen = (f.customImage || '').length * 2;
        const compressed = await compressBase64Image(f.customImage, maxDimension, quality);
        const newLen = compressed.length * 2;
        if (newLen < originalLen) {
          bytesSaved += originalLen - newLen;
          optimizedCount++;
          updatedFlavors.push({ ...f, customImage: compressed });
          continue;
        }
      }
      updatedFlavors.push(f);
    }

    updatedModels.push({
      ...m,
      imageUrl: modelImg,
      flavors: updatedFlavors,
    });
  }

  // 3. Otimiza Banners
  const updatedBanners: BannerSlide[] = [];
  for (const bn of banners) {
    if (bn.imageUrl && isBase64Image(bn.imageUrl)) {
      const originalLen = bn.imageUrl.length * 2;
      const compressed = await compressBase64Image(bn.imageUrl, Math.max(640, maxDimension), quality);
      const newLen = compressed.length * 2;
      if (newLen < originalLen) {
        bytesSaved += originalLen - newLen;
        optimizedCount++;
        updatedBanners.push({ ...bn, imageUrl: compressed });
        continue;
      }
    }
    updatedBanners.push(bn);
  }

  return {
    updatedBrands,
    updatedModels,
    updatedBanners,
    optimizedCount,
    bytesSaved,
    bytesSavedFormatted: formatBytes(bytesSaved),
  };
}
