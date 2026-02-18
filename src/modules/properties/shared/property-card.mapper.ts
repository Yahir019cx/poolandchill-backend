/**
 * Mapea una fila de propiedad (search/favorites) al formato de la card.
 * Compartido entre PropertiesSearchService y PropertiesFavoritesService.
 */
export function mapPropertyToCard(p: any) {
  return {
    propertyId: p.ID_Property,
    propertyName: p.PropertyName,
    hasPool: p.HasPool,
    hasCabin: p.HasCabin,
    hasCamping: p.HasCamping,
    location: p.Location,
    priceFrom: p.PriceFrom,
    images: p.Images ? JSON.parse(p.Images) : [],
    rating: p.Rating === 0 || p.Rating === null ? 'Nuevo' : p.Rating,
    reviewCount: p.ReviewCount ?? 0,
  };
}
