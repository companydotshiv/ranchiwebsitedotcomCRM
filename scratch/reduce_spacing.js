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
      if (file.endsWith('.tsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const tsxFiles = walkSync('./src/app', []);

const replacements = [
  // Paddings
  { regex: /\bp-12\b/g, replace: 'p-8' },
  { regex: /\bp-8\b/g, replace: 'p-5' },
  { regex: /\bp-6\b/g, replace: 'p-4' },
  { regex: /\bpx-12\b/g, replace: 'px-8' },
  { regex: /\bpx-8\b/g, replace: 'px-5' },
  { regex: /\bpx-6\b/g, replace: 'px-4' },
  { regex: /\bpy-12\b/g, replace: 'py-8' },
  { regex: /\bpy-8\b/g, replace: 'py-5' },
  { regex: /\bpy-6\b/g, replace: 'py-4' },
  
  // Margins
  { regex: /\bm-8\b/g, replace: 'm-5' },
  { regex: /\bm-6\b/g, replace: 'm-4' },
  { regex: /\bmy-8\b/g, replace: 'my-5' },
  { regex: /\bmy-6\b/g, replace: 'my-4' },
  { regex: /\bmx-8\b/g, replace: 'mx-5' },
  { regex: /\bmx-6\b/g, replace: 'mx-4' },
  { regex: /\bmt-12\b/g, replace: 'mt-8' },
  { regex: /\bmt-8\b/g, replace: 'mt-5' },
  { regex: /\bmt-6\b/g, replace: 'mt-4' },
  { regex: /\bmb-12\b/g, replace: 'mb-8' },
  { regex: /\bmb-8\b/g, replace: 'mb-5' },
  { regex: /\bmb-6\b/g, replace: 'mb-4' },

  // Gaps & Space
  { regex: /\bspace-y-12\b/g, replace: 'space-y-8' },
  { regex: /\bspace-y-8\b/g, replace: 'space-y-5' },
  { regex: /\bspace-y-6\b/g, replace: 'space-y-4' },
  { regex: /\bgap-12\b/g, replace: 'gap-8' },
  { regex: /\bgap-8\b/g, replace: 'gap-5' },
  { regex: /\bgap-6\b/g, replace: 'gap-4' },
  
  // Border radius sweep (although handled globally, this ensures it isn't overly rounded anywhere)
  { regex: /\brounded-2xl\b/g, replace: 'rounded-xl' },
  { regex: /\brounded-3xl\b/g, replace: 'rounded-xl' }
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
    console.log(`Updated spacing in ${file}`);
  }
});

console.log(`\nDone. Updated ${updatedCount} files.`);
