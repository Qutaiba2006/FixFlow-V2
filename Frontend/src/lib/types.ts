export type Role = 'student' | 'technician' | 'admin'
export type Status = 'open' | 'in_progress' | 'resolved'
export interface User { id: string; name: string; email: string; role: Role }
export interface Person { _id: string; name?: string; email?: string }
export interface Location { _id: string; name: string; buildingCode?: string; building?: string; floor?: string; roomNumber?: string; mapCode?: string; codeType?: string; symbol?: string }
export interface Report {
  _id: string; title: string; description: string; location: Location | string; reportedBy: Person | string;
  supporters: string[]; affectedUsers: string[]; priorityScore: number; priority: 'low' | 'medium' | 'high';
  status: Status; assignedTo: Person | string | null; createdAt: string; updatedAt: string;
  images: { url: string; publicId: string }[];
  timeline: { action: 'created' | 'assigned' | 'status_changed'; performedBy: string; details: string; at: string }[];
}
export interface Summary { totalReports: number; openReports: number; inProgressReports: number; resolvedReports: number }
export const idOf = (value: Person | Location | string | null | undefined) => typeof value === 'string' ? value : value?._id
export const locationOf = (report: Report) => typeof report.location === 'object' ? report.location : undefined
export const statusLabel: Record<Status, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' }
