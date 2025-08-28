// index.js

import fs from 'fs';
import AbortController from 'abort-controller';
import fetch from 'node-fetch';

const API_URL = "https://mdwiki.org/w/api.php";
const INPUT_FILE = "input.txt";
const OUTPUT_BASE = "output.txt";

// Helper: Find next available output filename
function getOutputFilename(base) {
    if (!fs.existsSync(base)) return base;
    let i = 1;
    while (fs.existsSync(`${base.replace(/\.txt$/, '')}${i}.txt`)) i++;
    return `${base.replace(/\.txt$/, '')}${i}.txt`;
}

// Helper: Read input.txt and extract article titles by section, with section names
function parseInputFile(filename) {
    if (!fs.existsSync(filename)) {
        console.warn(`Input file "${filename}" not found.`);
        process.exit(1);
    }
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');

    let sections = [];
    let currentSection = { name: null, articles: [] };
    let inWikiProjectMed = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Section separator: === or ==
        const sectionMatch = line.match(/^(={2,3})\s*([^=]+?)\s*\1$/);
        if (sectionMatch) {
            // Save previous section if it has articles
            if (currentSection.articles.length) sections.push(currentSection);
            // Start new section
            currentSection = {
                name: sectionMatch[2].trim(),
                articles: []
            };
            inWikiProjectMed = false;
            continue;
        }

        // Extract [[...]] links
        const matches = [...line.matchAll(/\[\[([^\]]+)\]\]/g)];
        for (const match of matches) {
            const title = match[1].trim();

            // Ignore if inside WikiProjectMed section
            if (title === "WikiProjectMed") {
                inWikiProjectMed = true;
                continue;
            }
            if (inWikiProjectMed) continue;

            // Exclude entries containing:
            if (
                title.startsWith("WikiProjectMed:") || // [[WikiProjectMed:...]]
                title.startsWith("Image:") ||          // [[Image:...]]
                /^\w{2}$/.test(title) ||               // [[xx]] where xx is any two characters
                title.includes("[")                    // Single [ anywhere in the title
            ) {
                continue;
            }

            currentSection.articles.push(title);
        }
    }
    // Save last section if it has articles
    if (currentSection.articles.length) sections.push(currentSection);
    return sections;
}

async function getWikitext(title) {
    const params = new URLSearchParams({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        format: "json",
        titles: title
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

    try {
        const response = await fetch(`${API_URL}?${params}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const pages = data.query.pages;
        for (const pageId in pages) {
            const page = pages[pageId];
            if (page.revisions) {
                if (page.revisions[0].slots && page.revisions[0].slots.main['*']) {
                    return page.revisions[0].slots.main['*'];
                }
                if (page.revisions[0]['*']) {
                    return page.revisions[0]['*'];
                }
            }
        }
        return null;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') return 'TIMEOUT';
        console.error(`Error fetching "${title}": ${error.message}`);
        return null;
    }
}

function hasImage(wikitext) {
    if (!wikitext) return false;
    const infoboxImage = /image\s*=\s*([^\n|]+)/i.test(wikitext);
    const fileRef = /\[\[File:/i.test(wikitext);
    return infoboxImage || fileRef;
}

async function processSection(articles) {
    const noImageArticles = [];
    const timeoutArticles = [];
    for (const title of articles) {
        console.log(`Checking: ${title}`);
        const wikitext = await getWikitext(title);
        if (wikitext === 'TIMEOUT') {
            console.log(`  Error fetching "${title}": Request timed out`);
            timeoutArticles.push(title);
            continue;
        }
        if (!wikitext) {
            console.log(`  Could not fetch wikitext for ${title}`);
            continue;
        }
        if (!hasImage(wikitext)) {
            noImageArticles.push(title);
            console.log(`  No image found`);
        } else {
            console.log(`  Image found`);
        }
    }
    return { noImageArticles, timeoutArticles };
}

async function main() {
    const sections = parseInputFile(INPUT_FILE);
    const outputFilename = getOutputFilename(OUTPUT_BASE);

    let output = '';
    for (const section of sections) {
        if (section.articles.length === 0) continue;
        output += `\n== ${section.name} ==\n`;
        const { noImageArticles, timeoutArticles } = await processSection(section.articles);

        output += "\nArticles without infobox image or File Commons:\n";
        noImageArticles.forEach(title => output += `# [[${title}]]\n`);
        output += "\nArticles with Request timed out:\n";
        timeoutArticles.forEach(title => output += `# [[${title}]]\n`);
    }

    fs.writeFileSync(outputFilename, output.trim());
    console.log(`Results written to ${outputFilename}`);
}

main();
