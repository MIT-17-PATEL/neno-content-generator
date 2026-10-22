#!/usr/bin/env node
/**
 * Backfill & Synchronization Script: sync:blogs
 * Finds all content_items where type='blog' AND status='approved' AND deleted_at IS NULL,
 * constructs integration payloads, calls POST /api/integrations/content-engine/blogs with x-api-key,
 * updates website_synced_at / website_sync_error in database, and prints a summary.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;

// 1. Load Environment Variables from .env.local
const envFiles = ['.env.local', '.env'];
const envVars = {};

for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key] && !envVars[key]) {
          envVars[key] = val;
          process.env[key] = val;
        }
      }
    }
  }
}

const websiteUrl = (
  process.env.NENO_WEBSITE_URL ||
  process.env.NENO_WEBSITE_API_URL ||
  'http://localhost:3001'
).replace(/\/+$/, '');

const apiKey =
  process.env.CONTENT_ENGINE_API_KEY ||
  process.env.NENO_CONTENT_ENGINE_API_KEY ||
  '';

const dbUrl = process.env.DATABASE_URL;

console.log('========================================================================');
console.log('         NENO CONTENT ENGINE — BLOG BACKFILL & SYNC UTILITY             ');
console.log('========================================================================');
console.log(`Target Website URL: ${websiteUrl}`);
console.log(`API Key Configured: ${apiKey ? 'YES (configured)' : 'NO (missing or empty!)'}`);

if (!dbUrl) {
  console.error('[FATAL] DATABASE_URL is not set in environment or .env.local');
  process.exit(1);
}

// 2. Validate Loopback Conflict
try {
  const parsed = new URL(websiteUrl);
  const isLoopback = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname);
  const currentPort = process.env.PORT || '3000';
  const targetPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');

  if (isLoopback && targetPort === currentPort) {
    console.error(`\n[ERROR] Refusing to sync: NENO_WEBSITE_URL (${websiteUrl}) matches this app's port (${currentPort}).`);
    console.error('The website must run on a separate port (e.g. http://localhost:3001) or production URL (https://www.nenotechnology.com).\n');
    process.exit(1);
  }
} catch (e) {
  console.error('[FATAL] Invalid NENO_WEBSITE_URL:', e.message);
  process.exit(1);
}

const cleanDbUrl = dbUrl.replace(/([?&])sslmode=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database successfully.\n');

    // Query all approved, non-deleted blogs
    const query = `
      SELECT id, workspace_id, title, slug, category, excerpt, current_version_id, created_at, updated_at
      FROM content_items 
      WHERE type = 'blog' 
        AND status = 'approved' 
        AND deleted_at IS NULL 
      ORDER BY created_at ASC
    `;
    const blogsRes = await client.query(query);
    const blogs = blogsRes.rows;

    console.log(`Found ${blogs.length} approved blog(s) to synchronize with website.\n`);

    if (blogs.length === 0) {
      console.log('No approved blogs found to synchronize.');
      client.release();
      await pool.end();
      return;
    }

    let pushedCount = 0;
    let failedCount = 0;
    const summaryList = [];

    const targetEndpoint = `${websiteUrl}/api/integrations/content-engine/blogs`;

    for (let i = 0; i < blogs.length; i++) {
      const b = blogs[i];
      const prefix = `[${i + 1}/${blogs.length}]`;
      process.stdout.write(`${prefix} Syncing: "${b.title.slice(0, 50)}"... `);

      // Fetch latest version
      const vRes = await client.query(
        `SELECT id, version_number, content, seo_metadata 
         FROM content_versions 
         WHERE content_id = $1 
         ORDER BY version_number DESC 
         LIMIT 1`,
        [b.id]
      );
      const version = vRes.rows[0];
      const seo = (version?.seo_metadata || {});

      const rawImg =
        seo.featuredImageUrl ||
        seo.ogImage ||
        seo.coverImage ||
        (typeof seo.featuredImageBrief === 'string' && (seo.featuredImageBrief.startsWith('http') || seo.featuredImageBrief.startsWith('data:'))
          ? seo.featuredImageBrief
          : '') ||
        '';

      const payload = {
        title: b.title,
        slug: b.slug,
        category: b.category || 'AI Architecture',
        author: seo.author || 'Neno AI Lab',
        shortDescription: b.excerpt || '',
        content: version?.content || `# ${b.title}\n\n${b.excerpt || ''}`,
        blogContent: version?.content || `# ${b.title}\n\n${b.excerpt || ''}`,
        status: 'Published',
        publishDate: (seo.publishDate || b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        readingTime: seo.readingTime || '5 min read',
        thumb: rawImg,
        thumbFull: rawImg,
        buttonText: 'Read Article',
        buttonLink: `/blog-single/${b.slug}`,
      };

      let success = false;
      let errorReason = '';

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);

          const res = await fetch(targetEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (res.ok) {
            success = true;
            break;
          }

          const errBody = await res.text().catch(() => '');
          errorReason = `HTTP ${res.status} ${res.statusText}: ${errBody || 'Empty response'}`;

          if (res.status >= 400 && res.status < 500 && res.status !== 408) {
            break; // Don't retry client errors
          }
        } catch (err) {
          const isAbort = err?.name === 'AbortError';
          errorReason = isAbort ? 'Timed out after 15s' : err.message;
        }

        if (!success && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (success) {
        pushedCount++;
        console.log('✅ PUSHED');
        await client.query(
          `UPDATE content_items 
           SET website_synced_at = NOW(), website_sync_error = NULL, updated_at = NOW() 
           WHERE id = $1`,
          [b.id]
        );
        summaryList.push({ title: b.title, slug: b.slug, status: 'PUSHED', reason: '-' });
      } else {
        failedCount++;
        console.log(`❌ FAILED (${errorReason})`);
        await client.query(
          `UPDATE content_items 
           SET website_synced_at = NULL, website_sync_error = $1, updated_at = NOW() 
           WHERE id = $2`,
          [errorReason, b.id]
        );
        summaryList.push({ title: b.title, slug: b.slug, status: 'FAILED', reason: errorReason });
      }
    }

    client.release();

    console.log('\n========================================================================');
    console.log('                          FINAL SYNC SUMMARY                            ');
    console.log('========================================================================');
    console.log(`Total blogs processed: ${blogs.length}`);
    console.log(`Successfully pushed:   ${pushedCount}`);
    console.log(`Failed to push:        ${failedCount}`);
    console.log('------------------------------------------------------------------------');

    if (failedCount > 0) {
      console.log('\nFailed Blogs Detail:');
      for (const item of summaryList.filter((s) => s.status === 'FAILED')) {
        console.log(`• "${item.title}"`);
        console.log(`  Slug: ${item.slug}`);
        console.log(`  Reason: ${item.reason}\n`);
      }
    }
  } catch (err) {
    console.error('[ERROR] Fatal sync error:', err);
  } finally {
    await pool.end();
  }
}

run();
