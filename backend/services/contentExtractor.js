/**
 * Content Extractor Service
 * Extracts text content from various sources: PDF, YouTube, Websites, etc.
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';
import { PDFParse } from 'pdf-parse';

class ContentExtractor {
    /**
     * Extract content from a PDF file
     * @param {Buffer|string} input - PDF buffer or file path
     * @returns {Promise<{content: string, metadata: object}>}
     */
    async extractFromPDF(input) {
        try {
            let dataBuffer;
            
            if (Buffer.isBuffer(input)) {
                dataBuffer = input;
            } else if (typeof input === 'string') {
                dataBuffer = fs.readFileSync(input);
            } else {
                throw new Error('Invalid input: expected Buffer or file path');
            }

            // Use the new PDFParse class API
            const parser = new PDFParse({ data: dataBuffer });
            const textResult = await parser.getText();
            
            // Get document info
            const info = await parser.getInfo();
            const numPages = textResult.total;
            
            // Clean up the text
            let content = textResult.text
                .replace(/\s+/g, ' ')  // Multiple spaces to single
                .replace(/\n\s*\n/g, '\n\n')  // Multiple newlines to double
                .trim();

            // Clean up resources
            await parser.destroy();

            return {
                content,
                metadata: {
                    type: 'pdf',
                    pages: numPages,
                    info: info,
                    characters: content.length
                }
            };
        } catch (error) {
            console.error('[ContentExtractor] PDF extraction error:', error.message);
            throw new Error(`Erreur lors de l'extraction du PDF: ${error.message}`);
        }
    }

    /**
     * Extract transcript from a YouTube video
     * @param {string} url - YouTube video URL
     * @returns {Promise<{content: string, metadata: object}>}
     */
    async extractFromYouTube(url) {
        try {
            // Extract video ID from URL
            const videoId = this.extractYouTubeVideoId(url);
            if (!videoId) {
                throw new Error('URL YouTube invalide. Formats acceptés: youtube.com/watch?v=..., youtu.be/...');
            }

            console.log(`[ContentExtractor] Extracting transcript for video: ${videoId}`);

            // Try multiple languages in order of preference
            const languagesToTry = ['fr', 'en', 'es', 'de', 'it', 'pt', 'auto'];
            let transcriptItems = null;
            let usedLanguage = null;
            let lastError = null;

            for (const lang of languagesToTry) {
                try {
                    console.log(`[ContentExtractor] Trying language: ${lang}`);
                    if (lang === 'auto') {
                        // Try without language parameter
                        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
                    } else {
                        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang });
                    }
                    
                    if (transcriptItems && transcriptItems.length > 0) {
                        usedLanguage = lang;
                        console.log(`[ContentExtractor] Found transcript in language: ${lang}`);
                        break;
                    }
                } catch (e) {
                    lastError = e;
                    console.log(`[ContentExtractor] No transcript for language ${lang}: ${e.message}`);
                }
            }

            if (!transcriptItems || transcriptItems.length === 0) {
                // Try to get video metadata as fallback
                console.log('[ContentExtractor] No transcript available, trying to get video metadata...');
                try {
                    const metadata = await this.getYouTubeMetadata(videoId);
                    if (metadata) {
                        const fallbackContent = `Titre: ${metadata.title}\n\nDescription: ${metadata.description || 'Aucune description disponible.'}`;
                        
                        return {
                            content: fallbackContent,
                            metadata: {
                                type: 'youtube',
                                videoId,
                                url,
                                title: metadata.title,
                                author: metadata.author_name,
                                fallback: true, // Indicates this is metadata only, not transcript
                                characters: fallbackContent.length
                            }
                        };
                    }
                } catch (metaError) {
                    console.log('[ContentExtractor] Could not fetch metadata:', metaError.message);
                }
                
                const errorMsg = lastError?.message || 'Transcription non disponible';
                // Provide helpful error message
                if (errorMsg.includes('disabled') || errorMsg.includes('Transcript is disabled')) {
                    throw new Error('Les sous-titres sont désactivés pour cette vidéo');
                } else if (errorMsg.includes('not found') || errorMsg.includes('No transcript')) {
                    throw new Error('Cette vidéo n\'a pas de sous-titres disponibles. Seules les vidéos avec sous-titres (automatiques ou manuels) peuvent être extraites.');
                } else {
                    throw new Error(`Impossible d'extraire la transcription: ${errorMsg}`);
                }
            }

            // Combine transcript items into readable text
            // Decode HTML entities that might be in the transcript
            const content = transcriptItems
                .map(item => {
                    let text = item.text || '';
                    // Decode common HTML entities
                    text = text
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&nbsp;/g, ' ');
                    return text;
                })
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            // Calculate duration
            const lastItem = transcriptItems[transcriptItems.length - 1];
            const duration = lastItem ? Math.round((lastItem.offset + lastItem.duration) / 1000) : 0;

            return {
                content,
                metadata: {
                    type: 'youtube',
                    videoId,
                    url,
                    language: usedLanguage,
                    duration: this.formatDuration(duration),
                    segments: transcriptItems.length,
                    characters: content.length
                }
            };
        } catch (error) {
            console.error('[ContentExtractor] YouTube extraction error:', error.message);
            // Re-throw with original message if it's already formatted
            if (error.message.includes('sous-titres') || error.message.includes('transcription')) {
                throw error;
            }
            throw new Error(`Erreur lors de l'extraction YouTube: ${error.message}`);
        }
    }

    /**
     * Extract content from a website URL
     * @param {string} url - Website URL
     * @returns {Promise<{content: string, metadata: object}>}
     */
    async extractFromWebsite(url) {
        try {
            // Validate URL
            const urlObj = new URL(url);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('URL invalide: doit commencer par http:// ou https://');
            }

            console.log(`[ContentExtractor] Scraping website: ${url}`);

            // Fetch the page
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SEVEN-T Bot/1.0; +https://seven-t.com)',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
                },
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove unwanted elements
            $('script, style, nav, header, footer, aside, iframe, noscript, svg, form, button, input, [role="navigation"], [role="banner"], [role="contentinfo"], .sidebar, .menu, .nav, .footer, .header, .advertisement, .ad, .social-share').remove();

            // Get title
            const title = $('title').text().trim() || 
                          $('h1').first().text().trim() || 
                          'Sans titre';

            // Get meta description
            const description = $('meta[name="description"]').attr('content') || 
                               $('meta[property="og:description"]').attr('content') || '';

            // Get main content
            // Try to find the main content area
            let mainContent = '';
            
            const contentSelectors = [
                'article',
                '[role="main"]',
                'main',
                '.content',
                '.post-content',
                '.article-content',
                '.entry-content',
                '#content',
                '.main-content'
            ];

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    mainContent = element.text();
                    break;
                }
            }

            // Fallback to body if no main content found
            if (!mainContent) {
                mainContent = $('body').text();
            }

            // Clean up the content
            let content = mainContent
                .replace(/\s+/g, ' ')  // Multiple spaces to single
                .replace(/\n\s*\n/g, '\n\n')  // Multiple newlines to double
                .trim();

            // Limit content length (max 50k characters)
            if (content.length > 50000) {
                content = content.substring(0, 50000) + '... [contenu tronqué]';
            }

            // Add description at the beginning if available
            if (description) {
                content = `${description}\n\n${content}`;
            }

            return {
                content,
                title,
                metadata: {
                    type: 'website',
                    url,
                    domain: urlObj.hostname,
                    title,
                    description: description.substring(0, 200),
                    characters: content.length
                }
            };
        } catch (error) {
            console.error('[ContentExtractor] Website extraction error:', error.message);
            throw new Error(`Erreur lors de l'extraction du site web: ${error.message}`);
        }
    }

    /**
     * Extract YouTube video ID from various URL formats
     */
    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/  // Just the video ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    /**
     * Get YouTube video metadata using oEmbed API (no auth required)
     */
    async getYouTubeMetadata(videoId) {
        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            const response = await fetch(oembedUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Also try to get description from noembed (has more info)
            let description = '';
            try {
                const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
                const noembedResponse = await fetch(noembedUrl);
                if (noembedResponse.ok) {
                    const noembedData = await noembedResponse.json();
                    description = noembedData.description || '';
                }
            } catch (e) {
                // Ignore noembed errors
            }
            
            return {
                title: data.title || 'Vidéo YouTube',
                author_name: data.author_name || '',
                author_url: data.author_url || '',
                description: description,
                thumbnail_url: data.thumbnail_url || ''
            };
        } catch (error) {
            console.error('[ContentExtractor] YouTube metadata error:', error.message);
            return null;
        }
    }

    /**
     * Format duration in seconds to human readable format
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    }

    /**
     * Detect content type from URL
     */
    detectUrlType(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            // YouTube
            if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
                return 'youtube';
            }

            // Default to website
            return 'website';
        } catch {
            return null;
        }
    }

    /**
     * Auto-extract content based on input type
     * @param {string} input - URL or text
     * @param {string} type - Optional type hint
     */
    async autoExtract(input, type = null) {
        // If it's a URL
        if (input.startsWith('http://') || input.startsWith('https://')) {
            const detectedType = type || this.detectUrlType(input);
            
            switch (detectedType) {
                case 'youtube':
                    return this.extractFromYouTube(input);
                case 'website':
                default:
                    return this.extractFromWebsite(input);
            }
        }

        // Otherwise, treat as plain text
        return {
            content: input,
            metadata: {
                type: 'text',
                characters: input.length
            }
        };
    }
}

export const contentExtractor = new ContentExtractor();
export default contentExtractor;
