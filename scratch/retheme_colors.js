const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const tsxFiles = walkSync('./src/app', []);

const replacements = [
  // Backgrounds (Primary Action)
  { regex: /\bbg-emerald-700\b/g, replace: 'bg-slate-800' },
  { regex: /\bbg-emerald-600\b/g, replace: 'bg-slate-900' },
  { regex: /\bbg-emerald-500\b/g, replace: 'bg-slate-900' },
  
  // Backgrounds (Soft / Accents)
  { regex: /\bbg-emerald-100\b/g, replace: 'bg-slate-200' },
  { regex: /\bbg-emerald-50\b/g, replace: 'bg-slate-100' },
  
  // Backgrounds with Opacity
  { regex: /\bbg-emerald-500\/10\b/g, replace: 'bg-slate-900/5' },
  { regex: /\bbg-emerald-500\/20\b/g, replace: 'bg-slate-900/10' },
  { regex: /\bbg-emerald-600\/10\b/g, replace: 'bg-slate-900/5' },
  { regex: /\bbg-emerald-600\/20\b/g, replace: 'bg-slate-900/10' },

  // Text colors
  { regex: /\btext-emerald-800\b/g, replace: 'text-slate-900' },
  { regex: /\btext-emerald-700\b/g, replace: 'text-slate-900' },
  { regex: /\btext-emerald-600\b/g, replace: 'text-slate-900' },
  { regex: /\btext-emerald-500\b/g, replace: 'text-slate-700' },
  { regex: /\btext-emerald-400\b/g, replace: 'text-slate-500' },

  // Borders
  { regex: /\bborder-emerald-500\b/g, replace: 'border-slate-500' },
  { regex: /\bborder-emerald-400\b/g, replace: 'border-slate-400' },
  { regex: /\bborder-emerald-300\b/g, replace: 'border-slate-300' },
  { regex: /\bborder-emerald-200\b/g, replace: 'border-slate-200' },
  { regex: /\bborder-emerald-100\b/g, replace: 'border-slate-200' },

  // Rings and Focus states
  { regex: /\bring-emerald-500\b/g, replace: 'ring-slate-900' },
  { regex: /\bring-emerald-500\/20\b/g, replace: 'ring-slate-900/20' },
  { regex: /\bring-emerald-400\b/g, replace: 'ring-slate-400' },

  // Hover states
  { regex: /\bhover:bg-emerald-700\b/g, replace: 'hover:bg-slate-800' },
  { regex: /\bhover:bg-emerald-600\b/g, replace: 'hover:bg-slate-800' },
  { regex: /\bhover:bg-emerald-50\b/g, replace: 'hover:bg-slate-100' },
  { regex: /\bhover:text-emerald-700\b/g, replace: 'hover:text-slate-900' },
  { regex: /\bhover:text-emerald-600\b/g, replace: 'hover:text-slate-900' },
  { regex: /\bhover:border-emerald-200\b/g, replace: 'hover:border-slate-300' },
];

let updatedCount = 0;

tsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  replacements.forEach(r => {
    content = content.replace(r.regex, r.replace);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Rethemed colors in ${file}`);
  }
});

console.log(`\nDone. Updated ${updatedCount} files.`);
