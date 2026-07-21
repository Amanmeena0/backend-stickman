import { parseClientUrls } from '../../src/config';

describe('parseClientUrls', () => {
  test('should return wildcard array when input is undefined or empty', () => {
    expect(parseClientUrls()).toEqual(['*']);
    expect(parseClientUrls('')).toEqual(['*']);
  });

  test('should return single wildcard when input is *', () => {
    expect(parseClientUrls('*')).toEqual(['*']);
  });

  test('should parse comma-separated URLs into array of origin strings', () => {
    const input = 'http://localhost:3000, https://stickman-battle-ten.vercel.app';
    expect(parseClientUrls(input)).toEqual([
      'http://localhost:3000',
      'https://stickman-battle-ten.vercel.app',
    ]);
  });

  test('should clean bracketed array strings like [url1, url2]', () => {
    const input = '[http://localhost:3000, https://stickman-battle-ten.vercel.app/game]';
    expect(parseClientUrls(input)).toEqual([
      'http://localhost:3000',
      'https://stickman-battle-ten.vercel.app',
    ]);
  });

  test('should handle quoted URL strings inside array', () => {
    const input = '["http://localhost:3000", "https://example.com"]';
    expect(parseClientUrls(input)).toEqual([
      'http://localhost:3000',
      'https://example.com',
    ]);
  });
});
