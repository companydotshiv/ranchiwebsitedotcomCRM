const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, '../src/app'));

let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Typography replacements
  content = content.replace(/\btext-\[10px\]\b/g, 'text-xs');
  content = content.replace(/\btext-base\b/g, 'text-sm');
  content = content.replace(/\btext-lg\b/g, 'text-sm');
  content = content.replace(/\btext-2xl\b/g, 'text-xl');
  content = content.replace(/\btext-3xl\b/g, 'text-xl');
  content = content.replace(/\btext-4xl\b/g, 'text-xl');
  content = content.replace(/\btext-5xl\b/g, 'text-xl');

  // Color replacements
  content = content.replace(/\b(bg|text|border|ring|shadow)-indigo-(\d{2,3})\b/g, '$1-slate-$2');
  content = content.replace(/\b(bg|text|border|ring|shadow)-amber-(\d{2,3})\b/g, '$1-emerald-$2');
  content = content.replace(/\b(bg|text|border|ring|shadow)-blue-(\d{2,3})\b/g, '$1-slate-$2');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`Finished processing. Updated ${changedCount} files.`);
