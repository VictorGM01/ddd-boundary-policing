#!/usr/bin/env node
// Wraps a raw Mermaid file into a Markdown page so GitHub renders it.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const [source, target] = process.argv.slice(2);
const title = target.includes('contextos') ? 'Grafo de dependências por camada' : 'Grafo de dependências (arquivos)';
const mermaid = readFileSync(source, 'utf8').trim();
writeFileSync(
  target,
  `# ${title}\n\nGerado por \`npm run ${target.includes('contextos') ? 'arch:graph:contexts' : 'arch:graph'}\` a partir do código (dependency-cruiser). Não edite à mão.\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`,
);
rmSync(source);
