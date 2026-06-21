import {
  categorize,
  nearestByCategory,
  normalizeOverpassElement,
  type OverpassElement,
} from './poi';

describe('categorize', () => {
  it('maps rider-priority categories', () => {
    expect(categorize({ amenity: 'fuel' })).toBe('fuel');
    expect(categorize({ shop: 'motorcycle_repair' })).toBe('mechanic');
    expect(categorize({ shop: 'tyres' })).toBe('puncture');
    expect(categorize({ amenity: 'hospital' })).toBe('hospital');
    expect(categorize({ amenity: 'police' })).toBe('police');
    expect(categorize({ name: 'Sharma Dhaba', amenity: 'restaurant' })).toBe('dhaba');
    expect(categorize({ amenity: 'restaurant' })).toBe('food');
    expect(categorize({ tourism: 'viewpoint' })).toBe('viewpoint');
    expect(categorize({ leisure: 'park' })).toBe('other');
  });
});

describe('normalizeOverpassElement', () => {
  it('normalizes a node and keeps useful tags only', () => {
    const el: OverpassElement = {
      type: 'node',
      id: 123,
      lat: 12.9,
      lon: 77.6,
      tags: { amenity: 'fuel', name: 'HP Pump', brand: 'HP', phone: '+91...', random: 'x' },
    };
    const poi = normalizeOverpassElement(el)!;
    expect(poi.category).toBe('fuel');
    expect(poi.name).toBe('HP Pump');
    expect(poi.lng).toBe(77.6);
    expect(poi.tags).toEqual({ brand: 'HP', phone: '+91...' });
    expect(poi.tags.random).toBeUndefined();
  });

  it('uses center for ways/relations', () => {
    const el: OverpassElement = {
      type: 'way',
      id: 9,
      center: { lat: 1, lon: 2 },
      tags: { amenity: 'hospital' },
    };
    expect(normalizeOverpassElement(el)).toMatchObject({ lat: 1, lng: 2, category: 'hospital' });
  });

  it('returns null when there is no location', () => {
    expect(normalizeOverpassElement({ type: 'node', id: 1, tags: { amenity: 'fuel' } })).toBeNull();
  });
});

describe('nearestByCategory', () => {
  it('returns the closest POIs of a category, sorted', () => {
    const from = { lng: 77.0, lat: 13.0 };
    const pois = [
      { lng: 77.5, lat: 13.0, category: 'fuel' as const },
      { lng: 77.05, lat: 13.0, category: 'fuel' as const },
      { lng: 77.01, lat: 13.0, category: 'hospital' as const },
    ];
    const out = nearestByCategory(from, pois, 'fuel', 5);
    expect(out).toHaveLength(2);
    expect(out[0]!.lng).toBe(77.05); // closer fuel first
    expect(out[0]!.distanceM).toBeLessThan(out[1]!.distanceM);
  });
});
