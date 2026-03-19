/**
 * POST /api/audiobook/parse
 * 上传并解析有声小说文件（md/txt）
 * 自动识别卷、章，并按每1500字分割小节（不切断自然段）
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import type { AudiobookSegment, AudiobookSource } from "@/types/novel";

interface ParseResult {
  source: AudiobookSource;
  segments: AudiobookSegment[];
  stats: {
    totalVolumes: number;
    totalChapters: number;
    totalSegments: number;
    totalChars: number;
  };
}

/**
 * 更灵活的章节标题匹配
 */
function isChapterTitle(line: string): { isMatch: boolean; num: number; title: string } {
  const patterns = [
    /^第?\s*([一二三四五六七八九十百千万0-9]+)\s*[章回节][:：]?\s*(.*)$/i,
    /^[章回节]\s*([一二三四五六七八九十百千万0-9]+)[:：]?\s*(.*)$/i,
    /^Chapter\s*([0-9]+)[:：]?\s*(.*)$/i,
    /^CH\.?\s*([0-9]+)[:：]?\s*(.*)$/i,
    /^(\d+)\s*[章回节][:：]?\s*(.*)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const num = chineseToNumber(match[1]) || parseInt(match[1]) || 0;
      return { isMatch: true, num, title: line };
    }
  }
  
  return { isMatch: false, num: 0, title: "" };
}

/**
 * 检测卷标题
 */
function isVolumeTitle(line: string): { isMatch: boolean; num: number; title: string } {
  const patterns = [
    /^第?\s*([一二三四五六七八九十百千万0-9]+)\s*[卷册部][:：]?\s*(.*)$/i,
    /^[卷册部]\s*([一二三四五六七八九十百千万0-9]+)[:：]?\s*(.*)$/i,
    /^Volume\s*([0-9]+)[:：]?\s*(.*)$/i,
    /^Vol\.?\s*([0-9]+)[:：]?\s*(.*)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const num = chineseToNumber(match[1]) || parseInt(match[1]) || 0;
      return { isMatch: true, num, title: line };
    }
  }
  
  return { isMatch: false, num: 0, title: "" };
}

/**
 * 中文数字转阿拉伯数字
 */
function chineseToNumber(str: string): number {
  if (!str) return 0;
  if (/^\d+$/.test(str)) return parseInt(str);
  
  const chineseNums: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '百': 100, '千': 1000, '万': 10000
  };
  
  let result = 0;
  let temp = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const num = chineseNums[char];
    
    if (num === undefined) continue;
    
    if (num >= 10) {
      if (temp === 0) temp = 1;
      result += temp * num;
      temp = 0;
    } else {
      temp = temp * 10 + num;
    }
  }
  
  return result + temp;
}

/**
 * 解析小说结构
 */
function parseNovelStructure(content: string): {
  volumes: Map<number, { title: string; chapters: Map<number, { title: string; content: string }> }>;
} {
  const volumes = new Map();
  
  const lines = content.split('\n');
  let currentVolumeNum = 1;
  let currentChapterNum = 1;
  let currentChapterContent: string[] = [];
  let currentChapterTitle = "";
  let currentVolumeTitle = `第${currentVolumeNum}卷`;
  
  // 确保至少有一个卷
  volumes.set(currentVolumeNum, {
    title: currentVolumeTitle,
    chapters: new Map()
  });
  
  let lastWasTitle = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      lastWasTitle = false;
      continue;
    }
    
    // 跳过可能是元数据的行（如 Markdown 标题标记）
    if (line === "---" || line.startsWith("```")) {
      continue;
    }
    
    // 检测卷标题
    const volumeMatch = isVolumeTitle(line);
    if (volumeMatch.isMatch && !lastWasTitle) {
      // 保存之前的章节
      if (currentChapterContent.length > 0) {
        const chapterContent = currentChapterContent.join('\n');
        volumes.get(currentVolumeNum)!.chapters.set(currentChapterNum, {
          title: currentChapterTitle || `第${currentChapterNum}章`,
          content: chapterContent
        });
        console.log(`[Parse] Saved chapter ${currentChapterNum}: ${currentChapterTitle}, content length: ${chapterContent.length}`);
      }
      
      currentVolumeNum = volumeMatch.num || currentVolumeNum + 1;
      currentVolumeTitle = line;
      currentChapterNum = 1;
      currentChapterContent = [];
      currentChapterTitle = "";
      
      // 创建新卷
      if (!volumes.has(currentVolumeNum)) {
        volumes.set(currentVolumeNum, {
          title: currentVolumeTitle,
          chapters: new Map()
        });
      }
      
      lastWasTitle = true;
      continue;
    }
    
    // 检测章标题
    const chapterMatch = isChapterTitle(line);
    if (chapterMatch.isMatch && !lastWasTitle) {
      // 保存之前的章节
      if (currentChapterContent.length > 0) {
        const chapterContent = currentChapterContent.join('\n');
        volumes.get(currentVolumeNum)!.chapters.set(currentChapterNum, {
          title: currentChapterTitle || `第${currentChapterNum}章`,
          content: chapterContent
        });
        console.log(`[Parse] Saved chapter ${currentChapterNum}: ${currentChapterTitle}, content length: ${chapterContent.length}`);
      }
      
      currentChapterNum = chapterMatch.num || currentChapterNum + 1;
      currentChapterTitle = line;
      currentChapterContent = [];
      
      lastWasTitle = true;
      continue;
    }
    
    // 普通内容
    currentChapterContent.push(lines[i]);
    lastWasTitle = false;
  }
  
  // 保存最后一个章节
  if (currentChapterContent.length > 0) {
    const chapterContent = currentChapterContent.join('\n');
    volumes.get(currentVolumeNum)!.chapters.set(currentChapterNum, {
      title: currentChapterTitle || `第${currentChapterNum}章`,
      content: chapterContent
    });
    console.log(`[Parse] Saved final chapter ${currentChapterNum}: ${currentChapterTitle}, content length: ${chapterContent.length}`);
  }
  
  return { volumes };
}

/**
 * 智能提取自然段
 * 优先使用空行分隔，如果没有空行则使用行首特征判断
 */
function extractParagraphs(content: string): string[] {
  const normalizedContent = content.replace(/\r\n/g, '\n').trim();
  
  // 首先尝试按空行分割
  const doubleNewlineSplit = normalizedContent.split(/\n\s*\n/);
  
  // 如果按空行分割后段落太少（说明原文没有空行分隔），尝试其他方法
  if (doubleNewlineSplit.length < 3) {
    // 方法2：按行分割，然后合并短行
    return extractParagraphsByLines(normalizedContent);
  }
  
  return doubleNewlineSplit
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * 通过行特征提取段落
 * 适用于每行一个自然段，没有空行分隔的文本
 */
function extractParagraphsByLines(content: string): string[] {
  const lines = content.split('\n');
  const paragraphs: string[] = [];
  let currentPara: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) continue;
    
    currentPara.push(trimmed);
    
    // 判断是否是段落结尾：
    // 1. 行尾有标点（。！？）
    // 2. 下一行是空行或缩进开头
    const hasEndingPunctuation = /[。！？\.\!\?""''）】\]〕]+$/.test(trimmed);
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;
    const nextIsNewPara = !nextLine || nextLine.trim() === '' || /^[\s　]/.test(nextLine);
    
    if (hasEndingPunctuation && nextIsNewPara) {
      paragraphs.push(currentPara.join(''));
      currentPara = [];
    }
  }
  
  // 保存最后一段
  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(''));
  }
  
  return paragraphs.filter(p => p.length > 0);
}

/**
 * 将章节内容按每1500字分割为小节
 * 不切断自然段，在段落边界处分割
 */
function splitChapterIntoSegments(
  chapterContent: string,
  targetLength: number = 1500
): string[] {
  const segments: string[] = [];
  
  // 提取自然段
  const paragraphs = extractParagraphs(chapterContent);
  
  console.log(`[Split] Extracted ${paragraphs.length} paragraphs from chapter`);
  
  if (paragraphs.length === 0) {
    const cleaned = chapterContent.trim();
    return cleaned ? [cleaned] : [];
  }
  
  // 如果只有一个段落且长度超过目标，按句子分割这个段落
  if (paragraphs.length === 1 && paragraphs[0].length > targetLength * 1.5) {
    const sentences = splitBySentences(paragraphs[0], targetLength);
    return sentences;
  }
  
  // 合并段落为小节
  let currentSegment: string[] = [];
  let currentLength = 0;
  
  for (const paragraph of paragraphs) {
    const paraLength = paragraph.length;
    
    // 如果当前段落本身就超过目标长度的1.5倍，单独成小节
    if (paraLength >= targetLength * 1.5) {
      // 先保存之前的内容
      if (currentSegment.length > 0) {
        const segContent = currentSegment.join('\n\n');
        if (segContent.trim()) segments.push(segContent);
        currentSegment = [];
        currentLength = 0;
      }
      segments.push(paragraph);
      continue;
    }
    
    // 如果加入当前段落后会超过目标长度，且当前小节已有内容，先保存当前小节
    if (currentLength + paraLength > targetLength && currentSegment.length > 0) {
      const segContent = currentSegment.join('\n\n');
      if (segContent.trim()) segments.push(segContent);
      currentSegment = [paragraph];
      currentLength = paraLength;
    } else {
      // 加入当前段落
      currentSegment.push(paragraph);
      currentLength += paraLength;
    }
  }
  
  // 保存最后一个小节
  if (currentSegment.length > 0) {
    const segContent = currentSegment.join('\n\n');
    if (segContent.trim()) segments.push(segContent);
  }
  
  console.log(`[Split] Split into ${segments.length} segments (target: ${targetLength} chars)`);
  segments.forEach((seg, i) => {
    const preview = seg.substring(0, 30).replace(/\n/g, ' ');
    console.log(`[Split] Segment ${i + 1}: ${seg.length} chars, "${preview}..."`);
  });
  
  return segments;
}

/**
 * 按句子分割长段落
 * 尽量在句子边界处分割，保持每小节约目标长度
 */
function splitBySentences(content: string, targetLength: number): string[] {
  const segments: string[] = [];
  
  // 使用正则匹配句子（包括标点）
  const sentenceRegex = /[^。！？\.\!\?]+[。！？\.\!\?]+/g;
  const sentences: string[] = [];
  let match;
  
  while ((match = sentenceRegex.exec(content)) !== null) {
    sentences.push(match[0].trim());
  }
  
  // 添加剩余部分
  const lastPart = content.substring(sentenceRegex.lastIndex).trim();
  if (lastPart) {
    sentences.push(lastPart);
  }
  
  if (sentences.length === 0) {
    return [content];
  }
  
  // 合并句子为小节
  let currentSegment: string[] = [];
  let currentLength = 0;
  
  for (const sentence of sentences) {
    const sentLength = sentence.length;
    
    // 如果加入当前句子后会超过目标长度的1.2倍，且当前小节已有内容，先保存
    if (currentLength + sentLength > targetLength * 1.2 && currentSegment.length > 0) {
      segments.push(currentSegment.join(''));
      currentSegment = [sentence];
      currentLength = sentLength;
    } else {
      currentSegment.push(sentence);
      currentLength += sentLength;
    }
  }
  
  // 保存最后一个小节
  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(''));
  }
  
  return segments;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "未上传文件" },
        { status: 400 }
      );
    }
    
    // 检查文件类型
    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".md" && ext !== ".txt") {
      return NextResponse.json(
        { success: false, error: "仅支持 .md 和 .txt 文件" },
        { status: 400 }
      );
    }
    
    // 读取文件内容
    const content = await file.text();
    const totalChars = content.length;
    
    if (totalChars === 0) {
      return NextResponse.json(
        { success: false, error: "文件内容为空" },
        { status: 400 }
      );
    }
    
    console.log(`[Audiobook Parse] Parsing file: ${file.name}, size: ${totalChars} chars`);
    
    // 解析小说结构
    const { volumes } = parseNovelStructure(content);
    
    console.log(`[Audiobook Parse] Found ${volumes.size} volumes`);
    
    // 生成小节列表
    const segments: AudiobookSegment[] = [];
    let globalSegmentNum = 0;
    
    // 按卷、章顺序遍历
    const sortedVolumes = Array.from(volumes.entries()).sort((a, b) => a[0] - b[0]);
    
    for (const [volumeNum, volume] of sortedVolumes) {
      console.log(`[Audiobook Parse] Volume ${volumeNum}: ${volume.title}, chapters: ${volume.chapters.size}`);
      
      const sortedChapters = Array.from(volume.chapters.entries()).sort((a, b) => a[0] - b[0]);
      
      for (const [chapterNum, chapter] of sortedChapters) {
        console.log(`[Audiobook Parse] Chapter ${chapterNum}: ${chapter.title}, content: ${chapter.content.length} chars`);
        
        // 分割章节为小节，目标1500字左右
        const chapterSegments = splitChapterIntoSegments(chapter.content, 1500);
        
        console.log(`[Audiobook Parse] Chapter ${chapterNum} split into ${chapterSegments.length} segments`);
        
        for (let i = 0; i < chapterSegments.length; i++) {
          globalSegmentNum++;
          const segmentContent = chapterSegments[i];
          
          segments.push({
            id: `seg_${uuidv4()}`,
            volumeNumber: volumeNum,
            volumeTitle: volume.title,
            chapterNumber: chapterNum,
            chapterTitle: chapter.title,
            segmentNumber: i + 1,
            startChar: 0,
            endChar: segmentContent.length,
            content: segmentContent,
            status: "pending",
          });
        }
      }
    }
    
    // 如果没有识别出任何章节，将整个文件作为一个大章节处理
    if (segments.length === 0) {
      console.log(`[Audiobook Parse] No chapters detected, treating entire file as one chapter`);
      
      const chapterSegments = splitChapterIntoSegments(content, 1500);
      
      for (let i = 0; i < chapterSegments.length; i++) {
        globalSegmentNum++;
        const segmentContent = chapterSegments[i];
        
        segments.push({
          id: `seg_${uuidv4()}`,
          volumeNumber: 1,
          volumeTitle: "第1卷",
          chapterNumber: 1,
          chapterTitle: file.name.replace(/\.[^/.]+$/, ""),
          segmentNumber: i + 1,
          startChar: 0,
          endChar: segmentContent.length,
          content: segmentContent,
          status: "pending",
        });
      }
    }
    
    // 构建源文件信息
    const source: AudiobookSource = {
      fileName: file.name,
      fileType: ext === ".md" ? "md" : "txt",
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      rawContent: content.substring(0, 1000),
      totalChars,
    };
    
    const result: ParseResult = {
      source,
      segments,
      stats: {
        totalVolumes: volumes.size || 1,
        totalChapters: segments.length > 0 
          ? new Set(segments.map(s => `${s.volumeNumber}-${s.chapterNumber}`)).size 
          : 1,
        totalSegments: segments.length,
        totalChars,
      },
    };
    
    console.log(`[Audiobook Parse] Parsed: ${result.stats.totalVolumes} volumes, ${result.stats.totalChapters} chapters, ${result.stats.totalSegments} segments`);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error("[Audiobook Parse] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "解析失败" },
      { status: 500 }
    );
  }
}
