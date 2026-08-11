import React from 'react';
import { getCatalogItem } from '@/data/memoryPalaceCatalog';

/**
 * Renders a catalog item (or custom upload) as an SVG/IMG.
 * Catalog items pull from CDN urls (Twemoji / Iconify / DiceBear).
 */
export default function PaletteIcon({ catalogId, customUrl, className = '' }) {
  const url = customUrl || getCatalogItem(catalogId)?.url;
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className={`object-contain pointer-events-none select-none ${className}`}
      loading="lazy"
    />
  );
}
