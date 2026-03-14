/**
 * 文本分块处理工具
 * 用于将长文本分割成适合LLM处理的片段
 */

export interface TextChunk {
  id: string;
  index: number;
  title?: string;
  content: string;
  wordCount: number;
}

const CHUNK_SIZE = 3000; // 每个片段约3000字
const OVERLAP = 200;     // 重叠200字保持连贯性

/**
 * 智能分割文本为章节
 * 支持多种章节标题格式
 */
export function splitIntoChapters(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // 尝试识别章节标题（支持多种格式）
  // 格式1: 第X章 / Chapter X / ChapterX
  // 格式2: ## 标题 / # 标题
  // 格式3: X. 标题 / X、标题
  const chapterPatterns = [
    /(?:^|\n)(?:第[一二三四五六七八九十百千万\d]+章|Chapter\s*\d+|第\d+章)[：:\s]*[^\n]*/gi,
    /(?:^|\n)#{1,2}\s+[^\n]+/g,
    /(?:^|\n)(?:\d+[.．、])\s*[^\n]+/g,
  ];
  
  // 尝试匹配章节
  let matches: Array<{ index: number; text: string }> = [];
  
  for (const pattern of chapterPatterns) {
    const patternMatches = [...text.matchAll(pattern)];
    if (patternMatches.length >= 2) {
      matches = patternMatches.map(m => ({
        index: m.index || 0,
        text: m[0].trim(),
      }));
      break;
    }
  }
  
  // 如果找到章节，按章节分割
  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const content = text.slice(start, end).trim();
      
      // 提取标题和内容
      const lines = content.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      
      chunks.push({
        id: `chunk-${i}`,
        index: i,
        title: title.slice(0, 100), // 限制标题长度
        content: body,
        wordCount: content.length,
      });
    }
  } else {
    // 未识别到章节，按固定长度分割
    return splitByLength(text);
  }
  
  return chunks;
}

/**
 * 按固定长度分割文本（带重叠）
 */
export function splitByLength(text: string, chunkSize: number = CHUNK_SIZE): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;
  let position = 0;
  
  while (position < text.length) {
    // 计算当前片段的结束位置
    let end = position + chunkSize;
    
    // 如果不是最后一段，尝试在句子或段落边界处切割
    if (end < text.length) {
      // 寻找最近的句子结束位置
      const searchRange = text.slice(end - 100, end + 100);
      const sentenceEnd = searchRange.match(/[。！？.!?\n][^\n]*$/);
      if (sentenceEnd && sentenceEnd.index) {
        end = end - 100 + sentenceEnd.index + 1;
      }
    }
    
    const content = text.slice(position, Math.min(end, text.length));
    
    chunks.push({
      id: `chunk-${index}`,
      index,
      content,
      wordCount: content.length,
    });
    
    // 下一个片段的起始位置（考虑重叠）
    position = end - OVERLAP;
    index++;
  }
  
  return chunks;
}

/**
 * 预处理文本：清理格式、统一编码等
 */
export function preprocessText(text: string): string {
  return text
    // 统一换行符
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 删除多余空行
    .replace(/\n{3,}/g, '\n\n')
    // 删除行首行尾空格
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // 删除特殊控制字符
    .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f]/g, '');
}

/**
 * 从文件名或内容中提取章节标题
 */
export function extractChapterTitle(content: string, filename: string): string | undefined {
  // 从内容第一行提取
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length < 100 && (
    firstLine.includes('章') || 
    firstLine.includes('Chapter') ||
    firstLine.startsWith('#')
  )) {
    return firstLine.replace(/^#+\s*/, '');
  }
  
  // 从文件名提取
  const nameWithoutExt = filename.replace(/\.(txt|md)$/i, '');
  if (nameWithoutExt && nameWithoutExt !== filename) {
    return nameWithoutExt;
  }
  
  return undefined;
}

/**
 * 合并多个文件的文本
 */
export function mergeInputFiles(files: Array<{ content: string; filename: string }>): string {
  return files
    .map((file, index) => {
      const title = extractChapterTitle(file.content, file.filename);
      if (title && !file.content.startsWith(title)) {
        return `## ${title}\n\n${file.content}`;
      }
      return file.content;
    })
    .join('\n\n---\n\n');
}
