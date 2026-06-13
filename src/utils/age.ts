/**
 * 年龄计算工具
 * 统一显示格式：xx月xx天
 */

export interface AgeBreakdown {
  years: number
  months: number
  days: number
  label: string // 如 "3个月5天"、"1岁2个月10天"
  ageMonths: number // 用于模板匹配的纯月份数
}

/**
 * 从出生日期计算精确年龄
 * 优先使用 birth_date 实时计算，不依赖后端 current_age_months
 */
export function calcAge(birthDate: string | null | undefined): AgeBreakdown | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null

  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()

  if (days < 0) {
    months--
    // 获取上个月的天数
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  const ageMonths = years * 12 + months

  // 组装 label
  let label = ''
  if (years > 0) label += `${years}岁`
  if (months > 0) label += `${months}个月`
  if (days > 0) label += `${days}天`
  if (!label) label = '0天'

  return { years, months, days, label, ageMonths }
}

/**
 * 格式化年龄显示（从宝宝对象）
 * 优先用 birth_date 实时计算，fallback 到 current_age_months
 */
export function formatBabyAge(baby: { birth_date?: string | null; current_age_months?: number | null } | null): string {
  if (!baby) return '年龄未知'

  // 优先用 birth_date 实时计算（精确到天）
  const age = calcAge(baby.birth_date)
  if (age) return age.label

  // fallback：只有 current_age_months
  if (baby.current_age_months != null && baby.current_age_months > 0) {
    const y = Math.floor(baby.current_age_months / 12)
    const m = baby.current_age_months % 12
    if (y > 0) return `${y}岁${m}个月`
    return `${m}个月`
  }

  return '年龄未知'
}
