import { createServerClient } from "@/lib/supabase/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy", // The application should have OPENAI_API_KEY
});

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[KnowledgeLens] OPENAI_API_KEY is missing. Falling back to dummy embedding for dev.");
    return new Array(1536).fill(0.001); // dummy vector
  }
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8192), // Safety limit for tokens
  });
  return response.data[0].embedding;
}

/**
 * Indexes a document (Note, Resource, etc) into the ai_knowledge_chunks table.
 */
export async function indexDocument({
  sourceType,
  sourceId,
  title,
  content,
  userId = null, // null for global admin resources
  metadata = {},
}) {
  try {
    const supabase = await createServerClient();
    
    // 1. Delete old chunks for this source to avoid duplicates on update
    await supabase
      .from("ai_knowledge_chunks")
      .delete()
      .eq("source_type", sourceType)
      .eq("source_id", sourceId);

    if (!content || content.trim().length === 0) return;

    // 2. Chunk text
    const { chunkText } = await import("./knowledge-indexer.js");
    const combinedText = `${title}\n\n${content}`;
    const chunks = chunkText(combinedText, 300, 50);

    // 3. Generate embeddings & insert
    const insertPayloads = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const embedding = await generateEmbedding(chunkContent);
      
      insertPayloads.push({
        user_id: userId,
        source_type: sourceType,
        source_id: sourceId,
        chunk_index: i,
        content: chunkContent,
        metadata: {
          title,
          ...metadata
        },
        embedding,
      });
    }

    if (insertPayloads.length > 0) {
      const { error } = await supabase.from("ai_knowledge_chunks").insert(insertPayloads);
      if (error) throw error;
    }

  } catch (error) {
    console.error("[KnowledgeLens] Indexing failed for", sourceType, sourceId, error);
  }
}

/**
 * Removes a document from the vector store
 */
export async function unindexDocument(sourceType, sourceId) {
  try {
    const supabase = await createServerClient();
    await supabase
      .from("ai_knowledge_chunks")
      .delete()
      .eq("source_type", sourceType)
      .eq("source_id", sourceId);
  } catch (error) {
    console.error("[KnowledgeLens] Unindexing failed", error);
  }
}

/**
 * Fallback keyword search for knowledge chunks when pgvector fails.
 */
async function fallbackKeywordSearch(supabase, query, userId, limit) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).join(" | ");
  if (!queryWords) return [];

  // Basic fallback using ilike on the most prominent word
  const mainTerm = query.toLowerCase().split(/\s+/).find(w => w.length > 4) || query.toLowerCase().split(/\s+/)[0];
  if (!mainTerm) return [];

  let queryBuilder = supabase
    .from("ai_knowledge_chunks")
    .select("*")
    .ilike('content', `%${mainTerm}%`)
    .limit(limit * 2); // Fetch more for fallback deduplication

  if (userId) {
     // OR condition for user's notes or global admin resources
     queryBuilder = queryBuilder.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
     queryBuilder = queryBuilder.is('user_id', null);
  }

  const { data, error } = await queryBuilder;
  if (error) {
    console.warn("[KnowledgeLens] Keyword fallback failed:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Hybrid retrieval of knowledge for a given user query.
 * Looks up vector matches in user's personal notes and global resources.
 */
export async function retrieveKnowledgeLens({
  query,
  userId,
  limit = 5,
  matchThreshold = 0.3
}) {
  if (!query || query.trim().length === 0) return [];

  try {
    const queryEmbedding = await generateEmbedding(query);
    const supabase = await createServerClient();

    // The RPC might fail if pgvector or the function isn't created yet.
    let chunks = [];
    const { data: vectorChunks, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: limit,
      p_user_id: userId,
    });

    if (error) {
      console.warn("[KnowledgeLens] RPC matching failed. Falling back to keyword search. Error:", error.message);
      chunks = await fallbackKeywordSearch(supabase, query, userId, limit);
    } else {
      chunks = vectorChunks || [];
    }

    if (!chunks || chunks.length === 0) return [];

    // Deduplicate if multiple chunks come from the exact same source
    const sourceMap = new Map();
    for (const chunk of chunks) {
      const key = `${chunk.source_type}-${chunk.source_id}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, { ...chunk });
      } else {
        // Concatenate content from the same source
        const existing = sourceMap.get(key);
        if (!existing.content.includes(chunk.content)) {
            existing.content += `\n\n...[continued]...\n\n${chunk.content}`;
        }
      }
    }

    const deduplicatedChunks = Array.from(sourceMap.values());

    // Format for AI consumption
    const results = deduplicatedChunks.map(chunk => {
      const title = chunk.metadata?.title || "Knowledge Context";
      let typeLabel = "[ADMIN RESOURCE]";
      if (chunk.source_type === "note") typeLabel = "[USER NOTE]";
      if (chunk.source_type === "attachment") typeLabel = "[CURRENT ATTACHMENT]";

      return {
        title,
        content: chunk.content,
        programme: chunk.metadata?.programme,
        subject: chunk.metadata?.subject,
        level: chunk.metadata?.level,
        typeLabel,
        sourceId: chunk.source_id,
        sourceType: chunk.source_type
      };
    });

    return results.slice(0, limit);
  } catch (error) {
    console.error("[KnowledgeLens] Retrieval failed", error);
    return [];
  }
}
