const axios = require('axios');

class FishingReportService {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
        this.url = 'https://ksoutdoors.gov/Fishing/Where-to-Fish-in-Kansas/Fishing-Locations-Public-Waters/Fishing-in-Northwest-Kansas/Kanopolis-Reservoir/Kanopolis-Reservoir-Fishing-Report';
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

    async getReport() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;

        try {
            const response = await axios.get(this.url, {
                headers: { 'User-Agent': 'Kanopolanes Weather Dashboard' },
                timeout: 15000,
            });

            const html = response.data;

            // --- Extract the updated date ---
            let updatedDate = '';
            const dateMatch = html.match(/Updated[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
            if (dateMatch) {
                updatedDate = dateMatch[1];
            }

            // --- Extract the table data ---
            const species = [];
            const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
            if (tableMatch) {
                const tableHtml = tableMatch[1];
                // Extract rows
                const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
                let rowMatch;
                let isHeader = true;

                while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
                    const rowHtml = rowMatch[1];
                    // Extract cells (th or td)
                    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
                    const cells = [];
                    let cellMatch;

                    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                        cells.push(this.stripHtml(cellMatch[1]));
                    }

                    if (isHeader) {
                        isHeader = false;
                        continue; // Skip header row
                    }

                    if (cells.length >= 4) {
                        species.push({
                            name: cells[0],
                            rating: cells[1],
                            size: cells[2],
                            details: cells[3],
                        });
                    }
                }
            }

            // --- Also get any standalone report text (outside the table) ---
            let reportText = '';
            const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
            for (const p of paragraphs) {
                const text = this.stripHtml(p);
                if (text.length > 40 && (
                    text.toLowerCase().includes('fishing') ||
                    text.toLowerCase().includes('bait') ||
                    text.toLowerCase().includes('catfish') ||
                    text.toLowerCase().includes('bass') ||
                    text.toLowerCase().includes('crappie') ||
                    text.toLowerCase().includes('walleye')
                )) {
                    reportText += (reportText ? '\n\n' : '') + text;
                }
            }

            const result = {
                species,
                report: reportText || null,
                updated_date: updatedDate || null,
                source: 'Kansas Department of Wildlife & Parks',
                url: this.url,
                fetched_at: new Date().toISOString(),
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;
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
