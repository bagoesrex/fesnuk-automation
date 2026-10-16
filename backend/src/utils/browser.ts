import type { Browser, BrowserContext, Page, Locator } from 'playwright';
import { config } from '../config/env.ts';
import { delay, randomInt } from './helpers.ts';
import logger from './logger.ts';

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export function parseProxy(raw?: string | null): ProxyConfig | undefined {
  if (!raw || !raw.trim()) return undefined;
  const str = raw.trim();

  // Vendor format: host:port:username:password
  const parts = str.split(':');
  if (parts.length === 4 && !str.includes('://')) {
    const [host, port, username, password] = parts;
    return {
      server: `http://${host}:${port}`,
      username,
      password,
    };
  }

  // URL format: http(s)://user:pass@host:port or socks5://...
  try {
    const url = new URL(str.includes('://') ? str : `http://${str}`);
    return {
      server: `${url.protocol}//${url.host}`,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
    };
  } catch (err) {
    logger.warn(`Invalid proxy string: ${str} (${String(err)})`);
    return undefined;
  }
}

const CHROMIUM_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=WebRtcHideLocalIpsWithMdns',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-infobars',
  '--window-size=1366,768',
  '--ignore-certificate-errors',
];

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export async function createStealthBrowser(options?: {
  headless?: boolean;
  slowMo?: number;
}): Promise<Browser> {
  const { chromium } = await import('playwright-extra');
  const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
  chromium.use(StealthPlugin());

  return chromium.launch({
    headless: options?.headless ?? config.playwright.headless,
    slowMo: options?.slowMo ?? config.playwright.slowMo,
    args: CHROMIUM_ARGS,
  });
}

export async function createStealthContext(
  browser: Browser,
  options?: {
    proxyUrl?: string | null;
    viewport?: { width: number; height: number };
  }
): Promise<BrowserContext> {
  const proxy = parseProxy(options?.proxyUrl);

  const ctx = await browser.newContext({
    viewport: options?.viewport ?? { width: 1366, height: 768 },
    userAgent: DEFAULT_USER_AGENT,
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    deviceScaleFactor: 1,
    proxy: proxy ? { server: proxy.server, username: proxy.username, password: proxy.password } : undefined,
  });

  // Inject Anti-Fingerprinting & Hardware Masking (masks VPS SwiftShader/llvmpipe GPU, cores, memory)
  await ctx.addInitScript(() => {
    // 1. Spoof WebGL Vendor & Renderer away from Google SwiftShader / Mesa
    const patchWebGL = (proto: any) => {
      if (!proto) return;
      const originalGetParameter = proto.getParameter;
      proto.getParameter = function (param: number) {
        if (param === 37445) return 'Google Inc. (NVIDIA)'; // UNMASKED_VENDOR_WEBGL
        if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'; // UNMASKED_RENDERER_WEBGL
        return originalGetParameter.apply(this, arguments);
      };
    };
    patchWebGL(window.WebGLRenderingContext?.prototype);
    patchWebGL((window as any).WebGL2RenderingContext?.prototype);

    // 2. Consistent CPU cores and RAM
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

    // 3. Languages
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] });

    // 4. Notification permission query
    if (window.navigator?.permissions?.query) {
      const origQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (param: any) =>
        param?.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : origQuery(param);
    }
  });

  return ctx;
}

/** Human-like mouse movement towards locator center before clicking */
export async function humanClick(
  page: Page,
  locator: Locator,
  options?: { force?: boolean }
): Promise<void> {
  try {
    const box = await locator.boundingBox();
    if (box) {
      const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
      const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

      // Move in small natural steps
      await page.mouse.move(targetX, targetY, { steps: randomInt(6, 12) });
      await delay(randomInt(80, 180));
    }
  } catch {
    // If boundingBox fails, proceed to click
  }
  await locator.click({ force: options?.force ?? true });
}
