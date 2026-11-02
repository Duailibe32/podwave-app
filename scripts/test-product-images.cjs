const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transformSync}=require('esbuild');
const moduleUnderTest={exports:{}};
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/productImage.ts','utf8'),{loader:'ts',format:'cjs'}).code,{module:moduleUnderTest,exports:moduleUnderTest.exports});
const {productCardImage}=moduleUnderTest.exports;
const image=productCardImage('https://i.imgur.com/W8biA2F.png');
assert.equal(image.src,'https://i.imgur.com/W8biA2Fl.png');
assert.match(image.srcSet,/W8biA2Fm.png 320w/);
assert.match(image.srcSet,/W8biA2Fh.png 1024w/);
for(const source of ['/assets/local.png','data:image/png;base64,synthetic','https://other.example/image.png','https://i.imgur.com/W8biA2Fl.png','https://i.imgur.com/W8biA2F.gif']) {
 const result=productCardImage(source);assert.equal(result.src,source);assert.equal(result.srcSet,undefined);
}
assert.match(productCardImage('https://i.imgur.com/abc12.jpg?v=2').src,/abc12l.jpg\?v=2$/);
console.log('PASS: responsive Imgur thumbnail URLs, original-source preservation, existing-thumbnail and animated-image exclusions. Local tests only.');
