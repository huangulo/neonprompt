const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testBodyPadding() {
    const htmlPath = path.join(__dirname, 'public/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const { document } = dom.window;
    
    const styleTags = document.querySelectorAll('style');
    let bodyStyle = '';
    styleTags.forEach(tag => {
        if (tag.textContent.includes('body {')) {
            bodyStyle += tag.textContent;
        }
    });

    console.log('Checking body styles...');
    
    // Check for padding: 5px 10px
    if (!bodyStyle.match(/body\s*\{[^}]*padding:\s*5px 10px;?[^}]*\}/)) {
        throw new Error('Body padding is not 5px 10px');
    }
    
    // Check for box-sizing: border-box
    if (!bodyStyle.includes('box-sizing: border-box;')) {
        throw new Error('box-sizing: border-box not applied to body');
    }

    console.log('Body padding and box-sizing tests passed!');
}

testBodyPadding().catch(err => {
    console.error(err);
    process.exit(1);
});
