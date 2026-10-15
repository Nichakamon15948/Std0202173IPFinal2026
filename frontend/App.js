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

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  // Navigation State
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
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'On Leave'

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

  useEffect(() => {
    if (currentScreen === 'dashboard') {
      fetchEmployees();
    }
  }, [currentScreen]);

  // ==========================================
  // 1. Authentication
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
      showAlert('Connection Error', 'Cannot connect to backend server on port 5000.');
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
  // 2. Fetch Employee Records
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

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    // Status filter
    if (statusFilter !== 'ALL' && emp.status !== statusFilter) return false;

    // Search query filter
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
  // 3. Add Employee
  // ==========================================
  const handleAddEmployee = async () => {
    if (!newName.trim() || !newPosition.trim() || !newSalary.trim()) {
      showAlert('Validation Error', 'Please fill in all fields (Name, Position, Salary).');
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
        showAlert('Success', `Employee "${data.employee?.name || 'New'}" added successfully!`);
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

  // Quick fill position
  const setQuickPosition = (pos) => {
    setNewPosition(pos);
  };

  // ==========================================
  // 4. Edit Employee
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
      showAlert('Validation Error', 'Please fill in all fields (Name, Position, Salary).');
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
  // 5. Toggle Status
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
  // 6. Delete Employee with Confirm Alert
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

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const formatMoney = (val) => {
    const num = Number(val);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  // Get Initials for avatar
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Tier color styling
  const getTierTheme = (tierName) => {
    if (tierName === 'Tier 1') {
      return {
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeText: '#34d399',
        borderColor: '#059669',
        accentColor: '#10b981',
        label: 'Entry / Junior Tier'
      };
    }
    if (tierName === 'Tier 2') {
      return {
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeText: '#60a5fa',
        borderColor: '#2563eb',
        accentColor: '#3b82f6',
        label: 'Mid - Senior Tier'
      };
    }
    return {
      badgeBg: 'rgba(168, 85, 247, 0.15)',
      badgeText: '#c084fc',
      borderColor: '#7c3aed',
      accentColor: '#a855f7',
      label: 'Lead / Executive Tier'
    };
  };

  // ==========================================
  // RENDER: Login Screen
  // ==========================================
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>HR</Text>
            </View>
            <Text style={styles.loginTitle}>HR Portal Login</Text>
            <Text style={styles.loginSubtitle}>
              Final Exam 2026: Salary Analytics System
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>USERNAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. admin"
              placeholderTextColor="#64748b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 123 หรือ password123"
              placeholderTextColor="#64748b"
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
              <Text style={styles.primaryButtonText}>Sign In to Dashboard →</Text>
            )}
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              🔑 <Text style={{ fontWeight: 'bold' }}>Credentials:</Text> admin / 123 (หรือ password123)
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER: Dashboard Screen
  // ==========================================
  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <StatusBar barStyle="light-content" />

      {/* Top Navbar */}
      <View style={styles.headerBar}>
        <View style={styles.headerBrand}>
          <View style={styles.brandIconBox}>
            <Text style={styles.brandIconText}>HR</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>HR Manager & Salary Analytics</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.liveIndicator} />
              <Text style={styles.headerSubtitle}>
                👤 Nichakamon (ID: 6730202173)
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out ⎋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Phase 2: K-Means Analytics Section */}
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>📊 Phase 2: Automated Salary Clustering (K-Means)</Text>
              <Text style={styles.sectionSubtitle}>
                Analyzes current employee payroll and groups into 3 salary tiers (k=3)
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
              onPress={handleAnalyzeSalary}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.analyzeButtonText}>Calculating...</Text>
                </View>
              ) : (
                <Text style={styles.analyzeButtonText}>⚡ Analyze Salary Structure</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Summary Cards */}
          {clusters ? (
            <View style={styles.clustersRow}>
              {clusters.map((tier, idx) => {
                const theme = getTierTheme(tier.group);
                return (
                  <View key={idx} style={[styles.clusterCard, { borderColor: theme.borderColor }]}>
                    <View style={styles.clusterCardTop}>
                      <Text style={[styles.clusterTierName, { color: theme.accentColor }]}>{tier.group}</Text>
                      <View style={[styles.tierTag, { backgroundColor: theme.badgeBg }]}>
                        <Text style={[styles.tierTagText, { color: theme.badgeText }]}>{theme.label}</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.clusterCentroid, { color: theme.accentColor }]}>
                      ฿{formatMoney(tier.centroid)}
                    </Text>
                    <Text style={styles.clusterSubtitle}>Average Base Salary</Text>

                    <View style={styles.clusterFooter}>
                      <Text style={styles.clusterFooterText}>
                        👥 <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>{tier.count}</Text> Employees in this tier
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.analyticsPlaceholder}>
              <Text style={styles.analyticsPlaceholderText}>
                Click the <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>"⚡ Analyze Salary Structure"</Text> button above to run the K-Means clustering algorithm.
              </Text>
            </View>
          )}
        </View>

        {/* Phase 1: Add Employee Card */}
        <View style={styles.addEmployeeCard}>
          <View style={styles.addCardHeader}>
            <View style={styles.addIconCircle}>
              <Text style={styles.addIconText}>＋</Text>
            </View>
            <View>
              <Text style={styles.addCardTitle}>Add New Employee (เพิ่มพนักงานใหม่)</Text>
              <Text style={styles.addCardSubtitle}>Register new staff with their title, position, and base compensation</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            {/* Name */}
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Somchai Jaidee"
                placeholderTextColor="#64748b"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            {/* Position */}
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>POSITION / ROLE *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Software Engineer"
                placeholderTextColor="#64748b"
                value={newPosition}
                onChangeText={setNewPosition}
              />
            </View>

            {/* Salary */}
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>BASE SALARY (฿) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 45000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={newSalary}
                onChangeText={setNewSalary}
              />
            </View>
          </View>

          {/* Quick preset positions */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetsLabel}>Quick Position:</Text>
            {['Software Engineer', 'HR Specialist', 'DevOps', 'Designer', 'Marketing'].map((pos) => (
              <TouchableOpacity
                key={pos}
                style={styles.presetChip}
                onPress={() => setQuickPosition(pos)}
              >
                <Text style={styles.presetChipText}>{pos}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addEmployeeButton, isAdding && styles.buttonDisabled]}
            onPress={handleAddEmployee}
            disabled={isAdding}
          >
            {isAdding ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.addEmployeeButtonText}>＋ Register & Add Employee</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Phase 1: Employee Directory */}
        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                👥 Employee Directory ({filteredEmployees.length} of {employees.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Manage status, edit employee records, or remove personnel
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchEmployees}>
              <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar & Filter Tabs */}
          <View style={styles.filterBarRow}>
            <View style={styles.searchBarContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, role, status, or salary..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Status Filter Chips */}
            <View style={styles.statusFilters}>
              <TouchableOpacity
                style={[styles.statusFilterBtn, statusFilter === 'ALL' && styles.statusFilterBtnActive]}
                onPress={() => setStatusFilter('ALL')}
              >
                <Text style={[styles.statusFilterText, statusFilter === 'ALL' && styles.statusFilterTextActive]}>
                  All ({employees.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusFilterBtn, statusFilter === 'Active' && styles.statusFilterBtnActive]}
                onPress={() => setStatusFilter('Active')}
              >
                <Text style={[styles.statusFilterText, statusFilter === 'Active' && styles.statusFilterTextActive]}>
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusFilterBtn, statusFilter === 'On Leave' && styles.statusFilterBtnActive]}
                onPress={() => setStatusFilter('On Leave')}
              >
                <Text style={[styles.statusFilterText, statusFilter === 'On Leave' && styles.statusFilterTextActive]}>
                  On Leave
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Employee Cards List */}
          {isLoadingEmployees ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 40 }} />
          ) : filteredEmployees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No matching employees found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `No results for "${searchQuery}". Try a different keyword.` : 'Click "Add Employee" above to add staff.'}
              </Text>
            </View>
          ) : (
            filteredEmployees.map(emp => {
              const isOwner = emp.name.includes('Nichakamon');
              return (
                <View
                  key={emp.id}
                  style={[
                    styles.employeeCard,
                    isOwner && styles.employeeCardOwner
                  ]}
                >
                  {/* Left: Avatar + Details */}
                  <View style={styles.employeeMainRow}>
                    <View style={[styles.avatarCircle, isOwner && styles.avatarOwner]}>
                      <Text style={[styles.avatarText, isOwner && styles.avatarOwnerText]}>
                        {getInitials(emp.name)}
                      </Text>
                    </View>

                    <View style={styles.employeeInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.employeeName}>{emp.name}</Text>
                        {isOwner && (
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>★ Student (Owner)</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.statusBadge,
                            emp.status === 'Active' ? styles.statusActive : styles.statusLeave
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: emp.status === 'Active' ? '#10b981' : '#f59e0b' }
                            ]}
                          />
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
                      
                      <View style={styles.salaryRow}>
                        <Text style={styles.salaryLabel}>Monthly Salary: </Text>
                        <Text style={styles.salaryAmount}>฿{formatMoney(emp.salary)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(emp)}
                    >
                      <Text style={styles.editButtonText}>✏️ Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => handleToggleStatus(emp.id)}
                    >
                      <Text style={styles.toggleButtonText}>Toggle Status</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDelete(emp.id, emp.name)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Employee Modal */}
      <Modal
        visible={editingEmployee !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>✏️ Edit Employee Information</Text>
                <Text style={styles.modalSubtitle}>ID: #{editingEmployee?.id}</Text>
              </View>
              <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseIcon}>
                <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>FULL NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>POSITION</Text>
              <TextInput
                style={styles.modalInput}
                value={editPosition}
                onChangeText={setEditPosition}
                placeholder="Position"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>BASE SALARY (฿)</Text>
              <TextInput
                style={styles.modalInput}
                value={editSalary}
                onChangeText={setEditSalary}
                placeholder="Salary"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>EMPLOYMENT STATUS</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                <TouchableOpacity
                  style={[
                    styles.statusChoiceBtn,
                    editStatus === 'Active' && styles.statusChoiceActive
                  ]}
                  onPress={() => setEditStatus('Active')}
                >
                  <Text style={[styles.statusChoiceText, editStatus === 'Active' && styles.statusChoiceTextActive]}>
                    ✓ Active (ทำงาน)
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
                    ⏸ On Leave (ลางาน)
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
                  <Text style={styles.modalSaveText}>Save Changes ✓</Text>
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
// MODERN STYLES
// ==========================================
const styles = StyleSheet.create({
  // Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loginCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 26
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.5,
    shadowRadius: 10
  },
  logoBadgeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff'
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 4
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 18
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 1,
    marginBottom: 8
  },
  textInput: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#f8fafc'
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 12
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  hintBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: 'rgba(30, 58, 138, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  hintText: {
    color: '#93c5fd',
    fontSize: 12,
    textAlign: 'center'
  },

  // Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#0a0f1d'
  },
  headerBar: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff'
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900'
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981'
  },
  headerSubtitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  logoutButton: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700'
  },
  scrollContent: {
    flex: 1,
    padding: 20
  },

  // Analytics Section
  analyticsSection: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  analyzeButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#0284c7',
    shadowOpacity: 0.4,
    shadowRadius: 8
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  },
  clustersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8
  },
  clusterCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#030712',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5
  },
  clusterCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  clusterTierName: {
    fontSize: 16,
    fontWeight: '900'
  },
  tierTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  tierTagText: {
    fontSize: 11,
    fontWeight: '800'
  },
  clusterCentroid: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2
  },
  clusterSubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 14
  },
  clusterFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 10
  },
  clusterFooterText: {
    color: '#94a3b8',
    fontSize: 12
  },
  analyticsPlaceholder: {
    padding: 24,
    backgroundColor: '#030712',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center'
  },
  analyticsPlaceholderText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center'
  },

  // Add Employee Card
  addEmployeeCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  addCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18
  },
  addIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addIconText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900'
  },
  addCardTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900'
  },
  addCardSubtitle: {
    color: '#94a3b8',
    fontSize: 12
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14
  },
  formField: {
    flex: 1,
    minWidth: 180
  },
  formFieldLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  formInput: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: '#f8fafc'
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  presetsLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700'
  },
  presetChip: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151'
  },
  presetChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600'
  },
  addEmployeeButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  addEmployeeButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14
  },

  // Employee Directory
  listSection: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  refreshButton: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  refreshButtonText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  filterBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center'
  },
  searchBarContainer: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#030712',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 12
  },
  searchIcon: {
    fontSize: 13,
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
  statusFilters: {
    flexDirection: 'row',
    gap: 6
  },
  statusFilterBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151'
  },
  statusFilterBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6'
  },
  statusFilterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  statusFilterTextActive: {
    color: '#ffffff'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 36
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800'
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center'
  },

  // Employee Card
  employeeCard: {
    backgroundColor: '#030712',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14
  },
  employeeCardOwner: {
    borderColor: '#f59e0b',
    backgroundColor: '#0a0f1d'
  },
  employeeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151'
  },
  avatarOwner: {
    backgroundColor: '#f59e0b',
    borderColor: '#fbbf24'
  },
  avatarText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900'
  },
  avatarOwnerText: {
    color: '#0f172a'
  },
  employeeInfo: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  employeeName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800'
  },
  ownerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6
  },
  ownerBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  statusActiveText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700'
  },
  statusLeave: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)'
  },
  statusLeaveText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700'
  },
  employeePosition: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 3
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  salaryLabel: {
    color: '#64748b',
    fontSize: 12
  },
  salaryAmount: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800'
  },

  // Actions
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
    fontWeight: '700'
  },
  toggleButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#374151'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900'
  },
  modalSubtitle: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 2
  },
  modalCloseIcon: {
    padding: 4
  },
  modalField: {
    marginBottom: 14
  },
  modalLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6
  },
  modalInput: {
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc'
  },
  statusChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#030712',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center'
  },
  statusChoiceActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981'
  },
  statusChoiceLeave: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
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
    marginTop: 20
  },
  modalCancelBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  modalCancelText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700'
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
    fontWeight: '800'
  }
});
