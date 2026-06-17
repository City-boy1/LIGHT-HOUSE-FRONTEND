// ============================================================
// BIBLE READER – uses bible-api.com (free, no key required)
// Supports: King James Version by default
// ============================================================

const BIBLE_BOOKS = [
  // Old Testament
  { name: 'Genesis', abbr: 'genesis', chapters: 50 },
  { name: 'Exodus', abbr: 'exodus', chapters: 40 },
  { name: 'Leviticus', abbr: 'leviticus', chapters: 27 },
  { name: 'Numbers', abbr: 'numbers', chapters: 36 },
  { name: 'Deuteronomy', abbr: 'deuteronomy', chapters: 34 },
  { name: 'Joshua', abbr: 'joshua', chapters: 24 },
  { name: 'Judges', abbr: 'judges', chapters: 21 },
  { name: 'Ruth', abbr: 'ruth', chapters: 4 },
  { name: '1 Samuel', abbr: '1+samuel', chapters: 31 },
  { name: '2 Samuel', abbr: '2+samuel', chapters: 24 },
  { name: '1 Kings', abbr: '1+kings', chapters: 22 },
  { name: '2 Kings', abbr: '2+kings', chapters: 25 },
  { name: '1 Chronicles', abbr: '1+chronicles', chapters: 29 },
  { name: '2 Chronicles', abbr: '2+chronicles', chapters: 36 },
  { name: 'Ezra', abbr: 'ezra', chapters: 10 },
  { name: 'Nehemiah', abbr: 'nehemiah', chapters: 13 },
  { name: 'Esther', abbr: 'esther', chapters: 10 },
  { name: 'Job', abbr: 'job', chapters: 42 },
  { name: 'Psalms', abbr: 'psalms', chapters: 150 },
  { name: 'Proverbs', abbr: 'proverbs', chapters: 31 },
  { name: 'Ecclesiastes', abbr: 'ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', abbr: 'song+of+solomon', chapters: 8 },
  { name: 'Isaiah', abbr: 'isaiah', chapters: 66 },
  { name: 'Jeremiah', abbr: 'jeremiah', chapters: 52 },
  { name: 'Lamentations', abbr: 'lamentations', chapters: 5 },
  { name: 'Ezekiel', abbr: 'ezekiel', chapters: 48 },
  { name: 'Daniel', abbr: 'daniel', chapters: 12 },
  { name: 'Hosea', abbr: 'hosea', chapters: 14 },
  { name: 'Joel', abbr: 'joel', chapters: 3 },
  { name: 'Amos', abbr: 'amos', chapters: 9 },
  { name: 'Obadiah', abbr: 'obadiah', chapters: 1 },
  { name: 'Jonah', abbr: 'jonah', chapters: 4 },
  { name: 'Micah', abbr: 'micah', chapters: 7 },
  { name: 'Nahum', abbr: 'nahum', chapters: 3 },
  { name: 'Habakkuk', abbr: 'habakkuk', chapters: 3 },
  { name: 'Zephaniah', abbr: 'zephaniah', chapters: 3 },
  { name: 'Haggai', abbr: 'haggai', chapters: 2 },
  { name: 'Zechariah', abbr: 'zechariah', chapters: 14 },
  { name: 'Malachi', abbr: 'malachi', chapters: 4 },
  // New Testament
  { name: 'Matthew', abbr: 'matthew', chapters: 28 },
  { name: 'Mark', abbr: 'mark', chapters: 16 },
  { name: 'Luke', abbr: 'luke', chapters: 24 },
  { name: 'John', abbr: 'john', chapters: 21 },
  { name: 'Acts', abbr: 'acts', chapters: 28 },
  { name: 'Romans', abbr: 'romans', chapters: 16 },
  { name: '1 Corinthians', abbr: '1+corinthians', chapters: 16 },
  { name: '2 Corinthians', abbr: '2+corinthians', chapters: 13 },
  { name: 'Galatians', abbr: 'galatians', chapters: 6 },
  { name: 'Ephesians', abbr: 'ephesians', chapters: 6 },
  { name: 'Philippians', abbr: 'philippians', chapters: 4 },
  { name: 'Colossians', abbr: 'colossians', chapters: 4 },
  { name: '1 Thessalonians', abbr: '1+thessalonians', chapters: 5 },
  { name: '2 Thessalonians', abbr: '2+thessalonians', chapters: 3 },
  { name: '1 Timothy', abbr: '1+timothy', chapters: 6 },
  { name: '2 Timothy', abbr: '2+timothy', chapters: 4 },
  { name: 'Titus', abbr: 'titus', chapters: 3 },
  { name: 'Philemon', abbr: 'philemon', chapters: 1 },
  { name: 'Hebrews', abbr: 'hebrews', chapters: 13 },
  { name: 'James', abbr: 'james', chapters: 5 },
  { name: '1 Peter', abbr: '1+peter', chapters: 5 },
  { name: '2 Peter', abbr: '2+peter', chapters: 3 },
  { name: '1 John', abbr: '1+john', chapters: 5 },
  { name: '2 John', abbr: '2+john', chapters: 1 },
  { name: '3 John', abbr: '3+john', chapters: 1 },
  { name: 'Jude', abbr: 'jude', chapters: 1 },
  { name: 'Revelation', abbr: 'revelation', chapters: 22 },
];

const bibleBookSelect = document.getElementById('bibleBook');
const bibleChapterSelect = document.getElementById('bibleChapter');
const bibleReadBtn = document.getElementById('bibleReadBtn');
const bibleContent = document.getElementById('bibleContent');
const bibleSearch = document.getElementById('bibleSearch');
const bibleSearchBtn = document.getElementById('bibleSearchBtn');

// Populate books dropdown
BIBLE_BOOKS.forEach((book, idx) => {
  if (idx === 39) {
    const separator = document.createElement('option');
    separator.disabled = true;
    separator.textContent = '── New Testament ──';
    bibleBookSelect.appendChild(separator);
  }
  const opt = document.createElement('option');
  opt.value = book.abbr;
  opt.textContent = book.name;
  opt.dataset.chapters = book.chapters;
  bibleBookSelect.appendChild(opt);
});

bibleBookSelect.addEventListener('change', () => {
  const selected = bibleBookSelect.options[bibleBookSelect.selectedIndex];
  const chapters = parseInt(selected.dataset.chapters) || 0;

  bibleChapterSelect.innerHTML = '<option value="">Chapter</option>';
  bibleChapterSelect.disabled = !chapters;
  bibleReadBtn.disabled = true;

  for (let i = 1; i <= chapters; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Chapter ${i}`;
    bibleChapterSelect.appendChild(opt);
  }
});

bibleChapterSelect.addEventListener('change', () => {
  bibleReadBtn.disabled = !bibleChapterSelect.value;
});

bibleReadBtn.addEventListener('click', () => {
  const book = bibleBookSelect.value;
  const chapter = bibleChapterSelect.value;
  const bookName = bibleBookSelect.options[bibleBookSelect.selectedIndex].text;
  if (book && chapter) fetchChapter(book, chapter, bookName);
});

async function fetchChapter(book, chapter, bookName) {
  bibleContent.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner"></div><p style="color:var(--text-light);margin-top:16px">Loading ${bookName} ${chapter}...</p></div>`;

  try {
    const res = await fetch(`https://bible-api.com/${book}+${chapter}?translation=kjv`);
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();

    bibleContent.innerHTML = `
      <div class="bible-chapter-title">
        ${bookName} — Chapter ${chapter}
        <div style="font-size:0.75rem;color:var(--text-light);font-family:var(--font-body);font-weight:400;margin-top:6px;letter-spacing:2px">King James Version</div>
      </div>
      ${data.verses.map(v => `
        <div class="verse">
          <span class="verse-num">${v.verse}</span>
          <span class="verse-text">${v.text.trim()}</span>
        </div>
      `).join('')}
    `;
    bibleContent.scrollTop = 0;
  } catch (err) {
    bibleContent.innerHTML = `<div class="bible-welcome"><div class="bible-cross">✞</div><p style="color:var(--error)">Could not load chapter. Please check your connection and try again.</p></div>`;
  }
}

// Bible search
async function searchBible() {
  const query = bibleSearch.value.trim();
  if (!query) return;

  bibleContent.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner"></div><p style="color:var(--text-light);margin-top:16px">Searching...</p></div>`;

  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const ref = data.reference || query;
    bibleContent.innerHTML = `
      <div class="bible-chapter-title">${ref}</div>
      ${data.verses.map(v => `
        <div class="verse">
          <span class="verse-num">${v.verse}</span>
          <span class="verse-text">${v.text.trim()}</span>
        </div>
      `).join('')}
    `;
  } catch (err) {
    bibleContent.innerHTML = `
      <div class="bible-welcome">
        <div class="bible-cross">✞</div>
        <p style="color:var(--error)">Could not find "${query}". Try a format like: <strong>John 3:16</strong> or <strong>Psalms 23</strong></p>
      </div>
    `;
  }
}

bibleSearchBtn.addEventListener('click', searchBible);
bibleSearch.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchBible(); });