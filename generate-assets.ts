import { ASSET_CATALOG, generateAssetCanvas } from './canvasGenerator.ts';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Generating PNG assets for C code...');
  const assetsDir = './public/assets';
  fs.mkdirSync(assetsDir, { recursive: true });
  
  const assetsTs: Record<string, string> = {};
  
  for (const asset of ASSET_CATALOG) {
    const buffer = generateAssetCanvas(asset.id);
    fs.writeFileSync(path.join(assetsDir, `${asset.id}.png`), buffer);
    if (asset.id === 'bg_notebook') {
      fs.writeFileSync(path.join(assetsDir, `background.png`), buffer);
    }
    assetsTs[asset.id] = `data:image/png;base64,${buffer.toString('base64')}`;
    console.log(`Generated: ${asset.id}.png`);
  }

  const fileContent = `// Auto-generated assets\nexport const GAME_ASSETS: Record<string, string> = ${JSON.stringify(assetsTs, null, 2)};\n`;
  fs.writeFileSync('./src/assets.ts', fileContent);
  console.log('Successfully wrote to ./src/assets.ts and public/assets/');
}

main().catch(console.error);
