import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Bolt, CheckCheck, Clock3, ImagePlus, LoaderCircle, MapPin, Pencil, Trash2, UserRound, Wrench } from 'lucide-react'
import { useApp } from '../lib/context'
import { useResource } from '../lib/useResource'
import type { Person, Report, Status } from '../lib/types'
import { idOf, locationOf, statusLabel } from '../lib/types'
import { dateTime, validateImages } from '../lib/utils'
import { Badge, ErrorState, Loading, Modal } from '../components/ui'
import { Interactions } from '../components/ReportCard'
import ReportForm from '../components/ReportForm'

function Assignment({ report }: { report: Report }) {
  const { api, refresh, notify } = useApp()
  const { data: technicians, error, loading } = useResource<Person[]>('/users/technicians')
  const [selected, setSelected] = useState(idOf(report.assignedTo) || '')
  const [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); try { await api(`/reports/${report._id}/assign`, 'PATCH', { technicianId: selected }); notify('Technician assigned. The next step is in good hands.'); refresh() } catch (err) { notify((err as Error).message, true) } finally { setBusy(false) } }
  return <div className="detail-control"><h3><UserRound size={17} />Assign a technician</h3><p>Connect this report with the right person.</p>{error ? <ErrorState message={error} /> : <><label><span className="sr-only">Technician</span><select aria-label="Technician" value={selected} onChange={e => setSelected(e.target.value)} disabled={loading}><option value="">{loading ? 'Loading technicians…' : 'Choose a technician'}</option>{technicians?.map(t => <option key={t._id} value={t._id}>{t.name} · {t.email}</option>)}</select></label>{!loading && !technicians?.length && <p>No active technicians are available.</p>}<button className="btn primary full" disabled={!selected || busy} onClick={submit}>{busy ? <LoaderCircle size={15} className="spin" /> : <Wrench size={15} />}{busy ? 'Assigning…' : 'Assign technician'}</button></>}</div>
}
function StatusControl({ report }: { report: Report }) {
  const { api, refresh, notify } = useApp()
  const [status, setStatus] = useState<Status>(report.status)
  const [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); try { await api(`/reports/${report._id}/status`, 'PATCH', { status }); notify(`Report marked ${statusLabel[status].toLowerCase()}.`); refresh() } catch (err) { notify((err as Error).message, true) } finally { setBusy(false) } }
  return <div className="detail-control"><h3><CheckCheck size={18} />Keep the progress flowing</h3><p>A quick update keeps everyone in the loop.</p><label><span className="sr-only">Report status</span><select aria-label="Report status" value={status} onChange={e => setStatus(e.target.value as Status)}>{(['open', 'in_progress', 'resolved'] as Status[]).map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select></label><button className="btn primary full" disabled={busy || status === report.status} onClick={submit}>{busy ? 'Updating…' : 'Update status'}<ArrowUpRight size={15} /></button></div>
}
export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { api, session, notify, refresh } = useApp()
  const { data, error, loading } = useResource<{ report: Report }>(`/reports/${id}`)
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const report = data?.report
  if (loading) return <Loading />
  if (error || !report) return <ErrorState message={error || 'Report not found.'} />
  const user = session!.user
  const owner = idOf(report.reportedBy) === user.id
  const canManage = user.role === 'admin' || (user.role === 'technician' && idOf(report.assignedTo) === user.id)
  const location = locationOf(report)
  const remove = async () => { setBusy(true); try { await api(`/reports/${id}`, 'DELETE'); notify('Your report has been deleted.'); refresh(); navigate('/my-reports') } catch (err) { notify((err as Error).message, true) } finally { setBusy(false) } }
  const upload = async (files: File[]) => { if (!files.length) return; const message = validateImages(files, report.images.length); if (message) { notify(message, true); return }; setBusy(true); try { const form = new FormData(); files.forEach(f => form.append('images', f)); await api(`/reports/${id}/images`, 'POST', form); notify('Photos added to your report.'); refresh() } catch (err) { notify((err as Error).message, true) } finally { setBusy(false) } }
  return <><Link className="back-link" to="/feed"><ArrowLeft size={15} />Back to campus</Link><div className="detail-heading"><div><div className="detail-kicker"><span className="eyebrow">REPORT FF–{report._id.slice(-5).toUpperCase()}</span><Badge status={report.status} /></div><h1>{report.title}</h1><p><MapPin size={16} />{location?.name || 'Campus location'}{location?.buildingCode && ` · ${location.buildingCode}`}{location?.floor && ` / ${location.floor}`}</p></div>{owner && report.status === 'open' && <div className="detail-heading-actions"><button className="btn secondary" onClick={() => setEdit(true)}><Pencil size={15} />Edit report</button><button className="icon-btn danger" aria-label="Delete report" onClick={() => setConfirm(true)}><Trash2 size={17} /></button></div>}</div><div className="detail-layout"><div><section className="detail-panel"><span className="eyebrow">THE DETAILS THAT MATTER</span><h2>Here’s what was noticed.</h2><p className="detail-description">{report.description}</p>{report.images.length > 0 && <div className="detail-photos">{report.images.map((image, i) => <a key={image.publicId} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`Report attachment ${i + 1}`} /><span>View photo <ArrowUpRight size={14} /></span></a>)}</div>}{owner && report.images.length < 2 && <label className={`attach-btn ${busy ? 'disabled' : ''}`}><ImagePlus size={16} />{busy ? 'Uploading…' : 'Add photos'}<span>Up to {2 - report.images.length} more · 5 MB each</span><input aria-label="Add photos to report" disabled={busy} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(Array.from(e.target.files || [])); e.target.value = '' }} /></label>}<div className="detail-community"><div><h3>Does this matter to you, too?</h3><p>Your voice helps the right issues rise to the top.</p></div><Interactions report={report} /></div></section><section className="detail-panel timeline-panel"><span className="eyebrow">EVERY STEP FORWARD</span><h2>The story of this fix.</h2><div className="timeline">{[...report.timeline].reverse().map((event, i) => <div className={`timeline-item ${i === 0 ? 'latest' : ''}`} key={`${event.at}-${i}`}><span className="timeline-point">{event.action === 'created' ? <PlusIcon /> : event.action === 'assigned' ? <UserRound size={15} /> : <CheckCheck size={15} />}</span><div><h3>{event.action === 'created' ? 'A small change starts here' : event.action === 'assigned' ? 'In good hands' : event.details.includes('resolved') ? 'Back to better' : event.details.includes('in_progress') ? 'The work is underway' : 'Open for a fresh look'}</h3><p>{event.details.replaceAll('in_progress', 'in progress')}</p><time dateTime={event.at}>{dateTime(event.at)}</time></div></div>)}</div></section></div><aside className="detail-sidebar"><section className="priority-panel"><span className="panel-eyebrow"><Bolt size={15} />COMMUNITY PRIORITY</span><strong>{report.priorityScore}<span>points</span></strong><p>Small signals. A clearer picture.</p><div><span>{report.supporters.length} supporters <b>× 2</b></span><span>{report.affectedUsers.length} affected <b>× 5</b></span></div></section><section className="detail-panel detail-facts"><h3>The essentials</h3><div><MapPin size={16} /><span>Location<strong>{location?.name || 'Campus location'}</strong></span></div><div><Clock3 size={16} /><span>Reported<strong>{dateTime(report.createdAt)}</strong></span></div><div><Wrench size={16} /><span>Maintenance<strong>{report.assignedTo ? idOf(report.assignedTo) === user.id ? 'Assigned to you' : 'Technician assigned' : 'Awaiting assignment'}</strong></span></div><div><CheckCheck size={16} /><span>Last updated<strong>{dateTime(report.updatedAt)}</strong></span></div></section>{user.role === 'admin' && <Assignment key={`assign-${report.updatedAt}`} report={report} />}{canManage && <StatusControl key={`status-${report.status}`} report={report} />}<p className="detail-note">A little patience. A little teamwork.<br />A campus that keeps getting better. <span>✳</span></p></aside></div>{edit && <ReportForm report={report} onClose={() => setEdit(false)} />}{confirm && <Modal title="Remove this report?" onClose={() => { if (!busy) setConfirm(false) }}><p className="modal-intro">“{report.title}” and its attached photos will be permanently deleted.</p><div className="form-footer"><button className="btn secondary" disabled={busy} onClick={() => setConfirm(false)}>Keep report</button><button className="btn danger-btn" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete report'}<Trash2 size={15} /></button></div></Modal>}</>
}
function PlusIcon() { return <span>+</span> }
