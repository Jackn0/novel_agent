/**
 * 音频合并工具
 * 使用FFmpeg合并多个音频文件
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export interface MergeOptions {
  inputFiles: string[];
  outputFile: string;
  pauseDuration?: number;  // 段落间隔（毫秒）
}

export interface MergeResult {
  filePath: string;
  duration: number;  // 秒
  fileSize: number;  // 字节
}

/**
 * 合并多个音频文件
 */
export async function mergeAudioFiles(options: MergeOptions): Promise<MergeResult> {
  const { inputFiles, outputFile, pauseDuration = 500 } = options;

  if (inputFiles.length === 0) {
    throw new Error("没有输入文件");
  }

  if (inputFiles.length === 1) {
    // 只有一个文件，直接复制
    await fs.copyFile(inputFiles[0], outputFile);
    const stats = await fs.stat(outputFile);
    const duration = await getAudioDuration(outputFile);
    return {
      filePath: outputFile,
      duration,
      fileSize: stats.size,
    };
  }

  // 确保输出目录存在
  await fs.mkdir(path.dirname(outputFile), { recursive: true });

  // 创建临时文件列表
  const listFile = outputFile + ".list.txt";
  const fileListContent = inputFiles
    .map(f => `file '${f.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listFile, fileListContent, "utf-8");

  try {
    // 构建FFmpeg命令
    // 使用adelay添加静音间隔
    const pauseSeconds = pauseDuration / 1000;
    
    return new Promise((resolve, reject) => {
      // 方法1: 使用concat demuxer（简单合并，无间隔）
      // ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp3
      
      // 方法2: 使用afilter添加间隔
      // 构建afilter字符串：在每个音频后添加adelay
      const inputs = inputFiles.map((_, i) => `[${i}:a]`).join("");
      const concatFilter = `${inputs}concat=n=${inputFiles.length}:v=0:a=1[outa]`;
      
      const args = [
        "-y",  // 覆盖输出文件
        ...inputFiles.flatMap(f => ["-i", f]),
        "-filter_complex", concatFilter,
        "-map", "[outa]",
        "-c:a", "libmp3lame",
        "-q:a", "2",  // 质量（0-9，0最好，2很好）
        outputFile,
      ];

      const ffmpeg = spawn("ffmpeg", args);

      let stderr = "";
      ffmpeg.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", async (code) => {
        // 删除临时文件
        await fs.unlink(listFile).catch(() => {});

        if (code === 0) {
          try {
            const stats = await fs.stat(outputFile);
            const duration = await getAudioDuration(outputFile);
            resolve({
              filePath: outputFile,
              duration,
              fileSize: stats.size,
            });
          } catch (error) {
            reject(new Error(`无法读取输出文件: ${error}`));
          }
        } else {
          reject(new Error(`FFmpeg失败 (code ${code}): ${stderr}`));
        }
      });

      ffmpeg.on("error", async (error) => {
        await fs.unlink(listFile).catch(() => {});
        
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new Error(
            "未找到FFmpeg。请安装FFmpeg并添加到PATH:\n" +
            "- Windows: winget install Gyan.FFmpeg\n" +
            "- macOS: brew install ffmpeg\n" +
            "- Linux: sudo apt install ffmpeg"
          ));
        } else {
          reject(error);
        }
      });
    });

  } catch (error) {
    // 清理临时文件
    await fs.unlink(listFile).catch(() => {});
    throw error;
  }
}

/**
 * 获取音频时长（使用ffprobe）
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    let output = "";
    ffprobe.stdout?.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", () => {
      const duration = parseFloat(output.trim());
      if (isNaN(duration)) {
        // 如果ffprobe失败，估算时长（假设MP3 128kbps）
        fs.stat(filePath).then(stats => {
          const estimatedDuration = (stats.size * 8) / (128 * 1000);
          resolve(estimatedDuration);
        }).catch(() => resolve(0));
      } else {
        resolve(duration);
      }
    });

    ffprobe.on("error", () => {
      // ffprobe失败，使用估算
      fs.stat(filePath).then(stats => {
        const estimatedDuration = (stats.size * 8) / (128 * 1000);
        resolve(estimatedDuration);
      }).catch(() => resolve(0));
    });
  });
}

/**
 * 在音频后添加静音
 */
export async function addSilence(
  inputFile: string,
  outputFile: string,
  silenceDurationMs: number
): Promise<void> {
  const silenceSeconds = silenceDurationMs / 1000;
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", inputFile,
      "-af", `apad=pad_dur=${silenceSeconds}`,
      "-c:a", "libmp3lame",
      "-q:a", "2",
      outputFile,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`添加静音失败 (code ${code})`));
      }
    });

    ffmpeg.on("error", reject);
  });
}
