import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { HeadWorkspace } from './components/HeadWorkspace';
import { EmployeeWorkspace } from './components/EmployeeWorkspace';
import { TeamManagement } from './components/TeamManagement';
import { DepartmentManagement } from './components/DepartmentManagement';
import { LoginScreen } from './components/LoginScreen';
import { NewClientModal } from './components/NewClientModal';
import { DriveFolderModal } from './components/DriveFolderModal';
import { ClientBriefSheetModal } from './components/ClientBriefSheetModal';
import { TaskHistoryModal } from './components/TaskHistoryModal';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  fetchClients, fetchDepartments, fetchMembers, fetchSystemKPIs, 
  createClientIntake, updateClient, deleteClient, addClientAssignment, updateClientAssignment, deleteClientAssignment,
  submitTaskForReview, reviewTaskStage, resetSystemData, loginUser,
  createTeamMember, updateMember, deleteTeamMember, changeUserPassword, toggleMemberActive,
  createDepartment, updateDepartment, deleteDepartment
} from './services/api';
import type { Client, Department, TeamMember, SystemKPIs, NewClientPayload, TaskStage } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/Button';

function MainApp() {
  const [currentUser, setCurrentUser] = useState<{ type: 'admin' | 'manager' | 'head' | 'employee' | 'super_admin'; member?: TeamMember } | null>(() => {
    const saved = localStorage.getItem('agency_user_auth_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'dispatch' | 'team' | 'departments'>('dispatch');

  const [clients, setClients] = useState<Client[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [kpis, setKpis] = useState<SystemKPIs | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState<boolean>(false);
  const [prefilledClientName, setPrefilledClientName] = useState<string | undefined>(undefined);
  const [selectedDriveClient, setSelectedDriveClient] = useState<Client | null>(null);
  const [selectedBriefClient, setSelectedBriefClient] = useState<Client | null>(null);
  const [selectedHistoryStage, setSelectedHistoryStage] = useState<{ stage: TaskStage; client?: Client } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [depsData, membersData, clientsData, kpisData] = await Promise.all([
        fetchDepartments(),
        fetchMembers(),
        fetchClients(),
        fetchSystemKPIs()
      ]);
      setDepartments(depsData);
      setMembers(membersData);
      setClients(clientsData);
      setKpis(kpisData);

      setCurrentUser(prev => {
        if (!prev) return null;
        if (prev.member) {
          const found = membersData.find(m => m.id === prev.member?.id);
          if (found) return { ...prev, member: found };
        } else if (prev.type === 'admin' || prev.type === 'super_admin') {
          const adminMem = membersData.find(m => m.role_type === 'admin' || m.role_type === 'super_admin');
          if (adminMem) return { ...prev, member: adminMem };
        }
        return prev;
      });
    } catch (err: any) {
      console.error(err);
      setError('تعذر الاتصال بالخادم. يرجى التأكد من تشغيل السيرفر والمحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchClients().then((cs) => {
          setClients(cs);
          setError(null);
        }).catch(() => {});
        fetchSystemKPIs().then(setKpis).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSubmit = async (username: string, password: string) => {
    const res = await loginUser(username, password);
    const authObj = {
      type: res.user_type,
      member: res.member
    };
    
    localStorage.setItem('agency_user_auth_v2', JSON.stringify(authObj));
    loadData();
    return { user_type: res.user_type, member: res.member };
  };

  const handleLogout = () => {
    localStorage.removeItem('agency_user_auth_v2');
    setCurrentUser(null);
  };

  // Team Member Operations
  const handleAddMember = async (memberData: any) => {
    await createTeamMember(memberData);
    await loadData();
  };

  const handleUpdateMember = async (memberId: number, memberData: any) => {
    await updateMember(memberId, memberData);
    await loadData();
  };

  const handleDeleteMember = async (memberId: number) => {
    await deleteTeamMember(memberId);
    await loadData();
  };

  const handleChangePassword = async (memberId: number, newPassword: string) => {
    await changeUserPassword(memberId, newPassword);
    await loadData();
  };

  const handleToggleActive = async (memberId: number) => {
    await toggleMemberActive(memberId);
    await loadData();
  };

  // Department Operations
  const handleCreateDepartment = async (data: any) => {
    await createDepartment(data);
    await loadData();
  };

  const handleUpdateDepartment = async (departmentId: number, data: any) => {
    await updateDepartment(departmentId, data);
    await loadData();
  };

  const handleDeleteDepartment = async (departmentId: number) => {
    await deleteDepartment(departmentId);
    await loadData();
  };

  const handleCreateIntake = async (payload: NewClientPayload & { drive_folder_url?: string }) => {
    await createClientIntake(payload);
    await loadData();
  };

  const handleUpdateClient = async (clientId: number, data: any) => {
    await updateClient(clientId, data);
    await loadData();
  };

  const handleDeleteClient = async (clientId: number) => {
    await deleteClient(clientId);
    await loadData();
  };

  const handleAddAssignment = async (clientId: number, data: any) => {
    await addClientAssignment(clientId, data);
    await loadData();
  };

  const handleUpdateAssignment = async (clientId: number, stageId: number, data: any) => {
    await updateClientAssignment(clientId, stageId, data);
    await loadData();
  };

  const handleDeleteAssignment = async (clientId: number, stageId: number) => {
    await deleteClientAssignment(clientId, stageId);
    await loadData();
  };

  const handleSubmitForReview = async (stageId: number, note?: string, url?: string) => {
    if (currentUser?.member) {
      await submitTaskForReview(stageId, currentUser.member.id, note, url);
      await loadData();
    }
  };

  const handleReviewTaskStage = async (stageId: number, action: 'approve' | 'request_revision', notes?: string) => {
    if (currentUser?.member) {
      await reviewTaskStage(stageId, currentUser.member.id, action, notes);
      await loadData();
    }
  };

  const handleResetData = async () => {
    if (window.confirm('هل أنت متأكد من إعادة ضبط البيانات؟')) {
      await resetSystemData();
      await loadData();
    }
  };

  const isAdmin = currentUser?.type === 'admin' || currentUser?.type === 'super_admin';
  const isManager = currentUser?.type === 'manager';
  const isHead = currentUser?.type === 'head';
  const isManagement = isAdmin || isManager;

  const pendingReviewsCount = useMemo(() => {
    if (!currentUser) return 0;

    if (isHead && currentUser.member) {
      const hId = currentUser.member.id;
      const deptIds = [currentUser.member.department_id, ...(currentUser.member.department_ids || [])].filter(Boolean);
      let count = 0;
      clients.forEach(c => {
        c.stages?.forEach(s => {
          if (s.status === 'under_review') {
            const inDept = deptIds.length === 0 || deptIds.includes(s.department_id);
            const isAssignedToHead = s.assigned_member_id === hId;
            const assigner = s.assigned_by || members.find(m => m.id === s.assigned_by_id);
            const isAssignedByManagement = assigner && (assigner.role_type === 'admin' || assigner.role_type === 'manager' || assigner.role_type === 'super_admin');
            const isDirectManagement = isAssignedByManagement && s.assigned_by_id !== hId;
            
            if (inDept && !isAssignedToHead && !isDirectManagement) {
              count++;
            }
          }
        });
      });
      return count;
    }

    if (isManagement) {
      let count = 0;
      clients.forEach(c => {
        c.stages?.forEach(s => {
          if (s.status === 'under_review') {
            const assigner = s.assigned_by || members.find(m => m.id === s.assigned_by_id);
            const assignerRole = assigner?.role || '';
            const isAssignedByHead = assigner && (
              assigner.role_type === 'head' || 
              assignerRole.toLowerCase().includes('head') || 
              assignerRole.includes('رئيس')
            );
            const deptHead = members.find(m => {
              const mRole = m.role || '';
              return (m.role_type === 'head' || mRole.toLowerCase().includes('head') || mRole.includes('رئيس')) &&
                (m.department_id === s.department_id || (m.department_ids && m.department_ids.includes(s.department_id)));
            });
            const isSubmittedByHead = deptHead && s.assigned_member_id === deptHead.id;
            
            if (!isAssignedByHead || isSubmittedByHead || !deptHead) {
              count++;
            }
          }
        });
      });
      return count;
    }

    return 0;
  }, [clients, members, currentUser, isHead, isManagement]);

  // 1. Render Login Screen if unauthenticated
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSubmit={handleLoginSubmit}
        onLoginSuccess={(user_type, member) => {
          setCurrentUser({ type: user_type, member });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 font-sans pb-16 selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser as any}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onOpenNewClientModal={() => setIsNewClientModalOpen(true)}
        onResetData={handleResetData}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main Workspace Content */}
      <main className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        
        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadData}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && clients.length === 0 ? (
          <div className="space-y-4 py-8 animate-fadeIn">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-slate-900 border border-slate-800 skeleton-shimmer" />
              ))}
            </div>
            <div className="h-48 rounded-2xl bg-slate-900 border border-slate-800 skeleton-shimmer" />
            <div className="h-96 rounded-2xl bg-slate-900 border border-slate-800 skeleton-shimmer" />
          </div>
        ) : (
          <>
            {/* Admin & Manager Dashboard */}
            {isManagement && (
              <>
                {activeTab === 'dispatch' ? (
                  <AdminDashboard
                    clients={clients}
                    departments={departments}
                    members={members}
                    kpis={kpis}
                    onOpenDriveModal={setSelectedDriveClient}
                    onOpenBriefModal={setSelectedBriefClient}
                    onOpenNewClientModal={(clientName?: string) => {
                      setPrefilledClientName(clientName);
                      setIsNewClientModalOpen(true);
                    }}
                    onUpdateClient={handleUpdateClient}
                    onDeleteClient={handleDeleteClient}
                    onAddAssignment={handleAddAssignment}
                    onUpdateAssignment={handleUpdateAssignment}
                    onDeleteAssignment={handleDeleteAssignment}
                    onReviewTaskStage={handleReviewTaskStage}
                    onOpenHistoryModal={(stage, client) => setSelectedHistoryStage({ stage, client })}
                  />
                ) : activeTab === 'team' ? (
                  <TeamManagement
                    members={members}
                    departments={departments}
                    currentUserRole={currentUser.type}
                    onAddMember={handleAddMember}
                    onUpdateMember={handleUpdateMember}
                    onDeleteMember={handleDeleteMember}
                    onChangePassword={handleChangePassword}
                    onToggleActive={handleToggleActive}
                  />
                ) : activeTab === 'departments' && isAdmin ? (
                  <DepartmentManagement
                    departments={departments}
                    onCreateDepartment={handleCreateDepartment}
                    onUpdateDepartment={handleUpdateDepartment}
                    onDeleteDepartment={handleDeleteDepartment}
                  />
                ) : null}
              </>
            )}

            {/* Department Head Workspace */}
            {isHead && currentUser.member && (
              <HeadWorkspace
                currentMember={currentUser.member}
                clients={clients}
                departments={departments}
                members={members}
                onUpdateAssignment={handleUpdateAssignment}
                onReviewTaskStage={handleReviewTaskStage}
                onSubmitForReview={handleSubmitForReview}
                onOpenDriveModal={setSelectedDriveClient}
                onOpenBriefModal={setSelectedBriefClient}
                onOpenHistoryModal={(stage, client) => setSelectedHistoryStage({ stage, client })}
              />
            )}

            {/* Employee Workspace */}
            {currentUser.type === 'employee' && currentUser.member && (
              <EmployeeWorkspace
                currentMember={currentUser.member}
                clients={clients}
                onSubmitForReview={handleSubmitForReview}
                onOpenDriveModal={setSelectedDriveClient}
                onOpenBriefModal={setSelectedBriefClient}
                onOpenHistoryModal={(stage, client) => setSelectedHistoryStage({ stage, client })}
              />
            )}
          </>
        )}

      </main>

      {/* New Client Stepped Intake Modal */}
      {isNewClientModalOpen && (
        <NewClientModal
          departments={departments}
          members={members}
          initialClientName={prefilledClientName}
          existingClients={clients}
          onClose={() => {
            setIsNewClientModalOpen(false);
            setPrefilledClientName(undefined);
          }}
          onSubmitIntake={handleCreateIntake}
        />
      )}

      {/* Google Drive Folder Explorer Modal */}
      {selectedDriveClient && (
        <DriveFolderModal
          client={selectedDriveClient}
          onClose={() => setSelectedDriveClient(null)}
          onOpenBriefModal={setSelectedBriefClient}
        />
      )}

      {/* Client Brief & Strategy Sheet Modal (11 Columns) */}
      {selectedBriefClient && (
        <ClientBriefSheetModal
          client={selectedBriefClient}
          onClose={() => setSelectedBriefClient(null)}
        />
      )}

      {/* Task Stage Lifecycle & Assignment History Timeline Modal */}
      {selectedHistoryStage && (
        <TaskHistoryModal
          stage={selectedHistoryStage.stage}
          client={selectedHistoryStage.client}
          onClose={() => setSelectedHistoryStage(null)}
        />
      )}

    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
