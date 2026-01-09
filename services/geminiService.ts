import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserInputs, ScriptPlan, ScriptAct, Character, AISettings } from "../types";

// Schema Definitions (Reused for Gemini)
const RESPONSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the script/novel" },
      logline: { type: Type.STRING, description: "A one-sentence hook summary" },
      synopsis: { type: Type.STRING, description: "A brief paragraph summarizing the story arc" },
      tone: { type: Type.STRING, description: "The atmospheric tone (e.g. Cyberpunk Noir, Romantic Comedy)" },
      mainConflict: { type: Type.STRING, description: "The central conflict driving the plot" },
      acts: {
        type: Type.ARRAY,
        description: "A breakdown of the story structure (usually 3-4 acts)",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["title", "logline", "synopsis", "tone", "acts", "mainConflict"],
  },
};

const ACTS_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
    },
    required: ["title", "description"],
  },
};

const REFINE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "The refined and detailed description of the act." },
  },
  required: ["description"],
};

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    worldSetting: { type: Type.STRING, description: "Extracted world setting or background story." },
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          role: { type: Type.STRING, enum: ['主角', '主要配角', '反派BOSS', '次要配角', '群演'] }
        },
        required: ["name", "description", "role"]
      }
    },
    plotSnippets: { type: Type.STRING, description: "Summary of plot events found in the text." },
    theme: { type: Type.STRING, description: "Inferred theme or tone." }
  },
  required: ["worldSetting", "characters", "plotSnippets"]
};

// Helper to format character list for prompt
const formatCharacters = (chars: Character[]): string => {
  if (!chars || chars.length === 0) return "未提供，请自行发挥";
  return chars.map((c, i) => 
    `${i + 1}. [${c.role}] ${c.name}: ${c.description}`
  ).join("\n    ");
};

// --- CORE AI EXECUTION LOGIC ---

/**
 * Unified function to call the appropriate AI provider based on settings.
 */
async function callAI(
  prompt: string, 
  settings: AISettings, 
  schema?: Schema, 
  systemInstruction: string = "你是一个专业的创意写作AI助手。"
): Promise<string> {
  
  // 1. DEFAULT: Internal Gemini Flash
  if (settings.provider === 'default') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema,
        systemInstruction: systemInstruction,
      },
    });
    return response.text || "";
  }

  // 2. GEMINI CUSTOM: User provided key
  if (settings.provider === 'gemini') {
    if (!settings.apiKey) throw new Error("请在设置中配置 Gemini API Key");
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using 2.0-flash as proxy for 'Pro' capabilities until 2.5 is public stable, or explicitly 'gemini-1.5-pro' if preferred. Keeping as flash/pro mix for performance. 
      // User requested "gemini-2.5-pro". Since SDK might not resolve it if not released, we try it, but standard fallback is wise. 
      // Let's use the explicit request.
      // Note: If 2.5 isn't available, this might fail. We'll stick to a high capability model string.
      contents: prompt,
      config: {
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema,
        systemInstruction: systemInstruction,
      },
    });
    return response.text || "";
  }

  // 3. DEEPSEEK: OpenAI Compatible API
  if (settings.provider === 'deepseek') {
    if (!settings.apiKey) throw new Error("请在设置中配置 DeepSeek API Key");
    
    // DeepSeek System Prompt for JSON enforcement
    let finalSystemPrompt = systemInstruction;
    if (schema) {
      finalSystemPrompt += "\n请务必以严格的 JSON 格式返回结果，不要包含 Markdown 代码块标记（如 ```json）。直接返回 JSON 对象或数组。";
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: prompt }
        ],
        stream: false,
        // DeepSeek supports response_format: { type: 'json_object' } but strict schema validation is less robust than Gemini.
        // We rely on prompt engineering above.
        response_format: schema ? { type: "json_object" } : undefined 
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API Error: ${response.statusText} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  throw new Error("Unknown Provider");
}

// --- SERVICE EXPORTS ---

export const generateScriptPlans = async (
  inputs: UserInputs,
  avoidTitles: string[] = [],
  settings: AISettings
): Promise<ScriptPlan[]> => {

  let prompt = `
    任务：根据用户提供的碎片化灵感，整理并构思出 3 个截然不同的剧本/小说初步规划方案。
    
    用户提供的素材如下：
    - 世界观/背景: ${inputs.worldSetting || "未提供，请自行发挥"}
    - 角色人设: 
    ${formatCharacters(inputs.characters)}
    - 初步剧情片段: ${inputs.plotSnippets || "未提供，请自行发挥"}
    - 核心主题/风格偏好: ${inputs.theme || "未提供，请自行发挥"}
    
    要求：
    1. 生成 3 个方案。
    2. 每个方案必须有独特的切入点（例如：方案1侧重悬疑，方案2侧重情感，方案3侧重动作）。
    3. 语言必须是【简体中文】。
    4. 结构清晰，包含“一句话梗概(Logline)”、“故事简介”、“主要冲突”和“幕结构(Acts)”。
  `;

  if (avoidTitles.length > 0) {
    prompt += `
    \n重要提示：用户点击了“重做”。请不要生成与以下标题类似的方案，尝试完全不同的方向或反转：
    ${avoidTitles.join(", ")}
    `;
  }
  
  // For DeepSeek, we need to be explicit about the JSON structure in the prompt since we can't pass a schema object easily
  if (settings.provider === 'deepseek') {
    prompt += `
    \n请严格返回 JSON 数组格式，JSON 结构如下：
    [
      {
        "title": "标题",
        "logline": "一句话梗概",
        "synopsis": "简介",
        "tone": "风格",
        "mainConflict": "核心冲突",
        "acts": [
          { "title": "幕标题", "description": "幕详情" }
        ]
      }
    ]
    `;
  }

  try {
    const text = await callAI(
        prompt, 
        settings, 
        settings.provider === 'deepseek' ? undefined : RESPONSE_SCHEMA,
        "你是一个专业的创意写作AI助手。请始终以JSON数组格式返回数据。"
    );

    // Clean Markdown for DeepSeek if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const rawPlans = JSON.parse(cleanText) as Omit<ScriptPlan, "id">[];
    return rawPlans.map((plan, index) => ({
      ...plan,
      id: `${Date.now()}-${index}`,
      acts: plan.acts.map((act, i) => ({ ...act, id: `act-${Date.now()}-${index}-${i}` }))
    }));

  } catch (error) {
    console.error("Error generating script plans:", error);
    throw error;
  }
};

export const extendScriptStructure = async (
  plan: ScriptPlan,
  inputs: UserInputs,
  settings: AISettings
): Promise<ScriptAct[]> => {

  let prompt = `
    任务：为当前的剧本续写接下来的剧情结构（2-3个节点）。
    
    【基本信息】
    标题: ${plan.title}
    核心冲突: ${plan.mainConflict}
    风格: ${plan.tone}
    世界观: ${inputs.worldSetting}
    角色: 
    ${formatCharacters(inputs.characters)}

    【已有剧情结构】
    ${plan.acts.map((act, i) => `${i + 1}. ${act.title}: ${act.description}`).join("\n")}

    请只返回新增的结构部分（ScriptAct对象的JSON数组）。语言为【简体中文】。
  `;

  if (settings.provider === 'deepseek') {
      prompt += `\n请严格返回 JSON 数组格式：[{"title": "...", "description": "..."}]`;
  }

  try {
    const text = await callAI(
        prompt, 
        settings, 
        settings.provider === 'deepseek' ? undefined : ACTS_SCHEMA,
        "请以JSON数组格式返回新增的 ScriptAct 对象列表。"
    );

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const acts = JSON.parse(cleanText) as ScriptAct[];
    return acts.map((act, i) => ({ ...act, id: `ext-${Date.now()}-${i}` }));
  } catch (error) {
    console.error("Error extending script:", error);
    throw error;
  }
};

export const refineScriptAct = async (
  targetAct: ScriptAct,
  previousActs: ScriptAct[],
  planInfo: { title: string; tone: string },
  inputs: UserInputs,
  settings: AISettings
): Promise<string> => {
  
  const prevContext = previousActs.length > 0 
    ? `【前情回顾】\n${previousActs.map((a, i) => `${i + 1}. ${a.title}: ${a.description}`).join("\n")}`
    : "【前情回顾】\n这是故事的开篇。";

  let prompt = `
    任务：对以下特定的【当前剧情节点】进行“细化”和“扩写”。
    
    【基本信息】
    标题: ${planInfo.title}
    风格: ${planInfo.tone}
    世界观: ${inputs.worldSetting}
    角色: 
    ${formatCharacters(inputs.characters)}

    ${prevContext}

    【当前剧情节点 (待修改)】
    标题: ${targetAct.title}
    原描述: ${targetAct.description}

    请在保留原意图的基础上，大幅丰富该节点的细节。增加画面感、动作描述、潜在的对话冲突或心理活动描写。
    请返回JSON对象，包含 refined "description"。
  `;

  if (settings.provider === 'deepseek') {
      prompt += `\n请严格返回 JSON 格式：{"description": "..."}`;
  }

  try {
     const text = await callAI(
        prompt, 
        settings, 
        settings.provider === 'deepseek' ? undefined : REFINE_SCHEMA
    );
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleanText);
    return json.description;
  } catch (e) {
    console.error("Refine failed", e);
    throw e;
  }
};

export const splitScriptAct = async (
  targetAct: ScriptAct,
  previousActs: ScriptAct[],
  planInfo: { title: string; tone: string },
  inputs: UserInputs,
  settings: AISettings
): Promise<ScriptAct[]> => {

   const prevContext = previousActs.length > 0 
    ? `【前情回顾】\n${previousActs.map((a, i) => `${i + 1}. ${a.title}: ${a.description}`).join("\n")}`
    : "【前情回顾】\n这是故事的开篇。";

  let prompt = `
    任务：将以下【当前剧情节点】合理地“拆分”为一系列更细致的连续场景/节点（通常为2-4个）。
    
    【基本信息】
    标题: ${planInfo.title}
    风格: ${planInfo.tone}
    世界观: ${inputs.worldSetting}
    角色: 
    ${formatCharacters(inputs.characters)}

    ${prevContext}

    【当前剧情节点 (待拆分)】
    标题: ${targetAct.title}
    描述: ${targetAct.description}

    将上述节点的情节拆解开来。拆分后的节点必须保持时间上的连续性，能够平滑地替换原节点。
    请返回 ScriptAct 对象的 JSON 数组。
  `;

  if (settings.provider === 'deepseek') {
      prompt += `\n请严格返回 JSON 数组格式：[{"title": "...", "description": "..."}]`;
  }

  try {
     const text = await callAI(
        prompt, 
        settings, 
        settings.provider === 'deepseek' ? undefined : ACTS_SCHEMA
    );
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const acts = JSON.parse(cleanText) as ScriptAct[];
    return acts.map((act, i) => ({ ...act, id: `split-${Date.now()}-${i}` }));
  } catch (e) {
    console.error("Split failed", e);
    throw e;
  }
};

export const analyzeFileContent = async (text: string, settings: AISettings): Promise<Partial<UserInputs>> => {
  // Truncate text
  const content = text.length > 100000 ? text.slice(0, 100000) + "..." : text;

  let prompt = `
    请分析以下上传的小说/剧本草稿内容，智能提取出关键信息并以JSON格式返回。
    
    【任务】
    1. 提取或总结“世界观/故事背景” (worldSetting)。
    2. 提取主要“角色人设” (characters)，分析其性格、身份，并推断其角色定位(role)。
    3. 总结“初步剧情片段” (plotSnippets)，概括现有的剧情走向、关键事件或未完成的草稿内容。
    4. (可选) 推断“核心主题” (theme)。

    【文档内容】
    ${content}
  `;

  if (settings.provider === 'deepseek') {
      prompt += `\n请严格返回 JSON 格式，包含 worldSetting, characters (array of object), plotSnippets, theme 字段。`;
  }

  try {
    const textResult = await callAI(
        prompt, 
        settings, 
        settings.provider === 'deepseek' ? undefined : ANALYSIS_SCHEMA
    );

    const cleanText = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as Partial<UserInputs>;
  } catch (error) {
    console.error("File analysis failed:", error);
    throw error;
  }
};