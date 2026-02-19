const axios = require('axios');

class FishingReportService {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 6 * 60 * 60 * 1000; // 6 hours
        this.url = 'https://ksoutdoors.gov/Fishing/Where-to-Fish-in-Kansas/Fishing-Locations-Public-Waters/Fishing-in-Northwest-Kansas/Kanopolis-Reservoir/Kanopolis-Reservoir-Fishing-Report';
    }

    async getReport() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;

        try {
            const response = await axios.get(this.url, {
                headers: { 'User-Agent': 'Kanopolanes Weather Dashboard' },
                timeout: 15000,
            });

            const html = response.data;

            // Extract the main article content — the fishing report text sits in the page body
            // The report is typically between specific HTML patterns
            let reportText = '';

            // Look for the main content area — KDWP uses an article or content div
            // The actual report text appears after breadcrumbs and before footer links
            const patterns = [
                // Pattern: content between "Fishing Report" heading and footer
                /<div[^>]*class="[^"]*field-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
                /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
                /<div[^>]*class="[^"]*content-area[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
            ];

            for (const pattern of patterns) {
                const matches = html.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const text = match
                            .replace(/<br\s*\/?>/gi, '\n')
                            .replace(/<[^>]+>/g, '')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&nbsp;/g, ' ')
                            .trim();
                        if (text.length > 50 && (text.toLowerCase().includes('fish') || text.toLowerCase().includes('bait') || text.toLowerCase().includes('catfish') || text.toLowerCase().includes('bass') || text.toLowerCase().includes('crappie'))) {
                            reportText = text;
                            break;
                        }
                    }
                    if (reportText) break;
                }
            }

            // Fallback: try to find the paragraph with fishing content via a broader search
            if (!reportText) {
                const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
                for (const p of paragraphs) {
                    const text = p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
                    if (text.length > 40 && (
                        text.toLowerCase().includes('fishing') ||
                        text.toLowerCase().includes('bait') ||
                        text.toLowerCase().includes('catfish') ||
                        text.toLowerCase().includes('bass') ||
                        text.toLowerCase().includes('crappie') ||
                        text.toLowerCase().includes('walleye') ||
                        text.toLowerCase().includes('channel')
                    )) {
                        reportText += (reportText ? '\n\n' : '') + text;
                    }
                }
            }

            if (!reportText) {
                reportText = 'No fishing report available at this time. Visit ksoutdoors.gov for the latest.';
            }

            const result = {
                report: reportText,
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
