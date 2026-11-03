import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bolt, Check, MapPin, ThumbsUp, Users } from 'lucide-react'
import { useApp } from '../lib/context'
import type { Report } from '../lib/types'
import { locationOf } from '../lib/types'
import { authorOf, initials, relativeTime } from '../lib/utils'
import { Badge } from './ui'
export function Interactions({ report }: { report: Report }) {
  const { api, session, refresh, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const toggle = async (action: 'support' | 'affected') => { setBusy(true); try { await api(`/reports/${report._id}/${action}`, 'PATCH'); refresh() } catch (err) { notify((err as Error).message, true) } finally { setBusy(false) } }
  return <div className="interactions"><button className={report.supporters.includes(session!.user.id) ? 'selected' : ''} aria-label={`Support ${report.title}`} aria-pressed={report.supporters.includes(session!.user.id)} disabled={busy} onClick={() => toggle('support')}><ThumbsUp size={15} /><span>Support</span><b>{report.supporters.length}</b></button><button className={report.affectedUsers.includes(session!.user.id) ? 'selected affected' : ''} aria-label={`I'm affected by ${report.title}`} aria-pressed={report.affectedUsers.includes(session!.user.id)} disabled={busy} onClick={() => toggle('affected')}><Users size={15} /><span>I’m affected</span><b>{report.affectedUsers.length}</b></button></div>
}
export default function ReportCard({ report }: { report: Report }) {
  const location = locationOf(report); const author = authorOf(report)
  return <article className="report-card"><div className="report-card-top"><div className="report-author"><span className={`avatar small tint-${author.length % 4}`}>{initials(author)}</span><div><strong>{author}</strong><span>{relativeTime(report.createdAt)}<i>·</i>Campus member</span></div></div><Badge status={report.status} /></div><Link to={`/reports/${report._id}`} className="report-title"><h3>{report.title}</h3><ArrowUpRight size={19} /></Link><p className="report-description">{report.description}</p>{report.images[0] && <Link to={`/reports/${report._id}`}><img className="report-photo" src={report.images[0].url} alt={`Photo attached to ${report.title}`} loading="lazy" /></Link>}<div className="report-meta"><span><MapPin size={14} />{location?.name || 'Campus location'}{location?.floor && <em> / {location.floor}</em>}</span><span className="priority-score" title="2 points per supporter + 5 points per affected user"><Bolt size={13} fill="currentColor" />{report.priorityScore}<span>priority score</span></span></div><div className="report-card-bottom"><Interactions report={report} /><Link className="detail-link" to={`/reports/${report._id}`}>{report.status === 'resolved' && <Check size={14} />}View report <ArrowUpRight size={15} /></Link></div></article>
}
