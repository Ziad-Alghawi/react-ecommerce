// @vitest-environment node
import { it, expect, describe } from 'vitest';
import fs from 'node:fs';
import { siteUrl } from './vite.config';

const html = fs.readFileSync('index.html', 'utf8');

function transform(url?: string) {
  const { transformIndexHtml } = siteUrl(url);
  return (transformIndexHtml as (html: string) => string)(html);
}

function readMeta(page: string, name: string) {
  return page.match(new RegExp(`<meta (?:name|property)="${name}"\\s+content="([^"]*)"`))?.[1];
}

// A baseline JPEG gives its size in the start of frame segment, after the bytes FF C0
function readJpegSize(file: string) {
  const bytes = fs.readFileSync(file);
  const start = bytes.indexOf(Buffer.from([0xff, 0xc0]));
  return { height: bytes.readUInt16BE(start + 5), width: bytes.readUInt16BE(start + 7), fileSize: bytes.length };
}

describe('link previews', () => {
  it('describe the store for search engines and link previews', () => {
    expect(readMeta(html, 'description')).toMatch(/demo store built with React/);
    expect(readMeta(html, 'og:title')).toBe('Ziad-Alghawi Store: everyday essentials, delivered');
    expect(readMeta(html, 'og:description')).toBe(readMeta(html, 'description'));
    expect(readMeta(html, 'og:image:alt')).toBeTruthy();
    expect(readMeta(html, 'twitter:card')).toBe('summary_large_image');
  });

  it('point to the preview image with a full URL, the live store by default', () => {
    expect(readMeta(transform(), 'og:image')).toBe('https://react-ecommerce-8359.onrender.com/og-image.jpg');
    expect(readMeta(transform('https://shop.example.com/'), 'og:image')).toBe('https://shop.example.com/og-image.jpg');
    expect(transform()).not.toContain('%SITE_URL%');
  });

  it('use an image of the size LinkedIn and X show in full, under their 5 MB limit', () => {
    const { width, height, fileSize } = readJpegSize('public/og-image.jpg');

    expect({ width, height }).toEqual({ width: 1200, height: 630 });
    expect(readMeta(html, 'og:image:width')).toBe(String(width));
    expect(readMeta(html, 'og:image:height')).toBe(String(height));
    expect(fileSize).toBeLessThan(5 * 1024 * 1024);
  });
});
