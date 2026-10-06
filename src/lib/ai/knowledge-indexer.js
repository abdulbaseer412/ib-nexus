import { createServerClient } from "@/lib/supabase/server";
import { indexDocument, unindexDocument } from "./knowledge-lens.js";

/**
 * Intelligent text chunking algorithm.
 * Splits text into logical sections based on headings and paragraphs,
 * then falls back to word counts to ensure chunks fit within limits.
 * 
 * @param {string} text - Raw text content
 * @param {number} maxWords - Maximum words per chunk
 * @param {number} overlapWords - Overlap between consecutive chunks
 * @returns {Array<string>} Array of text chunks
 */
export function chunkText(text, maxWords = 300, overlapWords = 50) {
  if (!text) return [];

  // First, split by Markdown headings or double newlines (paragraphs)
  // This helps preserve logical boundaries
  const logicalSections = text.split(/(?=\n#{1,4} |\n\n)/g).filter(s => s.trim().length > 0);

  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const section of logicalSections) {
    const sectionWords = section.trim().split(/\s+/);
    
    // If adding this section exceeds maxWords, finalize the current chunk
    if (currentWordCount + sectionWords.length > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      
      // Keep overlap from the end of the current chunk
      const overlapStart = Math.max(0, currentChunk.length - overlapWords);
      currentChunk = currentChunk.slice(overlapStart);
      currentWordCount = currentChunk.length;
    }

    // If a single section is larger than maxWords, we must split it forcefully
    if (sectionWords.length > maxWords) {
      for (let i = 0; i < sectionWords.length; i += (maxWords - overlapWords)) {
        const slice = sectionWords.slice(i, i + maxWords);
        if (slice.length > 0) {
          chunks.push(slice.join(" "));
        }
      }
      currentChunk = [];
      currentWordCount = 0;
    } else {
      currentChunk.push(...sectionWords);
      currentWordCount += sectionWords.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks.filter(c => c.trim().length > 0);
}

/**
 * Processes and indexes a User Note into the Knowledge Lens.
 * Designed to be called asynchronously after a note is saved.
 */
export async function indexUserNote(noteId, userId, title, content, subject, level) {
  if (!noteId || !userId || !content) return;
  
  try {
    await indexDocument({
      sourceType: "note",
      sourceId: noteId,
      title: title || "Untitled Note",
      content,
      userId,
      metadata: { subject, level }
    });
  } catch (err) {
    console.error(`[KnowledgeIndexer] Failed to index note ${noteId}:`, err);
  }
}

/**
 * Processes and indexes an Admin Resource into the Knowledge Lens.
 * Global resources have no userId.
 */
export async function indexAdminResource(resourceId, title, content, programme, subject, level) {
  if (!resourceId || !content) return;

  try {
    await indexDocument({
      sourceType: "resource",
      sourceId: resourceId,
      title: title || "Resource",
      content,
      userId: null, 
      metadata: { programme, subject, level }
    });
  } catch (err) {
    console.error(`[KnowledgeIndexer] Failed to index resource ${resourceId}:`, err);
  }
}

/**
 * Removes a source from the Knowledge Lens.
 */
export async function removeSourceIndex(sourceType, sourceId) {
  if (!sourceType || !sourceId) return;
  
  try {
    await unindexDocument(sourceType, sourceId);
  } catch (err) {
    console.error(`[KnowledgeIndexer] Failed to unindex ${sourceType} ${sourceId}:`, err);
  }
}
