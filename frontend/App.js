import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';

// API Base URL (Backend runs on port 5000)
const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  // Navigation State: 'login' | 'dashboard'
  const [currentScreen, setCurrentScreen] = useState('login');
  const [authToken, setAuthToken] = useState(null);

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard States
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Employee Form States
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Employee Modal States
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Phase 2: K-Means Salary Analytics States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [clusters, setClusters] = useState(null);

  // Load employees when entering Dashboard
  useEffect(() => {
    if (currentScreen === 'dashboard') {
      fetchEmployees();
    }
  }, [currentScreen]);

  // ==========================================
  // 1. Authentication (Login)
  // ==========================================
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showAlert('Login Error', 'Please enter both username and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAuthToken(data.token);
        setCurrentScreen('dashboard');
        setUsername('');
        setPassword('');
      } else {
        showAlert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login request error:', error);
      showAlert('Connection Error', 'Cannot connect to backend server. Make sure it is running on port 5000.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setClusters(null);
    setCurrentScreen('login');
  };

  // ==========================================
  // 2. Fetch Employee Records (Read & Search)
  // ==========================================
  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmployees(data);
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
      showAlert('Error', 'Failed to fetch employee records.');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Filtered employees for instant client-side search
  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.position && emp.position.toLowerCase().includes(q)) ||
      (emp.status && emp.status.toLowerCase().includes(q)) ||
      String(emp.salary).includes(q)
    );
  });

  // ==========================================
  // 3. Add Employee (Create)
  // ==========================================
  const handleAddEmployee = async () => {
    if (!newName.trim() || !newPosition.trim() || !newSalary.trim()) {
      showAlert('Validation Error', 'All fields (Name, Position, Salary) are required!');
      return;
    }

    const numericSalary = Number(newSalary.trim());
    if (isNaN(numericSalary) || numericSalary <= 0) {
      showAlert('Validation Error', 'Salary must be a positive number.');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          position: newPosition.trim(),
          salary: numericSalary
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewName('');
        setNewPosition('');
        setNewSalary('');
        fetchEmployees();
        showAlert('Success', 'Employee added successfully!');
      } else {
        showAlert('Failed to Add', data.error || 'Server rejected the request.');
      }
    } catch (error) {
      console.error('Add employee error:', error);
      showAlert('Error', 'Network error while adding employee.');
    } finally {
      setIsAdding(false);
    }
  };

  // ==========================================
  // 4. Edit Employee (Update)
  // ==========================================
  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEditName(emp.name || '');
    setEditPosition(emp.position || '');
    setEditSalary(String(emp.salary || ''));
    setEditStatus(emp.status || 'Active');
  };

  const closeEditModal = () => {
    setEditingEmployee(null);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editPosition.trim() || !editSalary.trim()) {
      showAlert('Validation Error', 'All fields (Name, Position, Salary) are required!');
      return;
    }

    const numericSalary = Number(editSalary.trim());
    if (isNaN(numericSalary) || numericSalary <= 0) {
      showAlert('Validation Error', 'Salary must be a positive number.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          position: editPosition.trim(),
          salary: numericSalary,
          status: editStatus
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmployees(prev =>
          prev.map(emp => (emp.id === editingEmployee.id ? data.employee : emp))
        );
        closeEditModal();
        showAlert('Success', 'Employee updated successfully!');
      } else {
        showAlert('Error', data.error || 'Failed to update employee.');
      }
    } catch (error) {
      console.error('Save edit error:', error);
      showAlert('Error', 'Network error while updating employee.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ==========================================
  // 5. Toggle Status (Update Status)
  // ==========================================
  const handleToggleStatus = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}/status`, {
        method: 'PUT'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setEmployees(prev =>
          prev.map(emp => (emp.id === id ? data.employee : emp))
        );
      } else {
        showAlert('Error', data.error || 'Failed to toggle status.');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showAlert('Error', 'Network error while toggling status.');
    }
  };

  // ==========================================
  // 6. Delete Employee with Confirmation Alert
  // ==========================================
  const confirmDelete = (id, name) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete ${name}?`);
      if (confirmed) {
        executeDelete(id);
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete ${name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => executeDelete(id) }
        ]
      );
    }
  };

  const executeDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        showAlert('Success', 'Employee deleted successfully.');
      } else {
        showAlert('Error', data.error || 'Failed to delete employee.');
      }
    } catch (error) {
      console.error('Delete employee error:', error);
      showAlert('Error', 'Network error while deleting employee.');
    }
  };

  // ==========================================
  // 7. Phase 2: K-Means Salary Analytics
  // ==========================================
  const handleAnalyzeSalary = async () => {
    setIsAnalyzing(true);
    setClusters(null);
    try {
      const response = await fetch(`${API_BASE_URL}/employees/salary-clusters`);
      const data = await response.json();

      if (response.ok && data.success) {
        setClusters(data.clusters);
      } else {
        showAlert('Analysis Failed', data.error || 'Failed to compute salary clusters.');
      }
    } catch (error) {
      console.error('Salary clustering error:', error);
      showAlert('Error', 'Network error while analyzing salary structure.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper alert
  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Format currency
  const formatMoney = (val) => {
    const num = Number(val);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  // ==========================================
  // RENDER: Login Screen
  // ==========================================
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <Text style={styles.loginBadge}>HR MANAGER</Text>
          <Text style={styles.loginTitle}>System Login</Text>
          <Text style={styles.loginSubtitle}>
            Final Exam: Internet Programming (2026)
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>USERNAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. admin"
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. password123"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoggingIn && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              💡 <Text style={{ fontWeight: 'bold' }}>Credentials:</Text> admin / password123
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER: Dashboard Screen (CRUD & Analytics)
  // ==========================================
  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <StatusBar barStyle="light-content" />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>HR Manager & Salary Analytics</Text>
          <Text style={styles.headerSubtitle}>
            👤 Nichakamon | Student ID: 6730202173
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Phase 2: Salary Clustering Analytics Section */}
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📊 Phase 2: Salary Clustering (K-Means)</Text>
            <TouchableOpacity
              style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
              onPress={handleAnalyzeSalary}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.analyzeButtonText}>Computing...</Text>
                </View>
              ) : (
                <Text style={styles.analyzeButtonText}>⚡ Analyze Salary Structure</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Summary Cards */}
          {clusters && (
            <View style={styles.clustersRow}>
              {clusters.map((tier, idx) => (
                <View key={idx} style={styles.clusterCard}>
                  <Text style={styles.clusterTierName}>{tier.group}</Text>
                  <Text style={styles.clusterCentroid}>
                    ฿{formatMoney(tier.centroid)}
                  </Text>
                  <Text style={styles.clusterSubtitle}>Average Base Salary</Text>
                  <View style={styles.clusterBadge}>
                    <Text style={styles.clusterBadgeText}>
                      👥 {tier.count} Employee{tier.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Phase 1: Add Employee Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>➕ Add New Employee (เพิ่มพนักงาน)</Text>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>NAME</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>POSITION</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Position / Role"
                placeholderTextColor="#94a3b8"
                value={newPosition}
                onChangeText={setNewPosition}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>SALARY (฿)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 45000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={newSalary}
                onChangeText={setNewSalary}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addEmployeeButton, isAdding && styles.buttonDisabled]}
            onPress={handleAddEmployee}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.addEmployeeButtonText}>＋ Add Employee</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Phase 1: Employee Directory with Search Bar (ค้นหา) */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              👥 Employee Directory ({filteredEmployees.length}/{employees.length})
            </Text>
            <TouchableOpacity onPress={fetchEmployees}>
              <Text style={styles.refreshLink}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar Input */}
          <View style={styles.searchBarContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, position, status, or salary..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoadingEmployees ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 30 }} />
          ) : filteredEmployees.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery ? `No employees matching "${searchQuery}"` : 'No employees found.'}
            </Text>
          ) : (
            filteredEmployees.map(emp => (
              <View key={emp.id} style={styles.employeeCard}>
                <View style={styles.employeeInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Text style={styles.employeeName}>{emp.name}</Text>
                    {emp.name.includes('Nichakamon') && (
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>★ Student</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.statusBadge,
                        emp.status === 'Active' ? styles.statusActive : styles.statusLeave
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          emp.status === 'Active'
                            ? styles.statusActiveText
                            : styles.statusLeaveText
                        ]}
                      >
                        {emp.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.employeePosition}>{emp.position}</Text>
                  <Text style={styles.employeeSalary}>
                    Salary: <Text style={{ fontWeight: 'bold', color: '#10b981' }}>฿{formatMoney(emp.salary)}</Text>
                  </Text>
                </View>

                {/* Actions: Edit, Toggle Status & Delete */}
                <View style={styles.actionRow}>
                  {/* Edit Button */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(emp)}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>

                  {/* Toggle Status Button */}
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => handleToggleStatus(emp.id)}
                  >
                    <Text style={styles.toggleButtonText}>Toggle Status</Text>
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDelete(emp.id, emp.name)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Employee Modal (แก้ไขพนักงาน) */}
      <Modal
        visible={editingEmployee !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Edit Employee (แก้ไขข้อมูล)</Text>
            <Text style={styles.modalSubtitle}>Editing ID: {editingEmployee?.id}</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>POSITION</Text>
              <TextInput
                style={styles.modalInput}
                value={editPosition}
                onChangeText={setEditPosition}
                placeholder="Position"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>SALARY (฿)</Text>
              <TextInput
                style={styles.modalInput}
                value={editSalary}
                onChangeText={setEditSalary}
                placeholder="Salary"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>STATUS</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    editStatus === 'Active' && styles.statusChoiceActive
                  ]}
                  onPress={() => setEditStatus('Active')}
                >
                  <Text style={[styles.statusChoiceText, editStatus === 'Active' && styles.statusChoiceTextActive]}>
                    ✓ Active
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    editStatus === 'On Leave' && styles.statusChoiceLeave
                  ]}
                  onPress={() => setEditStatus('On Leave')}
                >
                  <Text style={[styles.statusChoiceText, editStatus === 'On Leave' && styles.statusChoiceTextLeave]}>
                    ⏸ On Leave
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeEditModal}
                disabled={isSavingEdit}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, isSavingEdit && styles.buttonDisabled]}
                onPress={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  // Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  loginCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20
  },
  loginBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 2,
    marginBottom: 6
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 4
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 1,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#f8fafc'
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  hintBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f'
  },
  hintText: {
    color: '#93c5fd',
    fontSize: 12,
    textAlign: 'center'
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  headerBar: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  logoutButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600'
  },
  scrollContent: {
    flex: 1,
    padding: 16
  },

  // Analytics Section
  analyticsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800'
  },
  analyzeButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  clustersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6
  },
  clusterCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  clusterTierName: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800'
  },
  clusterCentroid: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 4
  },
  clusterSubtitle: {
    color: '#94a3b8',
    fontSize: 11
  },
  clusterBadge: {
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10
  },
  clusterBadgeText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '600'
  },

  // Form Section
  formSection: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 12
  },
  formField: {
    flex: 1,
    minWidth: 140
  },
  formFieldLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#f8fafc'
  },
  addEmployeeButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6
  },
  addEmployeeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    marginBottom: 14
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13
  },
  clearSearchBtn: {
    padding: 6
  },
  clearSearchText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700'
  },

  // Employee List Section
  listSection: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155'
  },
  refreshLink: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 24,
    fontSize: 14
  },
  employeeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  employeeInfo: {
    flex: 1,
    minWidth: 180
  },
  employeeName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800'
  },
  ownerBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  ownerBadgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '900'
  },
  employeePosition: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2
  },
  employeeSalary: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)'
  },
  statusActiveText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700'
  },
  statusLeave: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)'
  },
  statusLeaveText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  editButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  toggleButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderColor: '#334155'
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900'
  },
  modalSubtitle: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16
  },
  modalField: {
    marginBottom: 14
  },
  modalLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc'
  },
  statusChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  statusChoiceActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10b981'
  },
  statusChoiceLeave: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#f59e0b'
  },
  statusChoiceText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  statusChoiceTextActive: {
    color: '#34d399'
  },
  statusChoiceTextLeave: {
    color: '#fbbf24'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18
  },
  modalCancelBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalCancelText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600'
  },
  modalSaveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});
