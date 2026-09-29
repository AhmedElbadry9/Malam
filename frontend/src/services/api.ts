import type { Client, Department, TeamMember, SystemKPIs, NewClientPayload, TaskStage, ClientGroupHierarchy, PendingReviewItem, ClientBriefSheetData, AuditLog } from '../types';

const envApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/+$/, '')}/api` : '/api';



export interface AuthResponseData {
  user_type: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin';
  member?: TeamMember;
  message: string;
}

export async function parseApiError(res: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const first = data.detail[0];
      return first.msg || defaultMsg;
    }
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    return defaultMsg;
  } catch {
    return defaultMsg;
  }
}

export async function loginUser(username: string, password: string, retries = 2): Promise<AuthResponseData> {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });

      if (!res.ok) {
        // If 401 Unauthorized or 403 Forbidden, it's an intentional credentials error -> throw immediately
        if (res.status === 401 || res.status === 403) {
          const msg = await parseApiError(res, 'اسم المستخدم أو كلمة المرور غير صحيحة');
          throw new Error(msg);
        }
        // If proxy or server cold-start error, and retries are left, wait 200ms and retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        const msg = await parseApiError(res, 'فشل تسجيل الدخول، يرجى المحاولة مرة أخرى');
        throw new Error(msg);
      }

      return await res.json();
    } catch (err: any) {
      if (err.message && (err.message.includes('غير صحيحة') || err.message.includes('تعطيل'))) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      throw new Error(err.message || 'فشل الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    }
  }

  throw new Error('فشل تسجيل الدخول');
}

export async function fetchDepartments(): Promise<Department[]> {
  try {
    const res = await fetch(`${API_BASE}/departments`);
    if (!res.ok) throw new Error('فشل جلب الأقسام');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchMembers(departmentId?: number): Promise<TeamMember[]> {
  try {
    const url = departmentId ? `${API_BASE}/members?department_id=${departmentId}` : `${API_BASE}/members`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب الموظفين');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function createTeamMember(memberData: any): Promise<TeamMember> {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل إنشاء الحساب' }));
    throw new Error(errData.detail || 'فشل إنشاء الحساب');
  }

  return await res.json();
}

export async function updateMember(memberId: number, memberData: any): Promise<TeamMember> {
  const res = await fetch(`${API_BASE}/members/${memberId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberData)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل تحديث الموظف' }));
    throw new Error(errData.detail || 'فشل تحديث الموظف');
  }

  return await res.json();
}

export async function changeUserPassword(memberId: number, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${memberId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_password: newPassword })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل تغيير كلمة المرور' }));
    throw new Error(errData.detail || 'فشل تغيير كلمة المرور');
  }
}

export async function deleteTeamMember(memberId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${memberId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل حذف الموظف' }));
    throw new Error(errData.detail || 'فشل حذف الموظف');
  }
}

export async function toggleMemberActive(memberId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${memberId}/toggle-active`, {
    method: 'PUT'
  });

  if (!res.ok) {
    throw new Error('فشل تغيير حالة الحساب');
  }
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const res = await fetch(`${API_BASE}/clients`);
    if (!res.ok) throw new Error('فشل جلب قائمة العملاء');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchClientsHierarchy(search?: string): Promise<ClientGroupHierarchy[]> {
  try {
    const url = search ? `${API_BASE}/clients/hierarchy?search=${encodeURIComponent(search)}` : `${API_BASE}/clients/hierarchy`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('فشل جلب الشجرة الهرمية للعملاء والشركات');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function createClientIntake(payload: NewClientPayload & { drive_folder_url?: string }): Promise<Client> {
  try {
    const res = await fetch(`${API_BASE}/clients/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('فشل تسجيل العميل وتوليد مجلد Google Drive');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function updateClient(clientId: number, clientData: any): Promise<Client> {
  const res = await fetch(`${API_BASE}/clients/${clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل تحديث العميل' }));
    throw new Error(errData.detail || 'فشل تحديث العميل');
  }

  return await res.json();
}

export async function deleteClient(clientId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/clients/${clientId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل حذف العميل والمشروع' }));
    throw new Error(errData.detail || 'فشل حذف العميل والمشروع');
  }
}

export async function addClientAssignment(clientId: number, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل إسناد المهمة' }));
    throw new Error(errData.detail || 'فشل إسناد المهمة');
  }

  return await res.json();
}

export async function updateClientAssignment(clientId: number, stageId: number, data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/assignments/${stageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل تحديث الإسناد' }));
    throw new Error(errData.detail || 'فشل تحديث الإسناد');
  }

  return await res.json();
}

export async function deleteClientAssignment(clientId: number, stageId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/assignments/${stageId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل حذف الإسناد' }));
    throw new Error(errData.detail || 'فشل حذف الإسناد');
  }
}

export async function submitTaskForReview(
  stageId: number,
  memberId: number,
  note?: string,
  url?: string
): Promise<TaskStage> {
  try {
    const res = await fetch(`${API_BASE}/tasks/submit-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: stageId,
        member_id: memberId,
        deliverable_note: note,
        deliverable_url: url
      }),
    });
    if (!res.ok) throw new Error('فشل تسليم المهمة للمراجعة');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function reviewTaskStage(
  stageId: number,
  reviewerId: number,
  action: 'approve' | 'request_revision',
  notes?: string
): Promise<TaskStage> {
  try {
    const res = await fetch(`${API_BASE}/tasks/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: stageId,
        reviewer_id: reviewerId,
        action,
        notes
      }),
    });
    if (!res.ok) throw new Error(action === 'approve' ? 'فشل اعتماد المهمة' : 'فشل إرسال طلب التعديل');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchPendingReviews(): Promise<PendingReviewItem[]> {
  try {
    const res = await fetch(`${API_BASE}/tasks/pending-reviews`);
    if (!res.ok) throw new Error('فشل جلب قائمة المهام المعلقة للاعتماد');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function completeTaskStage(stageId: number, memberId: number, note?: string, url?: string): Promise<TaskStage> {
  try {
    const res = await fetch(`${API_BASE}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_id: stageId,
        member_id: memberId,
        deliverable_note: note,
        deliverable_url: url
      }),
    });
    if (!res.ok) throw new Error('فشل إتمام المهمة');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchTaskHistory(stageId: number): Promise<AuditLog[]> {
  try {
    const res = await fetch(`${API_BASE}/tasks/${stageId}/history`);
    if (!res.ok) throw new Error('فشل جلب سجل دورة وتتبع المهمة');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchSystemKPIs(): Promise<SystemKPIs> {
  try {
    const res = await fetch(`${API_BASE}/stats/kpis`);
    if (!res.ok) throw new Error('فشل جلب إحصائيات النظام');
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function resetSystemData(): Promise<void> {
  try {
    await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
  } catch (err) {
    console.error(err);
  }
}

// ----------------- DEPARTMENT MANAGEMENT (Super Admin) ----------------- //

export async function createDepartment(data: {
  name_ar: string;
  name_en: string;
  code: string;
  icon?: string;
  color?: string;
  description?: string;
  roles?: string[];
  services?: string[];
}): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل إنشاء القسم' }));
    throw new Error(errData.detail || 'فشل إنشاء القسم');
  }

  return await res.json();
}

export async function updateDepartment(departmentId: number, data: {
  name_ar?: string;
  name_en?: string;
  code?: string;
  icon?: string;
  color?: string;
  description?: string;
  roles?: string[];
  services?: string[];
}): Promise<Department> {
  const res = await fetch(`${API_BASE}/departments/${departmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل تعديل القسم' }));
    throw new Error(errData.detail || 'فشل تعديل القسم');
  }

  return await res.json();
}

export async function deleteDepartment(departmentId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/departments/${departmentId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل حذف القسم' }));
    throw new Error(errData.detail || 'فشل حذف القسم');
  }
}

export async function shareClientDrive(
  clientId: number,
  email: string,
  role: 'reader' | 'writer',
  folderId?: string,
  folderType?: 'root' | 'client_uploads' | 'team_deliverables'
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/share-drive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role, folder_id: folderId, folder_type: folderType || 'root' }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشلت عملية مشاركة المجلد' }));
    throw new Error(errData.detail || 'فشلت عملية مشاركة المجلد');
  }

  return await res.json();
}

export interface DrivePermission {
  id: string;
  role: string;
  type: string;
  emailAddress?: string;
  displayName?: string;
}

export async function fetchClientDrivePermissions(clientId: number, folderId?: string): Promise<DrivePermission[]> {
  const url = folderId 
    ? `${API_BASE}/clients/${clientId}/drive-permissions?folder_id=${encodeURIComponent(folderId)}`
    : `${API_BASE}/clients/${clientId}/drive-permissions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('فشل جلب قائمة صلاحيات درايف');
  return await res.json();
}

export async function updateClientDrivePermission(
  clientId: number,
  permissionId: string,
  role: 'reader' | 'writer',
  folderId?: string,
  folderType?: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/drive-permissions/${permissionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, folder_id: folderId, folder_type: folderType }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل تعديل الصلاحية' }));
    throw new Error(errData.detail || 'فشل تعديل الصلاحية');
  }

  return await res.json();
}

export async function updateClientDriveUrl(clientId: number, driveFolderUrl: string): Promise<Client> {
  const res = await fetch(`${API_BASE}/clients/${clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drive_folder_url: driveFolderUrl })
  });

  if (!res.ok) {
    const errorMsg = await parseApiError(res, 'فشل تحديث رابط المجلد');
    throw new Error(errorMsg);
  }

  return await res.json();
}

export async function deleteClientDrivePermission(
  clientId: number,
  permissionId: string,
  folderId?: string
): Promise<{ success: boolean; message: string }> {
  const url = folderId 
    ? `${API_BASE}/clients/${clientId}/drive-permissions/${permissionId}?folder_id=${encodeURIComponent(folderId)}`
    : `${API_BASE}/clients/${clientId}/drive-permissions/${permissionId}`;
  const res = await fetch(url, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'فشل إلغاء الصلاحية' }));
    throw new Error(errData.detail || 'فشل إلغاء الصلاحية');
  }

  return await res.json();
}

export async function fetchClientBriefSheet(clientId: number): Promise<ClientBriefSheetData> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/brief-sheet`);
  if (!res.ok) {
    const errorMsg = await parseApiError(res, 'فشل جلب شيت بيانات واستراتيجية العميل');
    throw new Error(errorMsg);
  }
  return await res.json();
}

export async function updateClientBriefSheet(
  clientId: number,
  payload: Record<string, string>
): Promise<ClientBriefSheetData> {
  const res = await fetch(`${API_BASE}/clients/${clientId}/brief-sheet`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorMsg = await parseApiError(res, 'فشل تحديث شيت بيانات العميل');
    throw new Error(errorMsg);
  }
  return await res.json();
}

export interface CheckDriveFolderResult {
  exists: boolean;
  folder_id?: string;
  folder_name?: string;
  folder_url?: string;
}

export async function checkDriveFolder(name: string): Promise<CheckDriveFolderResult> {
  if (!name || !name.trim()) {
    return { exists: false };
  }
  try {
    const res = await fetch(`${API_BASE}/clients/check-drive-folder?${new URLSearchParams({ name: name.trim() })}`);
    if (!res.ok) {
      return { exists: false };
    }
    return await res.json();
  } catch {
    return { exists: false };
  }
}




