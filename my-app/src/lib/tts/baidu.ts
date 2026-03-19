/**
 * 百度智能云语音合成 (TTS) 服务
 * API文档: https://ai.baidu.com/tech/speech/tts
 */

/**
 * 获取百度 Access Token
 */
export async function getBaiduAccessToken(
  apiKey: string,
  secretKey: string
): Promise<string> {
  const url = "https://aip.baidubce.com/oauth/2.0/token";
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: apiKey,
    client_secret: secretKey,
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
  });

  const result = await response.json();

  if (result.access_token) {
    return result.access_token;
  } else {
    const errorMsg = result.error_description || "未知错误";
    throw new Error(`获取 Access Token 失败: ${errorMsg}`);
  }
}

/**
 * 百度 TTS 合成参数
 */
export interface BaiduTTSParams {
  text: string;
  per: number; // 发音人
  spd?: number; // 语速 0-15
  pit?: number; // 音调 0-15
  vol?: number; // 音量 0-15
  aue?: number; // 音频格式 3=mp3
}

/**
 * 调用百度 TTS 合成语音（带重试机制）
 */
export async function synthesizeBaiduTTS(
  accessToken: string,
  params: BaiduTTSParams,
  maxRetries: number = 3
): Promise<Buffer> {
  const url = "https://tsn.baidu.com/text2audio";

  const formData = new URLSearchParams({
    tok: accessToken,
    tex: params.text,
    per: params.per.toString(),
    spd: (params.spd ?? 5).toString(),
    pit: (params.pit ?? 5).toString(),
    vol: (params.vol ?? 5).toString(),
    aue: (params.aue ?? 3).toString(),
    cuid: "novel_agent_tts",
    ctp: "1",
    lan: "zh",
  });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[BaiduTTS] Attempt ${attempt}/${maxRetries}: per=${params.per}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("audio")) {
        console.log(`[BaiduTTS] Success on attempt ${attempt}`);
        return Buffer.from(await response.arrayBuffer());
      } else {
        // 返回错误信息
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          const errorMsg = errorData.err_msg || "未知错误";
          const errorCode = errorData.err_no || -1;
          throw new Error(`TTS 合成失败: [${errorCode}] ${errorMsg}`);
        } catch {
          throw new Error(`TTS 合成失败: ${errorText.substring(0, 500)}`);
        }
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`[BaiduTTS] Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        // 指数退避重试：1秒、2秒、4秒
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[BaiduTTS] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`百度 TTS 合成失败，已重试${maxRetries}次。${lastError?.message || ''}`);
}

/**
 * 百度 TTS 发音人列表 - 精简版（已验证）
 */
export const BAIDU_VOICES = [
  // 男声
  { id: 0, name: "度小美", gender: "female", description: "标准女声" },
  { id: 1, name: "度小宇", gender: "male", description: "标准男声" },
  { id: 3, name: "度逍遥", gender: "male", description: "情感男声，适合小说旁白" },
  { id: 4, name: "度丫丫", gender: "female", description: "情感女声，适合女主角" },
  { id: 5, name: "度小娇", gender: "female", description: "娇美女声" },
  { id: 106, name: "度博文", gender: "male", description: "专业男声，新闻播报" },
  { id: 110, name: "度小童", gender: "male", description: "纯真儿童声音" },
  { id: 111, name: "度小萌", gender: "female", description: "萝莉女声" },
  { id: 4003, name: "度逍遥(臻品)", gender: "male", description: "顶级音质情感男声" },
  { id: 4100, name: "度小雯", gender: "female", description: "活力女主播" },
  { id: 4105, name: "度灵儿", gender: "female", description: "清澈女声" },
  { id: 4117, name: "度小乔", gender: "female", description: "活泼女声" },
  { id: 4134, name: "度阿锦", gender: "female", description: "东北女声" },
  { id: 4139, name: "度小蓉", gender: "female", description: "四川女声" },
  { id: 4176, name: "度有为", gender: "male", description: "磁性魅力男声" },
  { id: 4179, name: "度泽言(温暖)", gender: "male", description: "温暖治愈男声" },
  { id: 4193, name: "度泽言(开朗)", gender: "male", description: "开朗阳光男声" },
  { id: 4195, name: "度怀安", gender: "male", description: "磁性男声" },
  { id: 4196, name: "度清影", gender: "female", description: "多情感甜美女声" },
  { id: 4206, name: "度博文(臻品)", gender: "male", description: "臻品专业男声" },
  { id: 4257, name: "四川小哥", gender: "male", description: "四川男声" },
  { id: 5118, name: "度小鹿", gender: "female", description: "甜美女声" },
  { id: 5147, name: "度常盈", gender: "female", description: "电台女主播" },
  { id: 5976, name: "度小皮", gender: "male", description: "萌娃童声" },
  { id: 6567, name: "度小柔", gender: "female", description: "极致温柔女声" },
  { id: 20100, name: "度小粤", gender: "female", description: "粤语女声" },
];

/**
 * 根据 voiceId 获取百度发音人 ID
 */
export function getBaiduPerByVoiceId(voiceId: string): number {
  // 支持的 voiceId 格式: baidu-0, baidu-1, baidu-3 等
  if (voiceId.startsWith("baidu-")) {
    const per = parseInt(voiceId.replace("baidu-", ""), 10);
    if (!isNaN(per) && BAIDU_VOICES.some((v) => v.id === per)) {
      return per;
    }
  }
  // 默认返回度逍遥（情感男声，适合旁白）
  return 3;
}

/**
 * 获取默认百度音色配置
 */
export function getDefaultBaiduVoiceId(): string {
  return "baidu-3"; // 度逍遥，情感男声，适合小说旁白
}
