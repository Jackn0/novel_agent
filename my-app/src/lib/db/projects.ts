/**
 * 项目数据存储层
 * 使用 JSON 文件存储（Phase 1），后续可迁移到 SQLite
 */

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { NovelProject, NovelStage, NovelBible, NovelOutline, Chapter, ProjectSettings, InputFile } from "@/types/novel";

// 存储目录
const DATA_DIR = path.join(process.cwd(), "data", "projects");

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 获取项目文件路径
function getProjectFilePath(projectId: string): string {
  return path.join(DATA_DIR, `${projectId}.json`);
}

// 从环境变量获取模型配置
function getDefaultSettings(): ProjectSettings {
  return {
    settingModel: process.env.SETTING_MODEL || "gpt-4-turbo",
    writingModel: process.env.WRITING_MODEL || "gpt-4-turbo",
    language: "zh",
    sectionWordCountMin: 500,
    sectionWordCountMax: 1500,
    autoSaveEnabled: true,
    streamingEnabled: true,
    memoryLevel: parseInt(process.env.MEMORY_LEVEL || "3") as 1 | 2 | 3 | 4 | 5,
    maxTokens: parseInt(process.env.MAX_TOKENS || "4096"),
  };
}

// 默认小说预设
const defaultBible: NovelBible = {
  meta: {
    title: "",
    genre: "",
    tone: "",
    targetAudience: "",
    wordCountTarget: 100000,
    synopsis: "",
    themes: [],
  },
  characters: [],
  factions: [],
  instances: [],
  climaxScenes: [],
};

/**
 * 创建新项目
 */
export async function createProject(
  title: string, 
  meta?: Partial<NovelBible["meta"]>,
  projectType: "original" | "continuation" = "original"
): Promise<NovelProject> {
  await ensureDataDir();

  const now = new Date().toISOString();
  
  // 根据项目类型确定初始阶段
  const initialStage = projectType === "continuation" ? "continuation_input" : "bible_meta";
  
  const project: NovelProject = {
    id: uuidv4(),
    title: title || "未命名小说",
    createdAt: now,
    updatedAt: now,
    currentStage: initialStage,
    bible: {
      ...defaultBible,
      meta: {
        ...defaultBible.meta,
        ...meta,
        title: title || meta?.title || "",
      },
    },
    outline: null,
    chapters: [],
    settings: getDefaultSettings(),
    foreshadowings: [],
    continuation: {
      isActive: projectType === "continuation",
      continuationNumber: 0,
      inputFiles: [],
    },
    projectType,
    // 有声小说相关字段初始化
    discoveredCharacters: [],
    audioTasks: [],
  };

  await fs.writeFile(
    getProjectFilePath(project.id),
    JSON.stringify(project, null, 2),
    "utf-8"
  );

  return project;
}

/**
 * 创建续写项目（从已有小说导入）
 */
export async function createContinuationProject(
  title: string,
  originalTitle: string,
  inputFiles: InputFile[],
  meta?: Partial<NovelBible["meta"]>
): Promise<NovelProject> {
  const project = await createProject(title, meta, "continuation");
  
  const now = new Date().toISOString();
  
  // 更新项目为续写项目
  const updatedProject: NovelProject = {
    ...project,
    sourceMaterial: {
      originalTitle,
      inputFiles,
      importDate: now,
    },
    continuation: {
      isActive: true,
      continuationNumber: 1,
      inputFiles,
    },
  };

  await fs.writeFile(
    getProjectFilePath(project.id),
    JSON.stringify(updatedProject, null, 2),
    "utf-8"
  );

  return updatedProject;
}

/**
 * 获取项目详情
 */
export async function getProject(projectId: string): Promise<NovelProject | null> {
  try {
    const content = await fs.readFile(getProjectFilePath(projectId), "utf-8");
    const project = JSON.parse(content) as NovelProject;
    // 向后兼容：确保 foreshadowings 字段存在
    if (!project.foreshadowings) {
      project.foreshadowings = [];
    }
    // 向后兼容：确保 continuation 字段存在
    if (!project.continuation) {
      project.continuation = {
        isActive: false,
        continuationNumber: 0,
        inputFiles: [],
      };
    }
    // 向后兼容：确保 projectType 字段存在
    if (!project.projectType) {
      project.projectType = "original";
    }
    // 向后兼容：确保有声小说相关字段存在
    if (!project.discoveredCharacters) {
      project.discoveredCharacters = [];
    }
    if (!project.audioTasks) {
      project.audioTasks = [];
    }
    return project;
  } catch {
    return null;
  }
}

/**
 * 获取所有项目列表
 */
export async function listProjects(): Promise<NovelProject[]> {
  await ensureDataDir();

  try {
    const files = await fs.readdir(DATA_DIR);
    const projects: NovelProject[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
          const project = JSON.parse(content) as NovelProject;
          // 向后兼容：确保 foreshadowings 字段存在
          if (!project.foreshadowings) {
            project.foreshadowings = [];
          }
          // 向后兼容：确保 continuation 字段存在
          if (!project.continuation) {
            project.continuation = {
              isActive: false,
              continuationNumber: 0,
              inputFiles: [],
            };
          }
          // 向后兼容：确保 projectType 字段存在
          if (!project.projectType) {
            project.projectType = "original";
          }
          // 向后兼容：确保有声小说相关字段存在
          if (!project.discoveredCharacters) {
            project.discoveredCharacters = [];
          }
          if (!project.audioTasks) {
            project.audioTasks = [];
          }
          projects.push(project);
        } catch {
          // 跳过无效文件
        }
      }
    }

    // 按创建时间倒序
    return projects.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * 更新项目
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Omit<NovelProject, "id" | "createdAt">>
): Promise<NovelProject | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const updatedProject: NovelProject = {
    ...project,
    ...updates,
    id: project.id, // 确保 id 不被覆盖
    createdAt: project.createdAt, // 确保创建时间不被覆盖
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    getProjectFilePath(projectId),
    JSON.stringify(updatedProject, null, 2),
    "utf-8"
  );

  return updatedProject;
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    // 删除项目JSON文件
    await fs.unlink(getProjectFilePath(projectId));
    
    // 删除项目文件夹（除了output）
    const projectDir = path.join(DATA_DIR, projectId);
    try {
      const files = await fs.readdir(projectDir);
      for (const file of files) {
        if (file !== "output") {
          const filePath = path.join(projectDir, file);
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
        }
      }
      // 如果文件夹为空（除了output），也可以删除整个文件夹
      // 但保留output子文件夹
    } catch {
      // 文件夹可能不存在，忽略错误
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * 更新小说预设
 */
export async function updateNovelBible(
  projectId: string,
  bibleUpdates: Partial<NovelBible>
): Promise<NovelProject | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const updatedProject: NovelProject = {
    ...project,
    bible: {
      ...project.bible,
      ...bibleUpdates,
      // 深度合并 meta
      meta: {
        ...project.bible.meta,
        ...bibleUpdates.meta,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    getProjectFilePath(projectId),
    JSON.stringify(updatedProject, null, 2),
    "utf-8"
  );

  return updatedProject;
}

/**
 * 更新大纲
 */
export async function updateOutline(
  projectId: string,
  outline: NovelOutline
): Promise<NovelProject | null> {
  return updateProject(projectId, { outline });
}

/**
 * 更新章节
 */
export async function updateChapters(
  projectId: string,
  chapters: Chapter[]
): Promise<NovelProject | null> {
  return updateProject(projectId, { chapters });
}

/**
 * 获取单个章节
 */
export async function getChapter(
  projectId: string,
  chapterId: string
): Promise<Chapter | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  
  return project.chapters.find(c => c.id === chapterId) || null;
}

/**
 * 更新单个小节内容
 */
export async function updateSection(
  projectId: string,
  chapterId: string,
  sectionId: string,
  updates: Partial<Chapter["sections"][0]>
): Promise<boolean> {
  const project = await getProject(projectId);
  if (!project) return false;

  const chapterIndex = project.chapters.findIndex(c => c.id === chapterId);
  if (chapterIndex === -1) return false;

  const sectionIndex = project.chapters[chapterIndex].sections.findIndex(
    s => s.id === sectionId
  );
  if (sectionIndex === -1) return false;

  project.chapters[chapterIndex].sections[sectionIndex] = {
    ...project.chapters[chapterIndex].sections[sectionIndex],
    ...updates,
  };

  project.updatedAt = new Date().toISOString();

  await fs.writeFile(
    getProjectFilePath(projectId),
    JSON.stringify(project, null, 2),
    "utf-8"
  );

  return true;
}

/**
 * 确认阶段完成，进入下一阶段
 */
export async function confirmStage(
  projectId: string,
  nextStage: NovelStage
): Promise<NovelProject | null> {
  return updateProject(projectId, { currentStage: nextStage });
}
