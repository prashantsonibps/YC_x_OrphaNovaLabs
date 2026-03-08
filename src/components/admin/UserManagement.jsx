import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye, Shield, Mail, Calendar } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function UserManagement() {
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

  const loadUsers = async () => {
    try {
      const allUsers = await User.list('-created_date');
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await User.update(userId, { role: newRole });
      await loadUsers();
      alert('Role updated successfully!');
    } catch (error) {
      alert('Error updating role: ' + error.message);
    }
  };

  if (loading) {
    return <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`} />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{
                        backgroundImage: user.profile_picture ? `url(${user.profile_picture})` : undefined,
                        backgroundColor: user.profile_picture ? undefined : '#f97316',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!user.profile_picture && (user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U')}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {user.full_name || 'No name'}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {user.email}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Joined {new Date(user.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={user.role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}>
                      {user.role}
                    </Badge>
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className={`px-3 py-1 rounded border text-sm ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}