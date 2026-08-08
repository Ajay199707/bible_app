import fs from 'fs';
import path from 'path';
import { BIBLE_BOOKS } from '../src/data/books.js';

const distPath = path.resolve('dist');
const publicPath = path.resolve('public');
const chaptersDir = path.join(distPath, 'chapters');

// Ensure chapters directory exists
if (!fs.existsSync(chaptersDir)) {
  fs.mkdirSync(chaptersDir, { recursive: true });
}

console.log('Starting Static Site Generation (SSG)...');

// Read built index.html as template
let template = '';
try {
  template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
} catch (e) {
  console.error('Error: Could not read dist/index.html. Run npm run build first!');
  process.exit(1);
}

// Load Bible datasets
let englishData = {};
let tamilData = {};
try {
  englishData = JSON.parse(fs.readFileSync(path.join(publicPath, 'data/english_bible.json'), 'utf-8'));
  tamilData = JSON.parse(fs.readFileSync(path.join(publicPath, 'data/tamil_bible.json'), 'utf-8'));
} catch (e) {
  console.error('Error loading bible datasets from public/data/', e);
  process.exit(1);
}

const sitemapUrls = [];
sitemapUrls.push('https://ajay199707.github.io/bible_app/');

const englishBooks = englishData.Book || [];
const tamilBooks = tamilData.Book || [];

// Loop through each book and chapter
englishBooks.forEach((enBookObj, bIdx) => {
  const bookId = bIdx + 1;
  const bookMeta = BIBLE_BOOKS[bIdx] || { nameEn: '', nameTa: '' };
  const enBookName = bookMeta.nameEn;
  const taBookName = bookMeta.nameTa;

  // Find matching Tamil book
  const taBookObj = tamilBooks[bIdx] || {};

  const enChapters = enBookObj.Chapter || [];
  const taChapters = taBookObj.Chapter || [];

  enChapters.forEach((enChapObj, cIdx) => {
    const chapterNum = cIdx + 1;
    const enVerses = enChapObj.Verse || [];
    const taVerses = (taChapters[cIdx] || {}).Verse || [];

    const maxVerses = Math.max(enVerses.length, taVerses.length);
    let versesHtml = '';

    // Generate static parallel HTML for this chapter
    for (let vIdx = 0; vIdx < maxVerses; vIdx++) {
      const vNum = vIdx + 1;
      const enVText = enVerses[vIdx] ? (enVerses[vIdx].Verse || '') : '';
      const taVText = taVerses[vIdx] ? (taVerses[vIdx].Verse || '') : '';

      versesHtml += `
        <div class="verse-row" data-verse="${vNum}">
          <div class="verse-item lang-en">
            <span class="verse-num">${vNum}</span>
            <span class="verse-text">${enVText}</span>
          </div>
          <div class="verse-item lang-ta ta-font">
            <span class="verse-num">${vNum}</span>
            <span class="verse-text">${taVText}</span>
          </div>
        </div>
      `;
    }

    // Build the full reader container markup
    const readerHtml = `
      <div class="reader-container view-mode-parallel font-size-medium line-height-normal">
        <h2 class="reader-header-title">${enBookName} ${chapterNum} | ${taBookName} ${chapterNum}</h2>
        <div class="verses-list">
          ${versesHtml}
        </div>
      </div>
    `;

    // Modify template for this chapter
    let pageHtml = template;

    // 1. Adjust relative asset paths for subfolder chapters/
    pageHtml = pageHtml.replace(/(href|src)="\.\//g, '$1="../');

    // 2. Set title and metadata for SEO
    const titleText = `${enBookName} ${chapterNum} | ${taBookName} ${chapterNum} — Parallel English & Tamil Bible`;
    const descriptionText = `Read and listen to the Holy Bible parallel view for ${enBookName} chapter ${chapterNum} (${taBookName} ${chapterNum}) in English and Tamil side-by-side.`;

    pageHtml = pageHtml.replace(/<title>.*?<\/title>/, `<title>${titleText}</title>`);
    pageHtml = pageHtml.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${descriptionText}" />`);

    // 3. Inject pre-rendered reader content
    pageHtml = pageHtml.replace('<main id="reader-root">', `<main id="reader-root">${readerHtml}`);

    // Write file to chapters directory
    const fileName = `book_${bookId}_chapter_${chapterNum}.html`;
    fs.writeFileSync(path.join(chaptersDir, fileName), pageHtml, 'utf-8');

    // Add to sitemap list
    sitemapUrls.push(`https://ajay199707.github.io/bible_app/chapters/${fileName}`);
  });
});

console.log(`Generated ${sitemapUrls.length - 1} static chapter HTML files inside dist/chapters/.`);

// Generate complete sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${url.endsWith('/') ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(distPath, 'sitemap.xml'), sitemapContent, 'utf-8');
console.log('Generated complete dist/sitemap.xml containing all chapter pages!');
console.log('Pre-rendering build completed successfully.');
