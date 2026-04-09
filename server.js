// server.js — Bhu Bharati Playwright Microservice
// Deploy on Railway/Render with: npm start
// Requires: npm install express playwright 2captcha-ts

const express = require('express');
const { chromium } = require('playwright');
const { Solver } = require('2captcha-ts');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// In-memory session store: sessionId → { page, browser, context }
const sessions = new Map();

// Auto-cleanup sessions after 5 minutes
const SESSION_TTL = 5 * 60 * 1000;

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.browser.close().catch(() => {});
    sessions.delete(sessionId);
    console.log(`🧹 Session ${sessionId} cleaned up`);
  }
}

// Helper: select dropdown by partial label match
async function selectPartial(page, selector, text) {
  await page.evaluate(({ sel, txt }) => {
    const select = document.querySelector(sel);
    const opt = [...select.options].find(o => o.text.toLowerCase().includes(txt.toLowerCase()));
    if (!opt) {
      throw new Error(`Option not found: "${txt}" in ${sel}. Available: ${[...select.options].map(o => o.text).join(', ')}`);
    }
    select.value = opt.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sel: selector, txt: text });
}

// ──────────────────────────────────────────────
// STEP 1: Fill form, return CAPTCHA image
// POST /init-search
// Body: { district, mandal, village, surveyNo }
// Returns: { sessionId, captchaImage (base64) }
// ──────────────────────────────────────────────
app.post('/init-search', async (req, res) => {
  const { district, mandal, village, surveyNo } = req.body;

  if (!district || !mandal || !village || !surveyNo) {
    return res.status(400).json({ error: 'district, mandal, village, surveyNo are required' });
  }

  let browser;
  try {
    console.log('🌐 Opening browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    await page.goto('https://bhubharati.telangana.gov.in/knowLandStatus', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    // Select "Survey No./Sub-Division No." mode
    console.log('🔘 Selecting Survey No. mode...');
    await page.click('#survyno');
    await page.waitForTimeout(500);

    console.log(`📍 Selecting district: ${district}`);
    await selectPartial(page, '#districtID', district);
    await page.waitForFunction(
      () => document.querySelector('#mandalID').options.length > 1,
      { timeout: 15000 }
    );

    console.log(`📍 Selecting mandal: ${mandal}`);
    await selectPartial(page, '#mandalID', mandal);
    await page.waitForFunction(
      () => document.querySelector('#villageId').options.length > 1,
      { timeout: 15000 }
    );

    console.log(`📍 Selecting village: ${village}`);
    await selectPartial(page, '#villageId', village);

    await page.waitForFunction(
      () => document.querySelector('#surveyIdselect').options.length > 1,
      { timeout: 15000 }
    );
    console.log(`🔢 Selecting survey number: ${surveyNo}`);
    await selectPartial(page, '#surveyIdselect', surveyNo);

    console.log('⏳ Waiting for Khata No dropdown...');
    await page.waitForFunction(
      () => document.querySelector('#khataNoIdselect').options.length > 1,
      { timeout: 25000 }
    );

    // Auto-select first khata number
    console.log('🔢 Auto-selecting first khata number...');
    await page.evaluate(() => {
      const sel = document.querySelector('#khataNoIdselect');
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Screenshot the CAPTCHA image
    console.log('📸 Capturing CAPTCHA image...');
    const captchaBuffer = await page.locator('#imgcapcha').screenshot();
    const captchaImage = captchaBuffer.toString('base64');

    // Store session
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, { browser, context, page });

    // Auto-cleanup after TTL
    setTimeout(() => cleanupSession(sessionId), SESSION_TTL);

    console.log(`✅ Session ${sessionId} created, CAPTCHA returned`);
    res.json({ sessionId, captchaImage });

  } catch (err) {
    console.error('❌ init-search error:', err.message);
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// STEP 2: Submit CAPTCHA answer, get results
// POST /submit-captcha
// Body: { sessionId, captchaText }
// Returns: { status, data }
// ──────────────────────────────────────────────
app.post('/submit-captcha', async (req, res) => {
  const { sessionId, captchaText } = req.body;

  if (!sessionId || !captchaText) {
    return res.status(400).json({ error: 'sessionId and captchaText are required' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session expired or not found. Please start a new search.' });
  }

  const { page, browser } = session;

  try {
    console.log(`🔐 Submitting CAPTCHA for session ${sessionId}...`);
    await page.fill('#captchavalue', captchaText);
    await page.click('input[value="Fetch"]');

    // Wait for results
    await page.waitForFunction(
      () => {
        const grid = document.getElementById('searchDataGrid');
        return grid && grid.style.display !== 'none' && grid.innerText.trim().length > 20;
      },
      { timeout: 25000 }
    );

    // Extract result table
    const data = await page.evaluate(() => {
      const result = {};
      const grid = document.getElementById('searchDataGrid');
      grid.querySelectorAll('table tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) {
          const key = cols[0].innerText.trim();
          const val = cols[1].innerText.trim();
          if (key) result[key] = val;
        }
      });
      return result;
    });

    console.log(`✅ Results fetched for session ${sessionId}`);
    res.json({ status: 'success', data });

  } catch (err) {
    console.error(`❌ submit-captcha error for ${sessionId}:`, err.message);
    res.status(500).json({ status: 'failed', error: err.message });

  } finally {
    // Always cleanup
    cleanupSession(sessionId);
  }
});

// ──────────────────────────────────────────────
// STEP 2 (ALT): Auto-solve with 2captcha
// POST /submit-captcha-auto
// Body: { sessionId, twoCaptchaKey }
// Returns: { status, data }
// ──────────────────────────────────────────────
app.post('/submit-captcha-auto', async (req, res) => {
  const { sessionId, twoCaptchaKey } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session expired or not found.' });
  }

  const { page, browser } = session;

  try {
    // Re-screenshot CAPTCHA (same session, same image)
    const captchaBuffer = await page.locator('#imgcapcha').screenshot();

    const apiKey = twoCaptchaKey || process.env.TWO_CAPTCHA_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: '2captcha API key not configured' });
    }

    const solver = new Solver(apiKey);
    const { data: captchaSolution } = await solver.imageCaptcha({
      body: captchaBuffer.toString('base64'),
      min_len: 4,
      max_len: 6
    });

    console.log(`🤖 CAPTCHA auto-solved: ${captchaSolution}`);

    await page.fill('#captchavalue', captchaSolution);
    await page.click('input[value="Fetch"]');

    await page.waitForFunction(
      () => {
        const grid = document.getElementById('searchDataGrid');
        return grid && grid.style.display !== 'none' && grid.innerText.trim().length > 20;
      },
      { timeout: 25000 }
    );

    const data = await page.evaluate(() => {
      const result = {};
      const grid = document.getElementById('searchDataGrid');
      grid.querySelectorAll('table tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) {
          const key = cols[0].innerText.trim();
          const val = cols[1].innerText.trim();
          if (key) result[key] = val;
        }
      });
      return result;
    });

    res.json({ status: 'success', data });

  } catch (err) {
    console.error(`❌ auto-solve error: ${err.message}`);
    res.status(500).json({ status: 'failed', error: err.message });

  } finally {
    cleanupSession(sessionId);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: sessions.size });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Bhu Bharati service running on port ${PORT}`);
});
