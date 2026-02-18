const axios = require('axios');
const settingsService = require('./settingsService');

const FB_GROUP_ID = '688259924707972';
const FB_GRAPH_URL = 'https://graph.facebook.com/v21.0';

class FacebookService {
    constructor() {
        this.cache = { feed: null, events: null };
        this.cacheTime = { feed: 0, events: 0 };
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    getToken() {
        // Try env var first, then settings
        return process.env.FB_ACCESS_TOKEN || settingsService.get('fb_access_token') || '';
    }

    async getFeed() {
        const token = this.getToken();
        if (!token) return { posts: [], configured: false };

        // Check cache
        if (this.cache.feed && Date.now() - this.cacheTime.feed < this.CACHE_TTL) {
            return { posts: this.cache.feed, configured: true };
        }

        try {
            const res = await axios.get(`${FB_GRAPH_URL}/${FB_GROUP_ID}/feed`, {
                params: {
                    access_token: token,
                    fields: 'id,message,created_time,from,full_picture,permalink_url,type,attachments{media,description,title,type,url},updated_time',
                    limit: 25,
                },
            });

            const posts = (res.data.data || []).map(post => ({
                id: post.id,
                message: post.message || '',
                created_time: post.created_time,
                author: post.from?.name || 'Community Member',
                picture: post.full_picture || null,
                permalink: post.permalink_url || `https://facebook.com/${post.id}`,
                type: post.type || 'status',
                attachments: post.attachments?.data || [],
            }));

            this.cache.feed = posts;
            this.cacheTime.feed = Date.now();
            return { posts, configured: true };
        } catch (error) {
            console.error('[Facebook] Error fetching feed:', error.response?.data?.error?.message || error.message);
            return { posts: this.cache.feed || [], configured: true, error: error.response?.data?.error?.message || error.message };
        }
    }

    async getEvents() {
        const token = this.getToken();
        if (!token) return { events: [], configured: false };

        if (this.cache.events && Date.now() - this.cacheTime.events < this.CACHE_TTL) {
            return { events: this.cache.events, configured: true };
        }

        try {
            const res = await axios.get(`${FB_GRAPH_URL}/${FB_GROUP_ID}/events`, {
                params: {
                    access_token: token,
                    fields: 'id,name,description,start_time,end_time,place,cover,attending_count,interested_count',
                    limit: 10,
                },
            });

            const events = (res.data.data || []).map(ev => ({
                id: ev.id,
                name: ev.name,
                description: ev.description || '',
                start_time: ev.start_time,
                end_time: ev.end_time,
                place: ev.place?.name || '',
                cover: ev.cover?.source || null,
                attending: ev.attending_count || 0,
                interested: ev.interested_count || 0,
                permalink: `https://facebook.com/events/${ev.id}`,
            }));

            this.cache.events = events;
            this.cacheTime.events = Date.now();
            return { events, configured: true };
        } catch (error) {
            console.error('[Facebook] Error fetching events:', error.response?.data?.error?.message || error.message);
            return { events: this.cache.events || [], configured: true, error: error.response?.data?.error?.message || error.message };
        }
    }

    clearCache() {
        this.cache = { feed: null, events: null };
        this.cacheTime = { feed: 0, events: 0 };
    }
}

module.exports = new FacebookService();
