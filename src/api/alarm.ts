import { get, put, withQuery } from './request'
import { API } from './config'

export interface AlarmRule {
  id: number
  rule_name?: string
  metric?: string
  level_value?: number
  push_enabled?: boolean | number
  enabled?: boolean | number
  updated_at?: string | null
}

export function getAlarmRules() {
  return get<AlarmRule[]>(API.ALARM.RULES, undefined, { showError: false })
}

export function updateAlarmRule(ruleId: number, data: { level_value?: number; push_enabled?: boolean | number }) {
  return put(withQuery(API.ALARM.RULE_UPDATE(ruleId), data), data, { showError: false })
}
