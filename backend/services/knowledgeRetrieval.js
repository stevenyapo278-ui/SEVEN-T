/**
 * RAG: chunk, index, and retrieve knowledge by semantic similarity.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';
import { getEmbedding } from './embeddings.js';

const CHUNK_MAX_CHARS = 800;
const CHUNK_OVERLAP = 100;
const DEFAULT_TOP_K = 10;

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * Split content into overlapping chunks (by size, trying to break at newlines).
 */
export function chunkContent(content, title) {
    if (!content || typeof content !== 'string') return [];
    const text = content.trim();
    if (!text) return [];
    const chunks = [];
    let start = 0;
    let index = 0;
    while (start < text.length) {
        let end = Math.min(start + CHUNK_MAX_CHARS, text.length);
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            if (lastNewline > start) end = lastNewline + 1;
            else {
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > start) end = lastSpace + 1;
            }
        }
        const slice = text.slice(start, end).trim();
        if (slice) {
            chunks.push({ title: title || 'Connaissance', content: slice, chunk_index: index });
            index++;
        }
        start = end - (end < text.length ? CHUNK_OVERLAP : 0);
        if (start <= 0) start = end;
    }
    return chunks;
}

/**
 * Index an agent knowledge_base item (chunk + embed + store).
 */
export async function indexAgentKnowledge(agentId, knowledgeId, title, content) {
    await deleteChunksBySource('agent', knowledgeId);
    const chunks = chunkContent(content, title);
    if (chunks.length === 0) return;
    for (const ch of chunks) {
        const embedding = await getEmbedding(ch.content);
        if (!embedding) continue;
        const id = uuidv4();
        await db.run(`
            INSERT INTO knowledge_chunks (id, source_type, source_id, agent_id, chunk_index, title, content, embedding)
            VALUES (?, 'agent', ?, ?, ?, ?, ?, ?)
        `, id, knowledgeId, agentId, ch.chunk_index, ch.title, ch.content, JSON.stringify(embedding));
    }
}

/**
 * Index a global_knowledge item. Stored with source_type=global; agent assignment is resolved at retrieval.
 */
export async function indexGlobalKnowledge(globalKnowledgeId, title, content) {
    await deleteChunksBySource('global', globalKnowledgeId);
    const chunks = chunkContent(content, title);
    if (chunks.length === 0) return;
    for (const ch of chunks) {
        const embedding = await getEmbedding(ch.content);
        if (!embedding) continue;
        const id = uuidv4();
        await db.run(`
            INSERT INTO knowledge_chunks (id, source_type, source_id, agent_id, chunk_index, title, content, embedding)
            VALUES (?, 'global', ?, NULL, ?, ?, ?, ?)
        `, id, globalKnowledgeId, ch.chunk_index, ch.title, ch.content, JSON.stringify(embedding));
    }
}

/**
 * Delete all chunks for a given source (e.g. when knowledge item is updated or deleted).
 */
export async function deleteChunksBySource(sourceType, sourceId) {
    await db.run('DELETE FROM knowledge_chunks WHERE source_type = ? AND source_id = ?', sourceType, sourceId);
}

/**
 * Retrieve the most relevant chunks for an agent given the user message.
 * Returns array of { title, content } for injection into the prompt.
 * Falls back to empty array if embedding API is unavailable.
 */
export async function retrieveRelevantChunks(agentId, query, topK = DEFAULT_TOP_K) {
    let queryEmbedding;
    try {
        queryEmbedding = await getEmbedding(query);
    } catch (e) {
        console.warn('[KnowledgeRetrieval] getEmbedding error, using fallback:', e?.message || e);
        return [];
    }
    if (!queryEmbedding) {
        return [];
    }

    const agentChunks = await db.all(`
        SELECT id, title, content, embedding FROM knowledge_chunks
        WHERE source_type = 'agent' AND agent_id = ?
    `, agentId);
    const agentList = Array.isArray(agentChunks) ? agentChunks : [];

    const globalIdsRows = await db.all(`
        SELECT global_knowledge_id FROM agent_global_knowledge WHERE agent_id = ?
    `, agentId);
    const globalIds = (Array.isArray(globalIdsRows) ? globalIdsRows : []).map(r => r.global_knowledge_id);

    let globalChunks = [];
    if (globalIds.length > 0) {
        const placeholders = globalIds.map(() => '?').join(',');
        const rows = await db.all(`
            SELECT id, title, content, embedding FROM knowledge_chunks
            WHERE source_type = 'global' AND source_id IN (${placeholders})
        `, ...globalIds);
        globalChunks = Array.isArray(rows) ? rows : [];
    }

    const all = [...agentList, ...globalChunks];
    const scored = all.map(row => ({
        title: row.title,
        content: row.content,
        score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding || '[]'))
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(({ title, content }) => ({ title, content }));
}

export default {
    chunkContent,
    indexAgentKnowledge,
    indexGlobalKnowledge,
    deleteChunksBySource,
    retrieveRelevantChunks
};
