import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

async function main() {
  const distDir = './dist';
  const omnisdDir = './omnisd';
  
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Please run npm run build first.');
    process.exit(1);
  }
  
  // Remove simulator UI and make canvas full screen
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('Removing simulator UI and adjusting styles for KaiOS...');
    let html = fs.readFileSync(indexPath, 'utf-8');
    const overrideCss = `
    <style>
      .controls-container { display: none !important; }
      .canvas-wrapper { padding: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; }
      body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000 !important; }
      .app-container { min-height: unset !important; justify-content: flex-start !important; align-items: flex-start !important; display: block !important; }
      .game-canvas { border-radius: 0 !important; width: 100vw !important; height: 100vh !important; object-fit: contain; object-position: center top; }
    </style>
    `;
    html = html.replace('</head>', overrideCss + '</head>');
    fs.writeFileSync(indexPath, html);
  }
  
  if (!fs.existsSync(omnisdDir)) {
    fs.mkdirSync(omnisdDir);
  }
  
  // Create application.zip
  console.log('Creating application.zip...');
  const appZip = new JSZip();
  
  const addFilesToZip = (dir: string, currentZip: JSZip, rootPath: string) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        addFilesToZip(filePath, currentZip, rootPath);
      } else {
        const relativePath = path.relative(rootPath, filePath);
        currentZip.file(relativePath, fs.readFileSync(filePath));
      }
    }
  };
  
  addFilesToZip(distDir, appZip, distDir);
  
  const appZipBuffer = await appZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(omnisdDir, 'application.zip'), appZipBuffer);
  console.log('Created application.zip');
  
  // Create update.webapp (empty)
  fs.writeFileSync(path.join(omnisdDir, 'update.webapp'), '');
  console.log('Created update.webapp');
  
  // Create metadata.json for OmniSD
  const metadata = {
    version: 1,
    manifestURL: "app://kaios-doodle-jump/manifest.webapp"
  };
  fs.writeFileSync(path.join(omnisdDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('Created metadata.json');
  
  // Zip it all up into final omnisd package
  console.log('Packaging OmniSD zip...');
  const finalZip = new JSZip();
  finalZip.file('application.zip', appZipBuffer);
  finalZip.file('update.webapp', '');
  finalZip.file('metadata.json', JSON.stringify(metadata, null, 2));
  
  const finalZipBuffer = await finalZip.generateAsync({ type: 'nodebuffer' });
  const finalPath = './kaios-doodle-jump-omnisd.zip';
  fs.writeFileSync(finalPath, finalZipBuffer);
  
  console.log(`Successfully created ${finalPath}`);
}

main().catch(console.error);
