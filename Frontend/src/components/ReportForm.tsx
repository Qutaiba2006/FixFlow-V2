import { useState } from 'react'
import type { FormEvent } from 'react'
import { ImagePlus, LoaderCircle, MapPin, Send, X } from 'lucide-react'
import { useApp } from '../lib/context'
import { useResource } from '../lib/useResource'
import type { Location, Report } from '../lib/types'
import { idOf } from '../lib/types'
import { ErrorState, Modal } from './ui'
import { validateImages } from '../lib/utils'
export default function ReportForm({ onClose, report }: { onClose: () => void; report?: Report }) {
  const { api, notify, refresh } = useApp()
  const { data: locations, error: locationError, loading } = useResource<Location[]>('/locations')
  const [title, setTitle] = useState(report?.title || '')
  const [description, setDescription] = useState(report?.description || '')
  const [location, setLocation] = useState(idOf(report?.location) || '')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (title.trim().length < 5 || description.trim().length < 10) { setError('Add a title of at least 5 characters and a description of at least 10 characters.'); return }
    setBusy(true)
    try {
      const result = await api<{ report: Report }>(report ? `/reports/${report._id}` : '/reports', report ? 'PATCH' : 'POST', { title: title.trim(), description: description.trim(), ...(!report ? { location } : {}) })
      if (files.length) {
        try { const form = new FormData(); files.forEach(file => form.append('images', file)); await api(`/reports/${result.report._id}/images`, 'POST', form) }
        catch (err) { notify(`Report saved, but photos were not uploaded. ${(err as Error).message} You can retry from report details.`, true); refresh(); onClose(); return }
      }
      notify(report ? 'Your report has been updated.' : 'Report submitted. Thanks for looking out for campus!'); refresh(); onClose()
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  return <Modal title={report ? 'A little more detail.' : 'What needs a little care?'} onClose={() => { if (!busy) onClose() }}><p className="modal-intro">The more we know, the sooner we can help. Every report makes a difference.</p><form onSubmit={submit} className="form-stack"><label>Give it a title<input required minLength={5} maxLength={180} placeholder="e.g. Broken light in the library study area" value={title} onChange={e => setTitle(e.target.value)} /></label><label>Tell us what’s happening<textarea required minLength={10} maxLength={5000} rows={4} placeholder="What did you notice? Add details that could help the maintenance team." value={description} onChange={e => setDescription(e.target.value)} /></label>{!report && <label><span><MapPin size={15} />Where is it?</span><select value={location} onChange={e => setLocation(e.target.value)} required disabled={loading}><option value="">{loading ? 'Loading campus locations…' : 'Choose a campus location'}</option>{locations?.map(item => <option key={item._id} value={item._id}>{item.name}{item.buildingCode ? ` · ${item.buildingCode}` : ''}{item.floor ? ` / ${item.floor}` : ''}</option>)}</select></label>}{locationError && <ErrorState message={locationError} />}{!report && !loading && !locationError && !locations?.length && <p className="form-error">No locations yet. An admin needs to add one before you can submit a report.</p>}{!report && <div><label className="upload-area"><ImagePlus size={23} /><strong>Add a little context</strong><span>Up to 2 photos · JPEG, PNG, WebP · 5 MB each</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Attach report photos" onChange={e => { const selected = Array.from(e.target.files || []); const message = validateImages(selected); setError(message); if (!message) setFiles(selected); e.target.value = '' }} /></label>{files.map((file, i) => <div className="file-chip" key={i}><ImagePlus size={14} /><span>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, index) => index !== i))}><X size={14} /></button></div>)}</div>}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-footer"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy || (!report && (!locations?.length || loading))}>{busy ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}{busy ? 'Saving…' : report ? 'Save changes' : 'Submit report'}</button></div></form></Modal>
}
