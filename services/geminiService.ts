
import { UserInput, LifeDestinyResult, Gender } from "../types";
import { BAZI_SYSTEM_INSTRUCTION } from "../constants";

/**
 * 确定天干的阴阳属性
 * @param pillar - 八字四柱之一（如：甲子、乙丑等）
 * @returns 天干的阴阳属性：YANG 或 YIN
 */
const getStemPolarity = (pillar: string): 'YANG' | 'YIN' => {
  if (!pillar || pillar.trim() === '') return 'YANG'; // 默认值
  const firstChar = pillar.trim().charAt(0); // 获取天干部分（第一个字符）
  
  // 十天干的阴阳分类
  const yangStems = ['甲', '丙', '戊', '庚', '壬']; // 阳干
  const yinStems = ['乙', '丁', '己', '辛', '癸'];   // 阴干

  if (yangStems.includes(firstChar)) return 'YANG';
  if (yinStems.includes(firstChar)) return 'YIN';
  return 'YANG'; // 回退值
};

/**
 * 生成人生分析报告
 * @param input - 用户输入的八字信息和API配置
 * @returns 包含人生K线图数据和命理分析报告的结果
 * @throws 当API请求失败、数据格式错误或其他异常情况时抛出错误
 */
export const generateLifeAnalysis = async (input: UserInput): Promise<LifeDestinyResult> => {

  const { apiKey, apiBaseUrl, modelName } = input;

  // FIX: Trim whitespace which causes header errors if copied with newlines
  const cleanApiKey = apiKey ? apiKey.trim() : "";
  const cleanBaseUrl = apiBaseUrl ? apiBaseUrl.trim().replace(/\/+$/, "") : "";
  
  // 支持更多Gemini模型选项，提供更丰富的默认选择
  const validGeminiModels = [
    "gemini-3-pro-preview",
    "gemini-3-pro",
    "gemini-3-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-flash"
  ];
  
  // 验证并选择模型
  const trimmedModelName = modelName && modelName.trim() ? modelName.trim() : "";
  const targetModel = validGeminiModels.includes(trimmedModelName) 
    ? trimmedModelName 
    : "gemini-3-pro-preview"; // 默认模型

  // 本地演示模式：当 API Key 为 'demo' 时，使用预生成的本地数据
  if (cleanApiKey.toLowerCase() === 'demo') {
    console.log('🎯 使用本地演示模式');
    const mockData = await fetch('/mock-data.json').then(r => r.json());
    return {
      chartData: mockData.chartPoints,
      analysis: {
        bazi: mockData.bazi || [],
        summary: mockData.summary || "无摘要",
        summaryScore: mockData.summaryScore || 5,
        personality: mockData.personality || "无性格分析",
        personalityScore: mockData.personalityScore || 5,
        industry: mockData.industry || "无",
        industryScore: mockData.industryScore || 5,
        fengShui: mockData.fengShui || "建议多亲近自然，保持心境平和。",
        fengShuiScore: mockData.fengShuiScore || 5,
        wealth: mockData.wealth || "无",
        wealthScore: mockData.wealthScore || 5,
        marriage: mockData.marriage || "无",
        marriageScore: mockData.marriageScore || 5,
        health: mockData.health || "无",
        healthScore: mockData.healthScore || 5,
        family: mockData.family || "无",
        familyScore: mockData.familyScore || 5,
        crypto: mockData.crypto || "暂无交易分析",
        cryptoScore: mockData.cryptoScore || 5,
        cryptoYear: mockData.cryptoYear || "待定",
        cryptoStyle: mockData.cryptoStyle || "黄金定投",
      },
    };
  }
  
  // 验证必要的八字信息是否完整
  const requiredBaziFields = [
    input.birthYear, input.birthMonth, input.birthDay, input.birthHour, input.birthMinute,
    input.yearPillar, input.monthPillar, input.dayPillar, input.hourPillar,
    input.startAge, input.firstDaYun
  ];
  
  if (requiredBaziFields.some(field => !field || field.trim() === '')) {
    console.error('❌ 必要的八字信息不完整');
    throw new Error('必要的八字信息不完整，请检查输入数据。');
  }

  if (!cleanApiKey) {
    throw new Error("请在表单中填写有效的 API Key（输入 'demo' 可使用本地演示模式）");
  }

  // Check for non-ASCII characters to prevent obscure 'Failed to construct Request' errors
  // If user accidentally pastes Chinese characters or emojis in the API key field
  if (/[^\x00-\x7F]/.test(cleanApiKey)) {
    throw new Error("API Key 包含非法字符（如中文或全角符号），请检查输入是否正确。");
  }

  if (!cleanBaseUrl) {
    throw new Error("请在表单中填写有效的 API Base URL");
  }

  const genderStr = input.gender === Gender.MALE ? '男 (乾造)' : '女 (坤造)';
  const startAgeInt = parseInt(input.startAge) || 1;

  // Calculate Da Yun Direction accurately
  const yearStemPolarity = getStemPolarity(input.yearPillar);
  let isForward = false;

  if (input.gender === Gender.MALE) {
    isForward = yearStemPolarity === 'YANG';
  } else {
    isForward = yearStemPolarity === 'YIN';
  }

  const directionStr = isForward ? '顺行' : '逆行';

  // 生成简化的用户提示词格式
  const userPrompt = `=== User Input ===
性别：${genderStr}
出生：${input.birthYear}年${input.birthMonth}月${input.birthDay}日 ${input.birthHour}:${input.birthMinute} (阳历)
八字：${input.yearPillar} | ${input.monthPillar} | ${input.dayPillar} | ${input.hourPillar}
大运：起运${input.startAge}岁，首运[${input.firstDaYun}]，方向[${directionStr}]。`;

  // 保留原有的算法和任务说明，确保模型能正确生成所需数据
  const algorithmInstructions = `

请根据以上八字信息进行分析，并严格按照以下规则生成数据：

【必须执行的算法 - 大运序列生成】
1. **锁定第一步**：确认【${input.firstDaYun}】为第一步大运。
2. **计算序列**：根据六十甲子顺序和方向（${directionStr}），推算出接下来的 9 步大运。
3. **填充 JSON**：
   - Age 1 到 ${startAgeInt - 1}: daYun = "童限"
   - Age ${startAgeInt} 到 ${startAgeInt + 9}: daYun = [第1步大运: ${input.firstDaYun}]
   - Age ${startAgeInt + 10} 到 ${startAgeInt + 19}: daYun = [第2步大运]
   - Age ${startAgeInt + 20} 到 ${startAgeInt + 29}: daYun = [第3步大运]
   - ...以此类推直到 100 岁。

【特别警告】
- **daYun 字段**：必须填大运干支（10年一变），**绝对不要**填流年干支。
- **ganZhi 字段**：填入该年份的**流年干支**（每年一变，例如 2024=甲辰，2025=乙巳）。

任务：
1. 确认格局与喜忌。
2. 生成 **1-100 岁 (虚岁)** 的人生流年K线数据。
3. 在 \`reason\` 字段中提供流年详批。
4. 生成带评分的命理分析报告（包含性格分析、股市交易分析、发展风水分析）。

请严格按照系统指令生成 JSON 数据。`;

  // 合并用户提示词和算法说明
  const fullPrompt = userPrompt + algorithmInstructions;

  try {
    console.log(`🔄 发送请求到 Gemini API，使用模型: ${targetModel}`);
    
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
    
    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: BAZI_SYSTEM_INSTRUCTION + "\n\n请务必只返回纯JSON格式数据，不要包含任何markdown代码块标记。" },
          { role: "user", content: fullPrompt }
        ],
        temperature: 0.7,
        max_tokens: 30000
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // 清除超时定时器

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ API 请求失败: ${response.status}`, errText);
      throw new Error(`API 请求失败: ${response.status} - ${errText}`);
    }

    console.log("✅ API 请求成功，正在处理响应数据...");
    
    const jsonResult = await response.json();
    const content = jsonResult.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ 模型未返回任何内容");
      throw new Error("模型未返回任何内容。");
    }

    // 从可能包含 markdown 代码块的内容中提取 JSON
    let jsonContent = content;

    // 尝试提取 ```json ... ``` 中的内容
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
      console.log("📝 成功提取 JSON 代码块内容");
    } else {
      // 如果没有代码块，尝试找到 JSON 对象
      const jsonStartIndex = content.indexOf('{');
      const jsonEndIndex = content.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        jsonContent = content.substring(jsonStartIndex, jsonEndIndex + 1);
        console.log("📝 成功提取原始 JSON 内容");
      } else {
        console.error("❌ 无法从响应中提取 JSON 内容", content);
        throw new Error("无法从模型响应中提取有效 JSON 数据。");
      }
    }

    // 解析 JSON
    let data;
    try {
      data = JSON.parse(jsonContent);
      console.log("✅ JSON 解析成功");
    } catch (jsonError) {
      console.error("❌ JSON 解析失败", jsonError, "原始内容:", jsonContent);
      throw new Error(`JSON 解析失败: ${(jsonError as Error).message}`);
    }

    // 校验数据完整性
    if (!data.chartPoints || !Array.isArray(data.chartPoints)) {
      console.error("❌ 模型返回的数据格式不正确（缺失 chartPoints）", data);
      throw new Error("模型返回的数据格式不正确（缺失 chartPoints）。");
    }
    
    if (data.chartPoints.length !== 100) {
      console.warn(`⚠️  chartPoints 数量不是100（实际: ${data.chartPoints.length}），可能影响图表显示`);
    }

    console.log("✅ 数据校验通过，准备返回结果");
    
    return {
      chartData: data.chartPoints,
      analysis: {
        bazi: data.bazi || [],
        summary: data.summary || "无摘要",
        summaryScore: data.summaryScore || 5,
        personality: data.personality || "无性格分析",
        personalityScore: data.personalityScore || 5,
        industry: data.industry || "无",
        industryScore: data.industryScore || 5,
        fengShui: data.fengShui || "建议多亲近自然，保持心境平和。",
        fengShuiScore: data.fengShuiScore || 5,
        wealth: data.wealth || "无",
        wealthScore: data.wealthScore || 5,
        marriage: data.marriage || "无",
        marriageScore: data.marriageScore || 5,
        health: data.health || "无",
        healthScore: data.healthScore || 5,
        family: data.family || "无",
        familyScore: data.familyScore || 5,
        // Crypto Fields
        crypto: data.crypto || "暂无交易分析",
        cryptoScore: data.cryptoScore || 5,
        cryptoYear: data.cryptoYear || "待定",
        cryptoStyle: data.cryptoStyle || "黄金定投",
      },
    };
  } catch (error) {
    console.error("Gemini/OpenAI API Error:", error);
    
    // 增强错误信息
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error("API 请求超时，请检查网络连接或稍后重试。");
      } else if (error.message.includes('Failed to construct Request')) {
        throw new Error("API 请求构造失败，请检查 API Base URL 是否正确。");
      } else if (error.message.includes('JSON parse error')) {
        throw new Error("模型返回的 JSON 格式错误，请检查系统指令是否正确。");
      }
    }
    
    throw error;
  }
};
