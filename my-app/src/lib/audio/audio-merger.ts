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
 * 使用FFmpeg的filter_complex为每个音频段后添加静音间隔
 */
export async function mergeAudioFiles(options: MergeOptions): Promise<MergeResult> {
  const { inputFiles, outputFile, pauseDuration = 500 } = options;

  if (inputFiles.length === 0) {
    throw new Error("没有输入文件");
  }

  // 确保输出目录存在
  await fs.mkdir(path.dirname(outputFile), { recursive: true });

  // 只有一个文件，直接复制
  if (inputFiles.length === 1) {
    await fs.copyFile(inputFiles[0], outputFile);
    const stats = await fs.stat(outputFile);
    const duration = await getAudioDuration(outputFile);
    return {
      filePath: outputFile,
      duration,
      fileSize: stats.size,
    };
  }

  // 构建FFmpeg命令
  // 使用filter_complex在每个音频后添加静音间隔，然后concat
  const pauseSeconds = pauseDuration / 1000;
  
  return new Promise((resolve, reject) => {
    // 构建filter_complex:
    // [0:a]apad=pad_dur=0.5[a0]; [1:a]apad=pad_dur=0.5[a1]; ... [a0][a1]...concat=n=X:v=0:a=1[outa]
    // apad会在每个音频末尾添加静音，除了最后一个（通过trim去掉最后一个的padding）
    // 更简单的方法：在所有音频后都添加静音，这是可接受的
    
    const filters = inputFiles.map((_, i) => 
      `[${i}:a]apad=pad_dur=${pauseSeconds}[a${i}]`
    ).join(";");
    
    const concatInputs = inputFiles.map((_, i) => `[a${i}]`).join("");
    const filterComplex = `${filters};${concatInputs}concat=n=${inputFiles.length}:v=0:a=1[outa]`;
    
    const args = [
      "-y",  // 覆盖输出文件
      ...inputFiles.flatMap(f => ["-i", f]),
      "-filter_complex", filterComplex,
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

    ffmpeg.on("error", (error) => {
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
