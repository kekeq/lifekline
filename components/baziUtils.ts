// 八字计算工具函数

// 天干地支
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 六十甲子
const SIXTY_NAJIA = (() => {
  const result: string[] = [];
  for (let i = 0; i < 60; i++) {
    result.push(HEAVENLY_STEMS[i % 10] + EARTHLY_BRANCHES[i % 12]);
  }
  return result;
})();

// 节气日期（近似值，实际需要更精确的计算）
const SOLAR_TERMS = [
  { month: 1, day: 6 },  // 小寒
  { month: 2, day: 4 },  // 立春
  { month: 3, day: 6 },  // 惊蛰
  { month: 4, day: 5 },  // 清明
  { month: 5, day: 6 },  // 立夏
  { month: 6, day: 6 },  // 芒种
  { month: 7, day: 7 },  // 小暑
  { month: 8, day: 7 },  // 立秋
  { month: 9, day: 8 },  // 白露
  { month: 10, day: 8 }, // 寒露
  { month: 11, day: 7 }, // 立冬
  { month: 12, day: 7 }, // 大雪
];

// 判断是否是闰年
const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

// 获取月份天数
const getDaysInMonth = (year: number, month: number): number => {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
};

// 计算距离1900年1月1日的天数
const getDaysSince1900 = (year: number, month: number, day: number): number => {
  let days = 0;
  
  // 计算整年份的天数
  for (let y = 1900; y < year; y++) {
    days += isLeapYear(y) ? 366 : 365;
  }
  
  // 计算当年月份的天数
  for (let m = 1; m < month; m++) {
    days += getDaysInMonth(year, m);
  }
  
  // 加上当月天数
  days += day - 1;
  
  return days;
};

// 计算年柱（干支纪年）
const calculateYearPillar = (year: number): string => {
  // 1900年是庚子年，庚子在六十甲子中的索引是36
  const baseIndex = 36;
  const yearIndex = (year - 1900 + baseIndex) % 60;
  return SIXTY_NAJIA[yearIndex];
};

// 计算月柱
const calculateMonthPillar = (year: number, month: number, day: number): string => {
  // 获取年柱天干
  const yearPillar = calculateYearPillar(year);
  const yearStem = yearPillar[0];
  const yearStemIndex = HEAVENLY_STEMS.indexOf(yearStem);
  
  // 确定月份对应的节气
  let monthIndex = month - 1;
  
  // 如果日期在本月节气之前，使用上个月的月份索引
  const solarTerm = SOLAR_TERMS[monthIndex];
  if (day < solarTerm.day) {
    monthIndex = (monthIndex - 1 + 12) % 12;
  }
  
  // 计算月干
  const monthStemIndex = (yearStemIndex * 2 + monthIndex + 1) % 10;
  const monthStem = HEAVENLY_STEMS[monthStemIndex];
  
  // 计算月支（固定对应）
  const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const monthBranch = monthBranches[monthIndex];
  
  return monthStem + monthBranch;
};

// 计算日柱
const calculateDayPillar = (year: number, month: number, day: number): string => {
  // 1900年1月1日是庚子日，庚子在六十甲子中的索引是36
  const baseIndex = 36;
  const daysSince1900 = getDaysSince1900(year, month, day);
  const dayIndex = (daysSince1900 + baseIndex) % 60;
  return SIXTY_NAJIA[dayIndex];
};

// 计算时柱
const calculateHourPillar = (dayPillar: string, hour: number, minute: number = 0): string => {
  // 获取日柱天干
  const dayStem = dayPillar[0];
  const dayStemIndex = HEAVENLY_STEMS.indexOf(dayStem);
  
  // 计算时支（2小时为一个时辰，考虑分钟）
  const hourBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const totalHours = hour + minute / 60;
  const hourIndex = Math.floor(totalHours / 2);
  const hourBranch = hourBranches[hourIndex];
  
  // 计算时干
  const hourStemIndex = (dayStemIndex * 2 + hourIndex) % 10;
  const hourStem = HEAVENLY_STEMS[hourStemIndex];
  
  return hourStem + hourBranch;
};

// 计算起运年龄
const calculateStartAge = (year: number, month: number, day: number, gender: string): number => {
  // 这里使用简化的计算方法，实际需要根据节气和性别计算
  // 阳男阴女顺排，阴男阳女逆排
  const yearPillar = calculateYearPillar(year);
  const yearStem = yearPillar[0];
  const isYangStem = ['甲', '丙', '戊', '庚', '壬'].includes(yearStem);
  
  const isForward = (gender === 'Male' && isYangStem) || (gender === 'Female' && !isYangStem);
  
  // 获取立春日期
  const 立春 = SOLAR_TERMS[1]; // 立春在SOLAR_TERMS中的索引是1
  const isAfterLiChun = month > 2 || (month === 2 && day >= 立春.day);
  
  // 简化计算：如果在立春后出生，起运年龄为出生年份到下一个立春的天数除以3
  // 这里使用近似值
  const startAge = isAfterLiChun ? 1 : 2;
  
  return startAge;
};

// 计算第一步大运
const calculateFirstDaYun = (monthPillar: string, startAge: number, gender: string, year: number): string => {
  // 获取年柱来确定顺逆
  const yearPillar = calculateYearPillar(year);
  const yearStem = yearPillar[0];
  const isYangStem = ['甲', '丙', '戊', '庚', '壬'].includes(yearStem);
  
  const isForward = (gender === 'Male' && isYangStem) || (gender === 'Female' && !isYangStem);
  
  // 获取月柱在六十甲子中的索引
  const monthPillarIndex = SIXTY_NAJIA.indexOf(monthPillar);
  
  // 计算第一步大运索引
  let daYunIndex;
  if (isForward) {
    daYunIndex = (monthPillarIndex + 1) % 60; // 顺行则月柱后一位
  } else {
    daYunIndex = (monthPillarIndex - 1 + 60) % 60; // 逆行则月柱前一位
  }
  
  return SIXTY_NAJIA[daYunIndex];
};

// 完整的八字计算
interface BaziResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  startAge: number;
  firstDaYun: string;
}

const calculateBazi = (year: number, month: number, day: number, hour: number, minute: number, gender: string): BaziResult => {
  const yearPillar = calculateYearPillar(year);
  const monthPillar = calculateMonthPillar(year, month, day);
  const dayPillar = calculateDayPillar(year, month, day);
  const hourPillar = calculateHourPillar(dayPillar, hour, minute);
  const startAge = calculateStartAge(year, month, day, gender);
  const firstDaYun = calculateFirstDaYun(monthPillar, startAge, gender, year);
  
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    startAge,
    firstDaYun
  };
};

export {
  calculateYearPillar,
  calculateMonthPillar,
  calculateDayPillar,
  calculateHourPillar,
  calculateStartAge,
  calculateFirstDaYun,
  calculateBazi
};