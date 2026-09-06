import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api, setApiUser, getApiUser } from '../services/api';
import { useToast } from './ToastContext';

const FALLBACK_USERS: User[] = [
  {
    id: 'teacher-1',
    email: 'teacher01@example.invalid',
    fullName: 'Giáo viên Mẫu 01',
    role: 'teacher',
    avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=teacher-01',
    school: 'Trường THPT Mẫu',
    subjectSpecialty: 'Toán học & Tin học',
    createdAt: '2024-09-01T00:00:00Z'
  },
  {
    id: 'student-1',
    email: 'student01@example.invalid',
    fullName: 'Học sinh Mẫu 01',
    role: 'student',
    avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=student-01',
    classId: 'class-1',
    className: 'Lớp mẫu A',
    school: 'Trường THPT Mẫu',
    createdAt: '2024-09-05T00:00:00Z'
  },
  {
    id: 'admin-1',
    email: 'admin@example.invalid',
    fullName: 'Quản trị viên Mẫu',
    role: 'admin',
    avatar: 'https://api.dicebear.com/9.x/shapes/svg?seed=admin-01',
    school: 'Đơn vị Giáo dục Mẫu',
    createdAt: '2024-08-01T00:00:00Z'
  }
];

interface AuthContextType {
  user: User | null;
  role: UserRole;
  usersList: User[];
  isLoading: boolean;
  isOffline: boolean;
  switchUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>(FALLBACK_USERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const { addToast } = useToast();

  const loadCurrentUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Timeout promise to avoid hanging forever on slow networks or cold starts
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 10000)
      );

      const fetchPromise = Promise.all([
        api.getMe(),
        api.getUsers().catch(() => [])
      ]);

      const [currentUser, allUsers] = await Promise.race([fetchPromise, timeoutPromise]);
      setUser(currentUser);
      const mergedUsers = new Map(FALLBACK_USERS.map(item => [item.id, item]));
      for (const item of allUsers || []) mergedUsers.set(item.id, item);
      setUsersList([...mergedUsers.values()]);
      setApiUser(currentUser.id);
      setIsOffline(false);
    } catch (err: any) {
      console.warn('API fetch delayed or unavailable, activating offline pedagogical fallback:', err);
      const savedId = getApiUser();
      const fallbackUser = FALLBACK_USERS.find(u => u.id === savedId) || FALLBACK_USERS[0];
      setUser(fallbackUser);
      setUsersList(FALLBACK_USERS);
      setApiUser(fallbackUser.id);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUserData();
  }, [loadCurrentUserData]);

  const switchUser = async (userId: string) => {
    try {
      setApiUser(userId);
      let updatedUser: User;
      try {
        updatedUser = await api.getMe();
        setIsOffline(false);
      } catch {
        updatedUser = usersList.find(u => u.id === userId) || FALLBACK_USERS.find(u => u.id === userId) || FALLBACK_USERS[0];
        setIsOffline(true);
      }
      setUser(updatedUser);
      addToast(
        'Đã chuyển đổi tài khoản',
        `Hiện đang đăng nhập với vai trò: ${updatedUser.role === 'teacher' ? 'Giáo viên' : updatedUser.role === 'admin' ? 'Quản trị viên' : 'Học sinh'} (${updatedUser.fullName})`,
        'success'
      );
    } catch (err: any) {
      addToast('Lỗi chuyển tài khoản', err.message, 'error');
    }
  };

  const refreshUsers = async () => {
    try {
      const users = await api.getUsers();
      if (users && users.length > 0) {
        setUsersList(users);
      }
    } catch (err) {
      console.warn('Cannot refresh users:', err);
    }
  };

  const role: UserRole = user?.role || 'teacher';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        usersList,
        isLoading,
        isOffline,
        switchUser,
        refreshUsers,
        isTeacher,
        isStudent,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
