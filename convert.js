import fs from 'fs';
const data = fs.readFileSync('public/game.data');
fs.writeFileSync('src/gameData.ts', 'export const GAME_DATA_BASE64 = "' + data.toString('base64') + '";\n');
