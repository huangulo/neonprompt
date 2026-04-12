const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testHeader() {
    const htmlPath = path.join(__dirname, 'public/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const { document } = dom.window;
    
    const header = document.querySelector('.header');
    if (!header) throw new Error('Header element not found');
    
    // In a real browser, we'd check computed styles.
    // Here we check the inline styles or the style block content.
    const styleTags = document.querySelectorAll('style');
    let headerStyle = '';
    styleTags.forEach(tag => {
        if (tag.textContent.includes('.header')) {
            headerStyle += tag.textContent;
        }
    });

    console.log('Checking header styles...');
    
    // Check for padding: 8px 25px
    if (!headerStyle.includes('padding: 8px 25px;')) {
        throw new Error('Header padding is not 8px 25px');
    }
    
    // Check for display: flex
    if (!headerStyle.includes('display: flex;')) {
        throw new Error('Header display is not flex');
    }
    
    // Check for align-items: center
    if (!headerStyle.includes('align-items: center;')) {
        throw new Error('Header align-items is not center');
    }

    console.log('Tests passed!');
}

testHeader().catch(err => {
    console.error(err);
    process.exit(1);
});
