#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';
import readline from 'readline';

function readPackageName(): string | null {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return typeof pkg.name === 'string' && pkg.name.length ? pkg.name : null;
  } catch {
    return null;
  }
}

function question(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (ans) => { rl.close(); resolve(ans); }));
}

// Password-based login removed. This script now uses the OAuth code flow only.

async function main() {
  // Always use OAuth code flow. Prompt for client_id and app_secret.
  let client_id = '';
  while (!client_id) {
    client_id = (await question('Enter your pCloud client_id: ')).trim();
  }

  let app_secret = '';
  while (!app_secret) {
    app_secret = (await question('Enter your pCloud app_secret: ')).trim();
  }

  const oauthUrl = url.format({
    protocol: 'https',
    hostname: 'my.pcloud.com',
    pathname: '/oauth2/authorize',
    query: { client_id, response_type: 'code' }
  });

  console.log('\n1) Open this URL in a browser and authorize the app:');
  console.log(oauthUrl);
  console.log('\n2) After authorizing you will receive a code. Paste it below.');

  const code = (await question('Enter code: ')).trim();
  if (!code) {
    console.error('No code provided.');
    process.exit(1);
  }

  try {
    const apiBase = process.env.PCLOUD_API_BASE || 'https://eapi.pcloud.com';
    const params = new URLSearchParams({ client_id, client_secret: app_secret, code });
    const resp = await fetch(`${apiBase}/oauth2_token?${params.toString()}`);
    const data = await resp.json() as any;
    if (data && (data.access_token || data.auth)) {
      const token = data.access_token || data.auth;
      console.log('\n=== pCloud Token ===');
      console.log('access_token:', token);
      if (data.userid) console.log('userid:', data.userid);
      console.log('\nCopy the access_token value into your PCLOUD_TOKEN environment variable.');
    } else {
      console.error('Failed to exchange code for token:', data);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Failed to exchange code for token:', err && err.error ? err.error : err);
    console.error('\nIf you see `Invalid \'client_id\'`, make sure you created an OAuth app on pCloud and are using its client_id.');
    process.exit(1);
  }
}

if (require.main === module) void main();

export { main };
