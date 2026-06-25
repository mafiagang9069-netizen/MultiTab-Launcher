import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync, execSync } from 'child_process';

// Helper to calculate MD5 hash of a file
function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

// Find a Chromium-based browser for headless rendering (Edge or Chrome)
function findBrowserPath() {
  const commonPaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  // Fallbacks using 'where' command
  try {
    const edgePath = execSync('where.exe msedge').toString().trim().split('\r\n')[0];
    if (fs.existsSync(edgePath)) return edgePath;
  } catch {}
  try {
    const chromePath = execSync('where.exe chrome').toString().trim().split('\r\n')[0];
    if (fs.existsSync(chromePath)) return chromePath;
  } catch {}
  return null;
}

// Custom ICO packing compiler
function createIco(pngBuffers, widths) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  const directories = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (let i = 0; i < pngBuffers.length; i++) {
    const buf = pngBuffers[i];
    const width = widths[i];
    const dir = Buffer.alloc(16);
    dir.writeUInt8(width >= 256 ? 0 : width, 0); // Width
    dir.writeUInt8(width >= 256 ? 0 : width, 1); // Height
    dir.writeUInt8(0, 2); // Color palette
    dir.writeUInt8(0, 3); // Reserved
    dir.writeUInt16LE(1, 4); // Color planes
    dir.writeUInt16LE(32, 6); // Bits per pixel
    dir.writeUInt32LE(buf.length, 8); // Image size
    dir.writeUInt32LE(currentOffset, 12); // Image offset
    directories.push(dir);
    currentOffset += buf.length;
  }

  return Buffer.concat([header, ...directories, ...pngBuffers]);
}

export default function faviconPlugin() {
  let logoPath = '';
  let logoHash = '';

  const generateFavicons = async () => {
    // 1. Detect application primary logo asset
    const candidates = [
      path.resolve('public/logo.svg'),
      path.resolve('src/assets/logo.svg'),
      path.resolve('public/logo.png'),
      path.resolve('src/assets/logo.png'),
    ];

    logoPath = candidates.find(c => fs.existsSync(c)) || '';
    if (!logoPath) {
      console.error('[Favicon Plugin] ERROR: Primary logo asset not found! Ensure public/logo.svg or logo.png exists.');
      return;
    }

    const currentHash = getFileHash(logoPath);
    if (!currentHash) return;

    // 2. Check if we can skip regeneration
    const publicDir = path.resolve('public');
    const hashFilePath = path.join(publicDir, '.favicon-hash.txt');
    const targets = [
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'favicon-192x192.png',
      'favicon-512x512.png',
    ].map(f => path.join(publicDir, f));

    const allExist = targets.every(f => fs.existsSync(f));
    let skip = false;

    if (fs.existsSync(hashFilePath) && allExist) {
      const storedHash = fs.readFileSync(hashFilePath, 'utf-8').trim();
      if (storedHash === currentHash) {
        skip = true;
      }
    }

    if (skip) {
      logoHash = currentHash;
      // Skip generation since hash matches and files exist
      return;
    }

    console.log(`[Favicon Plugin] Source logo changed (hash: ${currentHash}). Regenerating favicon assets...`);

    // Ensure public folder exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // 3. Locate browser for headless screenshot rendering
    const browserPath = findBrowserPath();
    if (!browserPath) {
      console.warn('[Favicon Plugin] WARNING: No compatible browser (Edge or Chrome) found for headless favicon rendering. Skipping regeneration and using existing assets on disk.');
      logoHash = currentHash;
      return;
    }

    // 4. Create temporary html rendering page
    const tempHtmlPath = path.join(publicDir, '_temp_favicon_render.html');
    const relativeLogoPath = path.relative(publicDir, logoPath).replace(/\\/g, '/');
    const tempHtmlContent = `<!DOCTYPE html>
<html>
<head>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }
  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }
</style>
</head>
<body>
  <img src="${relativeLogoPath}" />
</body>
</html>`;
    
    fs.writeFileSync(tempHtmlPath, tempHtmlContent, 'utf-8');

    const pngSizes = {
      'favicon-16x16.png': 16,
      'favicon-32x32.png': 32,
      'apple-touch-icon.png': 180,
      'favicon-192x192.png': 192,
      'favicon-512x512.png': 512,
    };

    const pngBuffers = {};

    try {
      const tempUrl = `file:///${tempHtmlPath.replace(/\\/g, '/')}`;

      for (const [filename, size] of Object.entries(pngSizes)) {
        const destPath = path.join(publicDir, filename);

        // Run Edge/Chrome headlessly to take screenshot of the temp HTML
        execFileSync(browserPath, [
          '--headless',
          '--disable-gpu',
          '--hide-scrollbars',
          `--screenshot=${destPath}`,
          `--window-size=${size},${size}`,
          tempUrl
        ]);

        if (!fs.existsSync(destPath)) {
          throw new Error(`Failed to generate ${filename} using headless browser screenshot.`);
        }

        pngBuffers[size] = fs.readFileSync(destPath);
      }

      // 5. Generate favicon.ico using compiled 16x16 and 32x32 buffers
      const icoBuffer = createIco([pngBuffers[16], pngBuffers[32]], [16, 32]);
      fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

      // 6. Update manifest.json with the generated files and hashes
      const manifestPath = path.join(publicDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          manifest.icons = [
            {
              src: `/favicon-192x192.png?v=${currentHash}`,
              type: 'image/png',
              sizes: '192x192'
            },
            {
              src: `/favicon-512x512.png?v=${currentHash}`,
              type: 'image/png',
              sizes: '512x512'
            }
          ];
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        } catch (err) {
          console.error('[Favicon Plugin] Failed to update manifest.json:', err);
        }
      }

      // Write hash to disk to register successful generation
      fs.writeFileSync(hashFilePath, currentHash, 'utf-8');
      logoHash = currentHash;
      console.log('[Favicon Plugin] All favicon assets and manifests updated successfully.');

    } finally {
      // Clean up temporary rendering page
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    }
  };

  return {
    name: 'vite-plugin-favicon',

    async buildStart() {
      await generateFavicons();
    },

    configureServer(server) {
      // Run once on server startup
      generateFavicons().catch(err => {
        console.error('[Favicon Plugin] Error generating favicons on server start:', err);
      });

      // Watch the logo file for updates
      if (logoPath) {
        server.watcher.add(logoPath);
        server.watcher.on('change', async (changedPath) => {
          if (path.resolve(changedPath) === path.resolve(logoPath)) {
            try {
              await generateFavicons();
              // Push reload signal to refresh browser tab icons
              server.ws.send({ type: 'full-reload' });
            } catch (err) {
              console.error('[Favicon Plugin] Error regenerating favicons on change:', err);
            }
          }
        });
      }
    },

    transformIndexHtml(html) {
      const currentHash = logoHash || '1';
      let processed = html;

      // 1. Force the title to "MultiTab Launcher"
      const titleRegex = /<title>[^<]*<\/title>/i;
      const newTitle = '<title>MultiTab Launcher</title>';
      if (titleRegex.test(processed)) {
        processed = processed.replace(titleRegex, newTitle);
      } else {
        processed = processed.replace('</head>', `  ${newTitle}\n  </head>`);
      }

      // 2. Remove any pre-existing links for favicon/shortcut/apple-touch/manifest to prevent duplicates
      const removeLink = (rel, sizes) => {
        let regex;
        if (sizes) {
          regex = new RegExp(`<link\\s+[^>]*rel=["']${rel}["'][^>]*sizes=["']${sizes}["'][^>]*\\/?>`, 'gi');
        } else {
          regex = new RegExp(`<link\\s+[^>]*rel=["']${rel}["'](?!\\s+sizes)[^>]*\\/?>`, 'gi');
        }
        processed = processed.replace(regex, '');
      };

      removeLink('icon');
      removeLink('apple-touch-icon');
      removeLink('manifest');
      processed = processed.replace(/<link\s+[^>]*rel=["']shortcut icon["'][^>]*\/?>/gi, '');

      // 3. Remove existing meta tags for requested metadata
      const removeMeta = (name) => {
        const regex = new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*\\/?>`, 'gi');
        processed = processed.replace(regex, '');
      };

      removeMeta('theme-color');
      removeMeta('application-name');
      removeMeta('mobile-web-app-capable');
      removeMeta('apple-mobile-web-app-capable');

      // 4. Inject modern metadata and cache-busted links
      const injections = [
        `<!-- Favicons and Web App Branding -->`,
        `<link rel="icon" type="image/x-icon" href="/favicon.ico?v=${currentHash}" />`,
        `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=${currentHash}" />`,
        `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=${currentHash}" />`,
        `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=${currentHash}" />`,
        `<link rel="manifest" href="/manifest.json?v=${currentHash}" />`,
        `<meta name="theme-color" content="#0F172A" />`,
        `<meta name="application-name" content="MultiTab Launcher" />`,
        `<meta name="mobile-web-app-capable" content="yes" />`,
        `<meta name="apple-mobile-web-app-capable" content="yes" />`
      ].map(line => `    ${line}`).join('\n');

      return processed.replace('</head>', `${injections}\n  </head>`);
    }
  };
}
