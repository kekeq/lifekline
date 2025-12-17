
import React, { useState, useRef } from 'react';
import { LifeDestinyResult } from '../types';
import { Copy, CheckCircle, AlertCircle, Upload, Sparkles, MessageSquare, ArrowRight, Calendar, Clock, Star, Info } from 'lucide-react';
import { BAZI_SYSTEM_INSTRUCTION } from '../constants';
import { calculateBazi } from './baziUtils';

interface ImportDataModeProps {
    onDataImport: (data: LifeDestinyResult) => void;
}

const ImportDataMode: React.FC<ImportDataModeProps> = ({ onDataImport }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [baziInfo, setBaziInfo] = useState({
        name: '',
        gender: 'Male',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        birthHour: '',
        birthMinute: '',
        yearPillar: '',
        monthPillar: '',
        dayPillar: '',
        hourPillar: '',
        startAge: '',
        firstDaYun: '',
        lunarDate: '',
    });
    const [jsonInput, setJsonInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    // 使用Ref管理计时器，避免状态更新
    const intervalRef = useRef<number | null>(null);

    // 计算大运方向
    const getDaYunDirection = () => {
        if (!baziInfo.yearPillar) return { isForward: true, text: '顺行 (Forward)' };
        const firstChar = baziInfo.yearPillar.trim().charAt(0);
        const yangStems = ['甲', '丙', '戊', '庚', '壬'];

        const isYangYear = yangStems.includes(firstChar);
        const isForward = baziInfo.gender === 'Male' ? isYangYear : !isYangYear;

        return {
            isForward,
            text: isForward ? '顺行 (Forward)' : '逆行 (Backward)'
        };
    };

    // 生成用户提示词
    const generateUserPrompt = () => {
        const { isForward, text: daYunDirectionStr } = getDaYunDirection();
        const genderStr = baziInfo.gender === 'Male' ? '男 (乾造)' : '女 (坤造)';
        const startAgeInt = parseInt(baziInfo.startAge) || 1;

        const directionExample = isForward
            ? "例如：第一步是【戊申】，第二步则是【己酉】（顺排）"
            : "例如：第一步是【戊申】，第二步则是【丁未】（逆排）";

        const yearStemPolarity = (() => {
            const firstChar = baziInfo.yearPillar.trim().charAt(0);
            const yangStems = ['甲', '丙', '戊', '庚', '壬'];
            return yangStems.includes(firstChar) ? '阳' : '阴';
        })();

        return `请根据以下**已经排好的**八字四柱和**指定的大运信息**进行分析。

【基本信息】
性别：${genderStr}
姓名：${baziInfo.name || "未提供"}
出生日期：${baziInfo.birthYear}年${baziInfo.birthMonth}月${baziInfo.birthDay}日 ${baziInfo.birthHour}:${baziInfo.birthMinute} (阳历)

【八字四柱】
年柱：${baziInfo.yearPillar} (天干属性：${yearStemPolarity})
月柱：${baziInfo.monthPillar}
日柱：${baziInfo.dayPillar}
时柱：${baziInfo.hourPillar}

【大运核心参数】
1. 起运年龄：${baziInfo.startAge} 岁 (虚岁)。
2. 第一步大运：${baziInfo.firstDaYun}。
3. **排序方向**：${daYunDirectionStr}。

【必须执行的算法 - 大运序列生成】
请严格按照以下步骤生成数据：

1. **锁定第一步**：确认【${baziInfo.firstDaYun}】为第一步大运。
2. **计算序列**：根据六十甲子顺序和方向（${daYunDirectionStr}），推算出接下来的 9 步大运。
   ${directionExample}
3. **填充 JSON**：
   - Age 1 到 ${startAgeInt - 1}: daYun = "童限"
   - Age ${startAgeInt} 到 ${startAgeInt + 9}: daYun = [第1步大运: ${baziInfo.firstDaYun}]
   - Age ${startAgeInt + 10} 到 ${startAgeInt + 19}: daYun = [第2步大运]
   - ...以此类推直到 100 岁。

【特别警告】
- **daYun 字段**：必须填大运干支（10年一变），**绝对不要**填流年干支。
- **ganZhi 字段**：填入该年份的**流年干支**（每年一变，例如 2024=甲辰，2025=乙巳）。

任务：
1. 确认格局与喜忌。
2. 生成 **1-100 岁 (虚岁)** 的人生流年K线数据。
3. 在 \`reason\` 字段中提供流年详批。
4. 生成带评分的命理分析报告（包含性格分析、股市交易分析、发展风水分析）。

请严格按照系统指令生成 JSON 数据。务必只返回纯JSON格式数据，不要包含任何markdown代码块标记或其他文字说明。`;
    };

    // 复制完整提示词
    const copyFullPrompt = async () => {
        const fullPrompt = `=== 系统指令 (System Prompt) ===

${BAZI_SYSTEM_INSTRUCTION}

=== 用户提示词 (User Prompt) ===

${generateUserPrompt()}`;

        try {
            await navigator.clipboard.writeText(fullPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败', err);
        }
    };

    // 一键请求 DeepSeek API
    const handleOneClickRequest = async () => {
        setIsLoading(true);
        setProgress(0);
        setError(null);

        // 启动进度模拟（5分钟完成）
        const totalDuration = 5 * 60; // 总时长（秒）
        const startTime = Date.now();
        const intervalTime = 1000; // 每秒更新一次

        // 使用Ref管理计时器
        intervalRef.current = window.setInterval(() => {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const newProgress = Math.min((elapsedSeconds / totalDuration) * 100, 100);
            setProgress(newProgress);
        }, intervalTime);

        try {
            // 构建完整提示词
            const fullPrompt = `=== 系统指令 (System Prompt) ===

${BAZI_SYSTEM_INSTRUCTION}

=== 用户提示词 (User Prompt) ===

${generateUserPrompt()}`;

            // 调用 DeepSeek API
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk-f71421af40e646cfb2a226bc450728e2`,
                },
                body: JSON.stringify({
                    model: 'deepseek-reasoner',
                    messages: [
                        {
                            role: 'user',
                            content: fullPrompt
                        }
                    ],
                    max_tokens: 32768,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API请求失败：${response.status} ${errorData.error?.message || '未知错误'}`);
            }

            const data = await response.json();

            // 提取AI回复内容
            const aiResponse = data.choices?.[0]?.message?.content;
            if (!aiResponse) {
                throw new Error('API响应格式不正确：缺少回复内容');
            }

            // 设置JSON输入并跳转到下一步
            setJsonInput(aiResponse);
            setStep(4);
            setProgress(100); // 确保进度条显示100%
        } catch (err: any) {
            console.error('一键请求失败:', err);
            setError(err.message || '请求失败，请稍后重试');
        } finally {
            setIsLoading(false);
            // 清除进度计时器
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    };

    // 解析导入的 JSON
    const handleImport = () => {
        setError(null);

        if (!jsonInput.trim()) {
            setError('请粘贴 AI 返回的 JSON 数据');
            return;
        }

        try {
            // 尝试从可能包含 markdown 的内容中提取 JSON
            let jsonContent = jsonInput.trim();

            // 提取 ```json ... ``` 中的内容
            const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1].trim();
            } else {
                // 尝试找到 JSON 对象
                const jsonStartIndex = jsonContent.indexOf('{');
                const jsonEndIndex = jsonContent.lastIndexOf('}');
                if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                    jsonContent = jsonContent.substring(jsonStartIndex, jsonEndIndex + 1);
                }
            }

            const data = JSON.parse(jsonContent);

            // 校验数据
            if (!data.chartPoints || !Array.isArray(data.chartPoints)) {
                throw new Error('数据格式不正确：缺少 chartPoints 数组');
            }

            if (data.chartPoints.length < 10) {
                throw new Error('数据不完整：chartPoints 数量太少');
            }

            // 转换为应用所需格式
            const result: LifeDestinyResult = {
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
                    crypto: data.crypto || "暂无交易分析",
                    cryptoScore: data.cryptoScore || 5,
                    cryptoYear: data.cryptoYear || "待定",
                    cryptoStyle: data.cryptoStyle || "黄金定投",
                },
            };

            onDataImport(result);
        } catch (err: any) {
            setError(`解析失败：${err.message}`);
        }
    };

    const handleBaziChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setBaziInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const isStep1Valid = baziInfo.birthYear && baziInfo.birthMonth && baziInfo.birthDay &&
        baziInfo.birthHour && baziInfo.birthMinute;

    return (
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            {/* 步骤指示器 */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3, 4].map((s) => (
                    <React.Fragment key={s}>
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === s
                                ? 'bg-indigo-600 text-white scale-110'
                                : step > s
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                        >
                            {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                        </div>
                        {s < 4 && <div className={`w-16 h-1 rounded ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* 步骤 1: 输入八字信息 */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">第一步：输入时辰信息</h2>
                        <p className="text-gray-500 text-sm">填写您的时辰信息</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">姓名 (可选)</label>
                            <input
                                type="text"
                                name="name"
                                value={baziInfo.name}
                                onChange={handleBaziChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="姓名"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">性别</label>
                            <select
                                name="gender"
                                value={baziInfo.gender}
                                onChange={handleBaziChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="Male">男</option>
                                <option value="Female">女</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-3 text-amber-800 text-sm font-bold">
                            <Sparkles className="w-4 h-4" />
                            <span>时辰信息</span>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1">出生年份 (阳历)</label>
                            <input
                                type="number"
                                name="birthYear"
                                value={baziInfo.birthYear}
                                onChange={handleBaziChange}
                                placeholder="如: 2003"
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">出生月份</label>
                                <input
                                    type="number"
                                    name="birthMonth"
                                    value={baziInfo.birthMonth}
                                    onChange={handleBaziChange}
                                    placeholder="如: 8"
                                    min="1"
                                    max="12"
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">出生日</label>
                                <input
                                    type="number"
                                    name="birthDay"
                                    value={baziInfo.birthDay}
                                    onChange={handleBaziChange}
                                    placeholder="如: 15"
                                    min="1"
                                    max="31"
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">出生时</label>
                                <input
                                    type="number"
                                    name="birthHour"
                                    value={baziInfo.birthHour}
                                    onChange={handleBaziChange}
                                    placeholder="如: 14"
                                    min="0"
                                    max="23"
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">出生分</label>
                                <input
                                    type="number"
                                    name="birthMinute"
                                    value={baziInfo.birthMinute}
                                    onChange={handleBaziChange}
                                    placeholder="如: 30"
                                    min="0"
                                    max="59"
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-bold"
                                />
                            </div>
                        </div>

                        {/* 隐藏四柱干支输入区域 - 用户不需要手动输入 */}
                        {/* <div className="grid grid-cols-4 gap-3">
                            {(['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'] as const).map((field, i) => (
                                <div key={field}>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">{['年柱', '月柱', '日柱', '时柱'][i]}</label>
                                    <input
                                        type="text"
                                        name={field}
                                        value={baziInfo[field]}
                                        onChange={handleBaziChange}
                                        placeholder={['甲子', '乙丑', '丙寅', '丁卯'][i]}
                                        className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
                                    />
                                </div>
                            ))}
                        </div> */}
                    </div>

                    {/* 隐藏起运年龄和第一步大运输入区域 - 用户不需要手动输入 */}
                    {/* <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">起运年龄 (虚岁)</label>
                                <input
                                    type="number"
                                    name="startAge"
                                    value={baziInfo.startAge}
                                    onChange={handleBaziChange}
                                    placeholder="如: 8"
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">第一步大运</label>
                                <input
                                    type="text"
                                    name="firstDaYun"
                                    value={baziInfo.firstDaYun}
                                    onChange={handleBaziChange}
                                    placeholder="如: 辛酉"
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-serif-sc font-bold"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-indigo-600/70 mt-2 text-center">
                            大运方向：<span className="font-bold text-indigo-900">{getDaYunDirection().text}</span>
                        </p>
                    </div> */}

                    <button
                        onClick={() => {
                            // 计算八字信息
                            const baziResult = calculateBazi(
                                parseInt(baziInfo.birthYear),
                                parseInt(baziInfo.birthMonth),
                                parseInt(baziInfo.birthDay),
                                parseInt(baziInfo.birthHour),
                                parseInt(baziInfo.birthMinute),
                                baziInfo.gender
                            );
                            
                            // 更新状态
                            setBaziInfo(prev => ({
                                ...prev,
                                yearPillar: baziResult.yearPillar,
                                monthPillar: baziResult.monthPillar,
                                dayPillar: baziResult.dayPillar,
                                hourPillar: baziResult.hourPillar,
                                startAge: baziResult.startAge.toString(),
                                firstDaYun: baziResult.firstDaYun,
                                lunarDate: baziResult.lunarDate
                            }));
                            
                            // 进入下一步
                            setStep(2);
                        }}
                        disabled={!isStep1Valid}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        下一步：八字排盘 <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* 步骤 2: 八字排盘确认 */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-green-600 mb-2">
                            <CheckCircle className="w-6 h-6 inline mr-2" />
                            八字排盘完成
                        </h2>
                        <p className="text-gray-600 text-sm">请确认排盘结果，无误后点击"开始AI分析"</p>
                    </div>

                    {/* 出生信息 */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            出生信息
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-700">公历：{baziInfo.birthYear}年{baziInfo.birthMonth}月{baziInfo.birthDay}日 {baziInfo.birthHour}:{baziInfo.birthMinute}</p>
                            </div>
                            {/* <div>
                                <p className="text-xs text-gray-700">农历：{baziInfo.lunarDate}</p>
                            </div> */}
                            <div>
                                <p className="text-xs text-gray-700">性别：{baziInfo.gender === 'Male' ? '男' : '女'}</p>
                            </div>
                        </div>
                    </div>

                    {/* 真太阳时 */}
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <p className="text-xs text-yellow-800 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            真太阳时：{baziInfo.birthHour}:{baziInfo.birthMinute}（时辰：申时）
                        </p>
                    </div>

                    {/* 四柱八字 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-purple-800 flex items-center">
                            <Star className="w-4 h-4 mr-1" />
                            四柱八字
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                            {(['年柱', '月柱', '日柱', '时柱'] as const).map((title, i) => (
                                <div key={title} className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                                    <p className="text-xs text-purple-800 mb-1">{title}</p>
                                    <p className="text-lg font-bold font-serif-sc text-purple-700">
                                        {[baziInfo.yearPillar, baziInfo.monthPillar, baziInfo.dayPillar, baziInfo.hourPillar][i]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 大运信息 */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-800">大运信息</h3>
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-xs text-gray-700">起运年龄：{baziInfo.startAge}岁（虚岁）</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-700">大运方向：<span className="font-bold text-purple-700">{getDaYunDirection().text}</span></p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-700 mb-2">前十步大运：</p>
                                <div className="flex flex-wrap gap-2">
                                    {['戊子', '丁亥', '丙戌', '乙酉', '甲申', '癸未', '壬午', '辛巳', '庚辰'].map((yun, index) => (
                                        <div key={index} className="bg-gray-50 rounded px-3 py-1 border border-gray-200">
                                            <p className="text-xs text-gray-800">{index + 1}.{yun}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 按钮区域 */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            重新输入
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                        >
                            确认无误，生成提示词
                        </button>
                    </div>

                    {/* 提示信息 */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-800">
                            <Info className="w-4 h-4 inline mr-1" />
                            排盘结果基于万年历和真太阳时计算。如有疑问，请确认出生时间是否准确（建议核对出生证明）。
                        </p>
                    </div>
                </div>
            )}

            {/* 步骤 3: 生成提示词 */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">第三步：复制提示词</h2>
                        <p className="text-gray-500 text-sm">将提示词粘贴到任意 AI 聊天工具</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <label className="block text-sm font-bold text-blue-800 mb-2">
                            <MessageSquare className="w-4 h-4 inline mr-2" />
                            支持的 AI 工具
                        </label>
                        <p className="text-xs text-blue-700">ChatGPT、Claude、Gemini、通义千问、文心一言等</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            <Sparkles className="w-4 h-4 inline mr-2" />
                            完整提示词
                        </label>
                        <div className="bg-white p-4 rounded-lg border border-gray-300 h-64 overflow-y-auto font-mono text-xs">
                            {generateUserPrompt()}
                        </div>
                    </div>

                    <button
                        onClick={copyFullPrompt}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${copied
                            ? 'bg-green-600 text-white'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'}`}
                    >
                        {copied ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                已复制！
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                复制完整提示词
                            </>
                        )}
                    </button>

                    {/* 一键请求按钮 */}
                    <div className="space-y-3">
                        <button
                            onClick={handleOneClickRequest}
                            disabled={isLoading}
                            className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isLoading
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white'}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    请求中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    一键请求
                                </>
                            )}
                        </button>

                        {/* 进度条 */}
                        {isLoading && (
                            <div className="space-y-2">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-600">
                                    <span>预计剩余时间: {Math.max(0, Math.floor((5 * 60 * (100 - progress)) / 100 / 60))}分{Math.max(0, Math.floor((5 * 60 * (100 - progress)) / 100 % 60))}秒</span>
                                    <span>{progress.toFixed(1)}%</span>
                                </div>
                                <p className="text-xs text-blue-600 text-center">正在生成详细命理分析，请耐心等待...</p>
                            </div>
                        )}
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                            <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-4 h-4" />
                                <span className="font-bold text-sm">请求失败</span>
                            </div>
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                        <h3 className="text-sm font-bold text-yellow-800 mb-2">使用说明</h3>
                        <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                            <li>点击上方按钮复制提示词</li>
                            <li>打开任意 AI 聊天工具（如 ChatGPT）</li>
                            <li>粘贴提示词并发送</li>
                            <li>等待 AI 生成完整的 JSON 数据</li>
                            <li>复制 AI 的回复，回到这里进行下一步</li>
                        </ol>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            ← 上一步
                        </button>
                        <button
                            onClick={() => setStep(4)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            下一步：导入数据
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* 步骤 4: 导入 JSON */}
            {step === 4 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">第四步：导入 AI 回复</h2>
                        <p className="text-gray-500 text-sm">粘贴 AI 返回的 JSON 数据</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            <Upload className="w-4 h-4 inline mr-2" />
                            粘贴 AI 返回的 JSON 数据
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='将 AI 返回的 JSON 数据粘贴到这里...&#10;&#10;例如:&#10;{&#10;  "bazi": ["癸未", "壬戌", "丙子", "庚寅"],&#10;  "chartPoints": [...],&#10;  ...&#10;}'
                            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            ← 上一步
                        </button>
                        <button
                            onClick={handleImport}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5" />
                            生成人生K线
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportDataMode;
