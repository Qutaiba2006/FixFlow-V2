import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Check, CircleAlert, LoaderCircle, Sprout, X } from 'lucide-react'
import type { Status } from '../lib/types'
import { statusLabel } from '../lib/types'
import { useApp } from '../lib/context'
export function Brand({ compact = false }: { compact?: boolean }) { return <div className="brand"><span className="brand-mark"><Sprout size={24} strokeWidth={2.2} /></span>{!compact && <span>fixflow<span className="brand-dot">.</span></span>}</div> }
export function Badge({ status }: { status: Status }) { return <span className={`badge ${status}`}><i />{statusLabel[status]}</span> }
export function Loading() { return <div className="loading" role="status"><LoaderCircle className="spin" size={24} /><span>Gathering the latest from campus…</span></div> }
export function Empty({ title = 'A little quiet here.', text = 'No reports match your filters. Try a different search.', action }: { title?: string; text?: string; action?: ReactNode }) { return <div className="empty"><span className="empty-icon"><Sprout size={30} /></span><h3>{title}</h3><p>{text}</p>{action}</div> }
export function ErrorState({ message }: { message: string }) { const { refresh } = useApp(); return <div className="error-state" role="alert"><CircleAlert size={24} /><h3>We couldn’t load this just yet.</h3><p>{message}</p><button className="btn secondary" onClick={refresh}>Try again</button></div> }
export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div> }
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closer = useRef(onClose)
  useEffect(() => { closer.current = onClose }, [onClose])
  useEffect(() => { const el = dialog.current!; const previous = document.activeElement as HTMLElement | null; el.showModal(); const cancel = (event: Event) => { event.preventDefault(); closer.current() }; el.addEventListener('cancel', cancel); return () => { el.removeEventListener('cancel', cancel); el.close(); previous?.focus() } }, [])
  return <dialog ref={dialog} className="modal" aria-labelledby="modal-title" onClick={e => { if (e.target === dialog.current) { const box = dialog.current!.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose() } }}><div className="modal-heading"><div><span className="eyebrow">A BETTER CAMPUS, TOGETHER</span><h2 id="modal-title">{title}</h2></div><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</dialog>
}
export function Stat({ label, value, note, color = 'green', icon }: { label: string; value: number | string; note: string; color?: string; icon?: ReactNode }) { return <div className={`stat ${color}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon || <ArrowUpRight size={17} />}</span></div><div className="stat-number">{value}</div><div className="stat-note"><Check size={12} />{note}</div></div> }
