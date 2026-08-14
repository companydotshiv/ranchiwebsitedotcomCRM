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
  { regex: /\bp-8\b/g, replace: 'p-6' },
  { regex: /\bp-6\b/g, replace: 'p-4' },
  { regex: /\bp-5\b/g, replace: 'p-4' },
  { regex: /\bp-4\b/g, replace: 'p-3' },
  { regex: /\bpx-12\b/g, replace: 'px-8' },
  { regex: /\bpx-8\b/g, replace: 'px-6' },
  { regex: /\bpx-6\b/g, replace: 'px-4' },
  { regex: /\bpx-5\b/g, replace: 'px-4' },
  { regex: /\bpx-4\b/g, replace: 'px-3' },
  { regex: /\bpy-12\b/g, replace: 'py-8' },
  { regex: /\bpy-8\b/g, replace: 'py-6' },
  { regex: /\bpy-6\b/g, replace: 'py-4' },
  { regex: /\bpy-5\b/g, replace: 'py-4' },
  { regex: /\bpy-4\b/g, replace: 'py-3' },
  
  // Margins
  { regex: /\bm-8\b/g, replace: 'm-6' },
  { regex: /\bm-6\b/g, replace: 'm-4' },
  { regex: /\bm-5\b/g, replace: 'm-4' },
  { regex: /\bm-4\b/g, replace: 'm-3' },
  { regex: /\bmy-8\b/g, replace: 'my-6' },
  { regex: /\bmy-6\b/g, replace: 'my-4' },
  { regex: /\bmy-5\b/g, replace: 'my-4' },
  { regex: /\bmy-4\b/g, replace: 'my-3' },
  { regex: /\bmx-8\b/g, replace: 'mx-6' },
  { regex: /\bmx-6\b/g, replace: 'mx-4' },
  { regex: /\bmx-5\b/g, replace: 'mx-4' },
  { regex: /\bmx-4\b/g, replace: 'mx-3' },
  { regex: /\bmt-12\b/g, replace: 'mt-8' },
  { regex: /\bmt-8\b/g, replace: 'mt-6' },
  { regex: /\bmt-6\b/g, replace: 'mt-4' },
  { regex: /\bmt-5\b/g, replace: 'mt-4' },
  { regex: /\bmt-4\b/g, replace: 'mt-3' },
  { regex: /\bmb-12\b/g, replace: 'mb-8' },
  { regex: /\bmb-8\b/g, replace: 'mb-6' },
  { regex: /\bmb-6\b/g, replace: 'mb-4' },
  { regex: /\bmb-5\b/g, replace: 'mb-4' },
  { regex: /\bmb-4\b/g, replace: 'mb-3' },

  // Gaps & Space
  { regex: /\bspace-y-12\b/g, replace: 'space-y-8' },
  { regex: /\bspace-y-8\b/g, replace: 'space-y-6' },
  { regex: /\bspace-y-6\b/g, replace: 'space-y-4' },
  { regex: /\bspace-y-5\b/g, replace: 'space-y-4' },
  { regex: /\bspace-y-4\b/g, replace: 'space-y-3' },
  { regex: /\bspace-y-3\b/g, replace: 'space-y-2' },
  { regex: /\bgap-12\b/g, replace: 'gap-8' },
  { regex: /\bgap-8\b/g, replace: 'gap-6' },
  { regex: /\bgap-6\b/g, replace: 'gap-4' },
  { regex: /\bgap-5\b/g, replace: 'gap-4' },
  { regex: /\bgap-4\b/g, replace: 'gap-3' },
  { regex: /\bgap-3\b/g, replace: 'gap-2' }
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
