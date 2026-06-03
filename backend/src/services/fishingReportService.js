const axios = require('axios');

class FishingReportService {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
        // KDWP restructured their site — all fishing reports are now on a single
        // combined page organized by reservoir in accordion sections.
        this.url = 'https://ksoutdoors.gov/outdoor-activities/fishing-in-kansas/fishing-reports-by-reservoir';
        this.reservoirId = 'KanopolisReservoir'; // accordion section id
    }

    /**
     * Build headers that mimic a real Chrome browser session.
     * KDWP uses bot protection that rejects requests without these.
     */
    _browserHeaders() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
        };
    }

    stripHtml(html) {
        return html
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extract the Kanopolis Reservoir section from the combined reports page.
     * The page uses accordion sections with ids like 'KanopolisReservoir'.
     */
    _extractReservoirSection(html) {
        // Find all accordion items and their positions
        const accordionRegex = /<div class='accordion-item' id='([^']+)'/gi;
        const items = [];
        let m;
        while ((m = accordionRegex.exec(html)) !== null) {
            items.push({ id: m[1], index: m.index });
        }

        const kanIdx = items.findIndex(i => i.id === this.reservoirId);
        if (kanIdx === -1) {
            console.warn(`[Fishing] Accordion section '${this.reservoirId}' not found. Available: ${items.map(i => i.id).join(', ')}`);
            return null;
        }

        // Extract from this section to the next section
        const start = items[kanIdx].index;
        const end = items[kanIdx + 1] ? items[kanIdx + 1].index : start + 20000;
        return html.substring(start, end);
    }

    async getReport() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;

        try {
            console.log(`[Fishing] Fetching ${this.url}...`);
            const response = await axios.get(this.url, {
                headers: this._browserHeaders(),
                timeout: 25000,
                maxRedirects: 5,
                decompress: true,
            });
            console.log(`[Fishing] Page fetched (${response.status}, ${response.data.length} bytes)`);

            const html = response.data;

            // Extract just the Kanopolis section
            const sectionHtml = this._extractReservoirSection(html);
            if (!sectionHtml) {
                throw new Error('Kanopolis section not found on the reports page');
            }

            // --- Extract the updated date from the section ---
            let updatedDate = '';
            const datePatterns = [
                /Updated[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
                /Updated[:\s]*([A-Za-z]+\s+\d{1,2},?\s*\d{2,4})/i,
                /Report\s+Date[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
            ];
            for (const pattern of datePatterns) {
                const dm = sectionHtml.match(pattern);
                if (dm) { updatedDate = dm[1].trim(); break; }
            }

            // If no date found in the section, check the whole page header area
            if (!updatedDate) {
                for (const pattern of datePatterns) {
                    const dm = html.match(pattern);
                    if (dm) { updatedDate = dm[1].trim(); break; }
                }
            }

            // --- Extract the table data ---
            const species = [];
            const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
            let tableMatch;

            while ((tableMatch = tableRegex.exec(sectionHtml)) !== null) {
                const tableHtml = tableMatch[1];
                const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
                let rowMatch;
                let isHeader = true;

                while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
                    const rowHtml = rowMatch[1];
                    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
                    const cells = [];
                    let cellMatch;

                    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                        cells.push(this.stripHtml(cellMatch[1]));
                    }

                    if (isHeader) {
                        isHeader = false;
                        continue; // Skip header row (SPECIES | RATING | SIZE | BAITS...)
                    }

                    if (cells.length >= 4) {
                        species.push({
                            name: cells[0],
                            rating: cells[1],
                            size: cells[2],
                            details: cells.slice(3).join(' — '),
                        });
                    } else if (cells.length >= 2) {
                        species.push({
                            name: cells[0],
                            rating: cells[1],
                            size: cells[2] || '',
                            details: cells[3] || '',
                        });
                    }
                }

                if (species.length > 0) break;
            }

            // --- Extract any standalone report text from the section ---
            let reportText = '';
            const paragraphs = sectionHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
            for (const p of paragraphs) {
                const text = this.stripHtml(p);
                if (text.length > 40 && (
                    text.toLowerCase().includes('fishing') ||
                    text.toLowerCase().includes('bait') ||
                    text.toLowerCase().includes('catfish') ||
                    text.toLowerCase().includes('bass') ||
                    text.toLowerCase().includes('crappie') ||
                    text.toLowerCase().includes('walleye') ||
                    text.toLowerCase().includes('saugeye') ||
                    text.toLowerCase().includes('wiper')
                )) {
                    reportText += (reportText ? '\n\n' : '') + text;
                }
            }

            const result = {
                species,
                report: reportText || null,
                updated_date: updatedDate || null,
                source: 'Kansas Department of Wildlife & Parks',
                url: this.url + '#' + this.reservoirId,
                fetched_at: new Date().toISOString(),
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;
            console.log(`[Fishing] Cached ${species.length} species, updated: ${updatedDate || 'unknown'}`);
            return result;
        } catch (error) {
            console.error('Error fetching fishing report:', error.message);
            if (this.cache) return this.cache;
            return {
                species: [],
                report: 'Unable to fetch fishing report. Visit ksoutdoors.gov for the latest.',
                source: 'Kansas Department of Wildlife & Parks',
                url: this.url,
                fetched_at: new Date().toISOString(),
                error: true,
            };
        }
    }
}

module.exports = FishingReportService;
