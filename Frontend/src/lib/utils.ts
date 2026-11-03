import type { Report } from './types'
export function validateImages(files: File[], existing = 0) {
  if (files.length + existing > 2) return 'Choose at most 2 images per report.'
  if (files.some(f => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) return 'Use JPEG, PNG, or WebP images.'
  if (files.some(f => f.size > 5 * 1024 * 1024)) return 'Each image must be 5 MB or smaller.'
  return ''
}
export const initials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
export function relativeTime(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3600000))
  return hours < 1 ? 'Just now' : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}
export const dateTime = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
export const authorOf = (report: Report) => typeof report.reportedBy === 'object' ? report.reportedBy.name || 'Campus member' : 'Campus member'
export function summarize(reports: Report[]) {
  return { totalReports: reports.length, openReports: reports.filter(r => r.status === 'open').length, inProgressReports: reports.filter(r => r.status === 'in_progress').length, resolvedReports: reports.filter(r => r.status === 'resolved').length }
}
