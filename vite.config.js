import { defineConfig } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Dev-only capture sink. Reading a live WebGL canvas back through the
 * automation bridge stalls, so the page POSTs a data URL here instead and we
 * write the PNG to disk.
 */
function shotSink() {
  return {
    name: 'soda-shot-sink',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const [, name = 'shot', data = ''] = body.match(/^([\w-]+)\|(.*)$/s) || [];
          const dir = resolve(server.config.root, 'shots');
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, `${name}.png`), Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [shotSink()],
  // The example loaders import 'three' themselves; without this the app and
  // the loaders can end up on two copies and instanceof checks start failing.
  resolve: { dedupe: ['three'] },
});
