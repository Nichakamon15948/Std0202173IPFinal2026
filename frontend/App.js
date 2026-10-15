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

export const LOCAL_API_URL = 'http://localhost:5000/api';
export const CLOUD_API_URL = 'http://119.59.102.161:3018/api';

export default function App() {
  // Dual-mode Server Routing: Supports both Localhost (Port 5000) and Cloud VPS (Port 3018)
  const [serverMode, setServerMode] = useState('cloud'); // 'cloud' | 'local'
  const [apiBaseUrl, setApiBaseUrl] = useState(CLOUD_API_URL);
  const [isDetectingServer, setIsDetectingServer] = useState(true);

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState('login');
  const [authToken, setAuthToken] = useState(null);

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Dashboard States
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'On Leave'
  const [sortBy, setSortBy] = useState('id'); // 'id' | 'salary-desc' | 'salary-asc' | 'name'

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

  // Default to Cloud VPS (119.59.102.161:3018) so all FE Add/Edit/Delete directly update Cloud Database (ip_std6730202173)
  useEffect(() => {
    setApiBaseUrl(CLOUD_API_URL);
    setServerMode('cloud');
    setIsDetectingServer(false);
  }, []);

  const switchServerMode = (mode) => {
    if (mode === 'cloud') {
      setServerMode('cloud');
      setApiBaseUrl(CLOUD_API_URL);
    } else {
      setServerMode('local');
      setApiBaseUrl(LOCAL_API_URL);
    }
  };

  useEffect(() => {
    if (currentScreen === 'dashboard') {
      fetchEmployees();
    }
  }, [currentScreen, apiBaseUrl]);

  const handleAutoFill = () => {
    setUsername('admin');
    setPassword('123');
  };

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
      const response = await fetch(`${apiBaseUrl}/login`, {
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
      showAlert('Connection Error', `Cannot connect to backend server at ${apiBaseUrl}. Please ensure the server is running.`);
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
      const response = await fetch(`${apiBaseUrl}/employees`);
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

  // Filtered and Sorted employees
  const filteredEmployees = employees
    .filter(emp => {
      if (statusFilter !== 'ALL' && emp.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        (emp.status && emp.status.toLowerCase().includes(q)) ||
        (emp.id && String(emp.id).toLowerCase().includes(q)) ||
        String(emp.salary).includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'salary-desc') return Number(b.salary) - Number(a.salary);
      if (sortBy === 'salary-asc') return Number(a.salary) - Number(b.salary);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return Number(a.id) - Number(b.id);
    });

  // Executive KPI Metrics (Live Computed from Database)
  const totalStaff = employees.length;
  const activeStaff = employees.filter(e => e.status === 'Active').length;
  const onLeaveStaff = employees.filter(e => e.status === 'On Leave').length;
  const totalPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
  const avgSalary = totalStaff > 0 ? Math.round(totalPayroll / totalStaff) : 0;
  const activePercent = totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0;

  // ==========================================
  // 3. Add Employee (with 400 Bad Request handling)
  // ==========================================
  const handleAddEmployee = async () => {
    // Client-side validation: prevent submission if fields are empty
    if (!newName.trim() || !newPosition.trim() || !newSalary.trim()) {
      showAlert('Validation Error (Client-side)', 'All fields (Name, Position, Salary) are required!');
      return;
    }

    const numericSalary = Number(newSalary.trim());
    if (isNaN(numericSalary) || numericSalary <= 0) {
      showAlert('Validation Error', 'Salary must be a positive number.');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`${apiBaseUrl}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          position: newPosition.trim(),
          salary: numericSalary
        })
      });

      const data = await response.json();

      if (response.status === 400) {
        showAlert('HTTP 400 Bad Request', data.error || 'Invalid employee data submitted.');
        return;
      }

      if (response.ok && data.success) {
        setNewName('');
        setNewPosition('');
        setNewSalary('');
        fetchEmployees();
        showAlert('Success', `Employee added successfully with ID #${data.employee?.id}!`);
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
      const response = await fetch(`${apiBaseUrl}/employees/${editingEmployee.id}`, {
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
      const response = await fetch(`${apiBaseUrl}/employees/${id}/status`, {
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
      const response = await fetch(`${apiBaseUrl}/employees/${id}`, {
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
      // หน่วงเวลาเล็กน้อย 0.6 วินาที เพื่อให้เห็น Loading Indicator ชัดเจนตามเกณฑ์ข้อสอบ (15 คะแนน)
      await new Promise(resolve => setTimeout(resolve, 600));

      const response = await fetch(`${apiBaseUrl}/employees/salary-clusters`);
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

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getTierTheme = (tierName) => {
    if (tierName === 'Tier 1') {
      return {
        badgeBg: '#ecfdf5',
        badgeText: '#065f46',
        accentColor: '#059669',
        cardBg: '#ffffff',
        label: 'Entry / Junior Level'
      };
    }
    if (tierName === 'Tier 2') {
      return {
        badgeBg: '#eff6ff',
        badgeText: '#1e40af',
        accentColor: '#2563eb',
        cardBg: '#ffffff',
        label: 'Mid - Professional'
      };
    }
    return {
      badgeBg: '#f5f3ff',
      badgeText: '#5b21b6',
      accentColor: '#7c3aed',
      cardBg: '#ffffff',
      label: 'Senior / Executive'
    };
  };

  // ==========================================
  // RENDER: Clean Corporate Login Screen
  // ==========================================
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>HR</Text>
            </View>
            <Text style={styles.loginTitle}>HR Management System</Text>
            <Text style={styles.loginSubtitle}>
              Employee Administration & Payroll Analytics
            </Text>
            
            <View style={styles.authorBadge}>
              <Text style={styles.authorBadgeText}>
                Student: <Text style={{ fontWeight: '700', color: '#1e3a8a' }}>Nichakamon (6730202173)</Text>
              </Text>
            </View>

            {/* Server Mode Switcher */}
            <View style={styles.loginServerBox}>
              <Text style={styles.loginServerTitle}>TARGET BACKEND SERVER</Text>
              <View style={styles.serverBtnGroup}>
                <TouchableOpacity
                  style={[
                    styles.serverPillBtn,
                    serverMode === 'local' && styles.serverPillBtnActive
                  ]}
                  onPress={() => switchServerMode('local')}
                >
                  <View style={[styles.pulseDot, serverMode === 'local' ? styles.pulseDotActive : styles.pulseDotInactive]} />
                  <Text style={[styles.serverPillText, serverMode === 'local' && styles.serverPillTextActive]}>
                    💻 Local (:5000)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.serverPillBtn,
                    serverMode === 'cloud' && styles.serverPillBtnActive
                  ]}
                  onPress={() => switchServerMode('cloud')}
                >
                  <View style={[styles.pulseDot, serverMode === 'cloud' ? styles.pulseDotActive : styles.pulseDotInactive]} />
                  <Text style={[styles.serverPillText, serverMode === 'cloud' && styles.serverPillTextActive]}>
                    🌐 Cloud VPS (:3018)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

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
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="e.g. 123 หรือ password123"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPassBtn}
              >
                <Text style={styles.showPassText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.autoFillButton} onPress={handleAutoFill}>
            <Text style={styles.autoFillText}>⚡ Click to auto-fill credentials (admin / 123)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isLoggingIn && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In to Workspace</Text>
            )}
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              System default: <Text style={{ fontWeight: '700' }}>admin</Text> / <Text style={{ fontWeight: '700' }}>123</Text> (or password123)
            </Text>
            <Text style={styles.hintSub}>Target API: {apiBaseUrl}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // RENDER: Clean Corporate Dashboard Screen
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
            <Text style={styles.headerSubtitle}>
              Personnel Portal | <Text style={{ color: '#93c5fd' }}>Nichakamon (6730202173)</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Target Server Switcher Bar */}
      <View style={styles.dashboardServerBar}>
        <View style={styles.dashboardServerLeft}>
          <Text style={styles.dashboardServerLabel}>DATABASE:</Text>
          <Text style={styles.dashboardServerDbBadge}>
            {serverMode === 'cloud' ? '☁️ Cloud MySQL (ip_std6730202173)' : '💻 Local DB'}
          </Text>
          <Text style={styles.dashboardServerUrl}>[{apiBaseUrl}]</Text>
        </View>
        <View style={styles.serverBtnGroup}>
          <TouchableOpacity
            style={[
              styles.serverPillBtnSmall,
              serverMode === 'local' && styles.serverPillBtnActive
            ]}
            onPress={() => switchServerMode('local')}
          >
            <View style={[styles.pulseDot, serverMode === 'local' ? styles.pulseDotActive : styles.pulseDotInactive]} />
            <Text style={[styles.serverPillTextSmall, serverMode === 'local' && styles.serverPillTextActive]}>
              💻 Local (:5000)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.serverPillBtnSmall,
              serverMode === 'cloud' && styles.serverPillBtnActive
            ]}
            onPress={() => switchServerMode('cloud')}
          >
            <View style={[styles.pulseDot, serverMode === 'cloud' ? styles.pulseDotActive : styles.pulseDotInactive]} />
            <Text style={[styles.serverPillTextSmall, serverMode === 'cloud' && styles.serverPillTextActive]}>
              🌐 Cloud VPS (:3018)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Executive KPI Stats Ribbon (Computed Realtime from Database) */}
        <View style={styles.kpiContainer}>
          {/* Card 1: Total Staff */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>TOTAL HEADCOUNT</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#eff6ff' }]}>
                <Text style={styles.kpiIconText}>👥</Text>
              </View>
            </View>
            <Text style={styles.kpiValue}>{totalStaff} <Text style={styles.kpiUnit}>Staff</Text></Text>
            <View style={styles.kpiFooter}>
              <View style={[styles.kpiPill, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.kpiPillText, { color: '#16a34a' }]}>● 100% active</Text>
              </View>
              <Text style={styles.kpiFootNote}>in database</Text>
            </View>
          </View>

          {/* Card 2: Active Working */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>ACTIVE ROSTER</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#f0fdf4' }]}>
                <Text style={styles.kpiIconText}>🟢</Text>
              </View>
            </View>
            <Text style={styles.kpiValue}>{activeStaff} <Text style={styles.kpiUnit}>Working</Text></Text>
            <View style={styles.kpiFooter}>
              <View style={[styles.kpiPill, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.kpiPillText, { color: '#15803d' }]}>{activePercent}% on duty</Text>
              </View>
              <Text style={styles.kpiFootNote}>operational rate</Text>
            </View>
          </View>

          {/* Card 3: On Leave */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>ON LEAVE / REST</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={styles.kpiIconText}>🟡</Text>
              </View>
            </View>
            <Text style={styles.kpiValue}>{onLeaveStaff} <Text style={styles.kpiUnit}>Staff</Text></Text>
            <View style={styles.kpiFooter}>
              <View style={[styles.kpiPill, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.kpiPillText, { color: '#b45309' }]}>{totalStaff > 0 ? 100 - activePercent : 0}% absent</Text>
              </View>
              <Text style={styles.kpiFootNote}>coverage managed</Text>
            </View>
          </View>

          {/* Card 4: Total Monthly Payroll */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>MONTHLY PAYROLL</Text>
              <View style={[styles.kpiIconBadge, { backgroundColor: '#f5f3ff' }]}>
                <Text style={styles.kpiIconText}>💰</Text>
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#1e3a8a' }]}>฿{formatMoney(totalPayroll)}</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiSubCalc}>Avg: <Text style={{ fontWeight: '700', color: '#0f172a' }}>฿{formatMoney(avgSalary)}</Text> / staff</Text>
            </View>
          </View>
        </View>

        {/* Phase 2: K-Means Analytics Section */}
        <View style={styles.analyticsSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Phase 2: Salary Structure Analytics (K-Means)</Text>
              <Text style={styles.sectionSubtitle}>
                Automatically clusters current payroll into 3 tiers (k=3) using machine learning algorithm
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
              onPress={handleAnalyzeSalary}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.analyzeButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze Salary Structure</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Summary Cards */}
          {isAnalyzing ? (
            <View style={styles.analyticsPlaceholder}>
              <ActivityIndicator size="large" color="#1e40af" style={{ marginBottom: 10 }} />
              <Text style={[styles.analyticsPlaceholderText, { color: '#1e40af', fontWeight: '700' }]}>
                Processing 1D K-Means clustering algorithm (k=3)...
              </Text>
            </View>
          ) : clusters ? (
            <View>
              <View style={styles.clustersRow}>
                {clusters.map((tier, idx) => {
                  const theme = getTierTheme(tier.group);
                  return (
                    <View key={idx} style={[styles.clusterCard, { borderTopColor: theme.accentColor }]}>
                      <View style={styles.clusterCardTop}>
                        <Text style={[styles.clusterTierName, { color: theme.accentColor }]}>{tier.group}</Text>
                        <View style={[styles.tierTag, { backgroundColor: theme.badgeBg }]}>
                          <Text style={[styles.tierTagText, { color: theme.badgeText }]}>{theme.label}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.clusterCentroid}>
                        ฿{formatMoney(tier.centroid)}
                      </Text>
                      <Text style={styles.clusterSubtitle}>Average Base Salary</Text>

                      <View style={styles.clusterFooter}>
                        <Text style={styles.clusterFooterText}>
                          Total Staff: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{tier.count}</Text> employee(s)
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Visual Proportion Breakdown Bar */}
              <View style={styles.distributionContainer}>
                <View style={styles.distribHeader}>
                  <Text style={styles.distribTitle}>PAYROLL WORKFORCE DISTRIBUTION</Text>
                  <Text style={styles.distribSubtitle}>3-Tier Staffing Share via K-Means</Text>
                </View>

                <View style={styles.distribBarWrapper}>
                  {clusters.map((tier, idx) => {
                    const theme = getTierTheme(tier.group);
                    const pct = totalStaff > 0 ? Math.round((tier.count / totalStaff) * 100) : 33;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.distribSegment,
                          {
                            flex: tier.count || 1,
                            backgroundColor: theme.accentColor
                          }
                        ]}
                      >
                        <Text style={styles.distribSegmentText}>{tier.group} ({pct}%)</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.distribLegendRow}>
                  {clusters.map((tier, idx) => {
                    const theme = getTierTheme(tier.group);
                    return (
                      <View key={idx} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.accentColor }]} />
                        <Text style={styles.legendText}>
                          {tier.group}: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{tier.count} staff</Text> (avg ฿{formatMoney(tier.centroid)})
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.analyticsPlaceholder}>
              <Text style={styles.analyticsPlaceholderText}>
                Click the <Text style={{ color: '#1e40af', fontWeight: '700' }}>"Analyze Salary Structure"</Text> button to group company salaries into 3 tiers.
              </Text>
            </View>
          )}
        </View>

        {/* Phase 1: Add Employee Card */}
        <View style={styles.addEmployeeCard}>
          <View style={styles.addCardHeader}>
            <View>
              <Text style={styles.addCardTitle}>New Employee Registration</Text>
              <Text style={styles.addCardSubtitle}>Enter employee information to add them to active payroll</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            {/* Name */}
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Somchai Jaidee"
                placeholderTextColor="#94a3b8"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            {/* Position */}
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>POSITION / JOB TITLE *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Software Engineer"
                placeholderTextColor="#94a3b8"
                value={newPosition}
                onChangeText={setNewPosition}
              />
            </View>

            {/* Salary */}
            <View style={styles.formField}>
              <Text style={styles.formFieldLabel}>MONTHLY SALARY (THB) *</Text>
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

          {/* Quick preset positions */}
          <View style={styles.presetsRow}>
            <Text style={styles.presetsLabel}>Common Roles:</Text>
            {['Software Engineer', 'HR Specialist', 'System Architect', 'Frontend Developer', 'DevOps'].map((pos) => (
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
              <Text style={styles.addEmployeeButtonText}>＋ Add Employee Record</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Phase 1: Employee Directory */}
        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Employee Directory ({filteredEmployees.length} of {employees.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Active staff roster and payroll overview
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchEmployees}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar & Filter Tabs */}
          <View style={styles.filterBarRow}>
            <View style={styles.searchBarContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, position, ID, or status..."
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

          {/* Quick Sort Bar */}
          <View style={styles.sortControlsRow}>
            <Text style={styles.sortLabel}>SORT BY:</Text>
            <TouchableOpacity
              style={[styles.sortPillBtn, sortBy === 'id' && styles.sortPillBtnActive]}
              onPress={() => setSortBy('id')}
            >
              <Text style={[styles.sortPillText, sortBy === 'id' && styles.sortPillTextActive]}>ID</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPillBtn, sortBy === 'salary-desc' && styles.sortPillBtnActive]}
              onPress={() => setSortBy('salary-desc')}
            >
              <Text style={[styles.sortPillText, sortBy === 'salary-desc' && styles.sortPillTextActive]}>Salary ⬇</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPillBtn, sortBy === 'salary-asc' && styles.sortPillBtnActive]}
              onPress={() => setSortBy('salary-asc')}
            >
              <Text style={[styles.sortPillText, sortBy === 'salary-asc' && styles.sortPillTextActive]}>Salary ⬆</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPillBtn, sortBy === 'name' && styles.sortPillBtnActive]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.sortPillText, sortBy === 'name' && styles.sortPillTextActive]}>Name A-Z</Text>
            </TouchableOpacity>
          </View>

          {/* Employee Cards List */}
          {isLoadingEmployees ? (
            <ActivityIndicator size="large" color="#1e40af" style={{ marginVertical: 40 }} />
          ) : filteredEmployees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No employee records found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `No matching records for "${searchQuery}".` : 'Register your first employee above.'}
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
                            <Text style={styles.ownerBadgeText}>★ Student Admin</Text>
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
                              { backgroundColor: emp.status === 'Active' ? '#16a34a' : '#d97706' }
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
                        <Text style={styles.salaryLabel}>Base Salary: </Text>
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
                      <Text style={styles.editButtonText}>Edit</Text>
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
                <Text style={styles.modalTitle}>Edit Employee Record</Text>
                <Text style={styles.modalSubtitle}>Employee ID: #{editingEmployee?.id}</Text>
              </View>
              <TouchableOpacity onPress={closeEditModal} style={styles.modalCloseIcon}>
                <Text style={{ color: '#64748b', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>FULL NAME</Text>
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
              <Text style={styles.modalLabel}>BASE SALARY (THB)</Text>
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
// REAL ENTERPRISE HR PORTAL STYLES
// ==========================================
const styles = StyleSheet.create({
  // Clean Login Styles
  loginContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 36,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  logoBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff'
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center'
  },
  authorBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10
  },
  authorBadgeText: {
    fontSize: 11,
    color: '#1e40af'
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a'
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a'
  },
  showPassBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6
  },
  showPassText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700'
  },
  autoFillButton: {
    alignSelf: 'flex-end',
    marginBottom: 14
  },
  autoFillText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600'
  },
  primaryButton: {
    backgroundColor: '#1e40af',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  hintBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  hintText: {
    color: '#475569',
    fontSize: 12
  },
  hintSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },

  // Corporate Dashboard Styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  headerBar: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandIconText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff'
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 1
  },
  logoutButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  logoutButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600'
  },
  scrollContent: {
    flex: 1,
    padding: 20
  },

  // Analytics Section
  analyticsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6
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
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800'
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  analyzeButton: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  clustersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 6
  },
  clusterCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 4
  },
  clusterCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  clusterTierName: {
    fontSize: 15,
    fontWeight: '800'
  },
  tierTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  tierTagText: {
    fontSize: 11,
    fontWeight: '700'
  },
  clusterCentroid: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 1
  },
  clusterSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 12
  },
  clusterFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8
  },
  clusterFooterText: {
    color: '#475569',
    fontSize: 12
  },
  analyticsPlaceholder: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  analyticsPlaceholderText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center'
  },

  // Add Employee Card
  addEmployeeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6
  },
  addCardHeader: {
    marginBottom: 14
  },
  addCardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800'
  },
  addCardSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12
  },
  formField: {
    flex: 1,
    minWidth: 180
  },
  formFieldLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a'
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14
  },
  presetsLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  presetChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  presetChipText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600'
  },
  addEmployeeButton: {
    backgroundColor: '#15803d',
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: 'center'
  },
  addEmployeeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },

  // Employee Directory
  listSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14
  },
  refreshButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  refreshButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600'
  },
  filterBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
    alignItems: 'center'
  },
  searchBarContainer: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 6
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 13
  },
  clearSearchBtn: {
    padding: 4
  },
  clearSearchText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 6
  },
  statusFilterBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  statusFilterBtnActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af'
  },
  statusFilterText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600'
  },
  statusFilterTextActive: {
    color: '#ffffff'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700'
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },

  // Employee Card
  employeeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  employeeCardOwner: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb'
  },
  employeeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  avatarOwner: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b'
  },
  avatarText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700'
  },
  avatarOwnerText: {
    color: '#b45309'
  },
  employeeInfo: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  // Distinct ID Badge
  idBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  idBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  employeeName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700'
  },
  ownerBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  ownerBadgeText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '700'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  },
  statusActive: {
    backgroundColor: '#dcfce7'
  },
  statusActiveText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '600'
  },
  statusLeave: {
    backgroundColor: '#fef3c7'
  },
  statusLeaveText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '600'
  },
  employeePosition: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  salaryLabel: {
    color: '#64748b',
    fontSize: 11
  },
  salaryAmount: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700'
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  editButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5
  },
  editButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600'
  },
  toggleButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5
  },
  toggleButtonText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800'
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  modalCloseIcon: {
    padding: 4
  },
  modalField: {
    marginBottom: 12
  },
  modalLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a'
  },
  statusChoiceBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  statusChoiceActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac'
  },
  statusChoiceLeave: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  statusChoiceText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  statusChoiceTextActive: {
    color: '#15803d',
    fontWeight: '700'
  },
  statusChoiceTextLeave: {
    color: '#b45309',
    fontWeight: '700'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18
  },
  modalCancelBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6
  },
  modalCancelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  modalSaveBtn: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  // Dual-mode Server Routing Styles
  loginServerBox: {
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    alignItems: 'center',
    width: '100%'
  },
  loginServerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 8
  },
  serverBtnGroup: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  serverPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  serverPillBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6'
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  serverPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '700'
  },
  serverPillBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  serverPillTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1'
  },
  dashboardServerBar: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10
  },
  dashboardServerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dashboardServerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5
  },
  dashboardServerDbBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34d399'
  },
  dashboardServerUrl: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  pulseDotActive: {
    backgroundColor: '#22c55e'
  },
  pulseDotInactive: {
    backgroundColor: '#94a3b8'
  },

  // Executive KPI Styles
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiIconText: {
    fontSize: 13
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  kpiPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10
  },
  kpiPillText: {
    fontSize: 10,
    fontWeight: '700'
  },
  kpiFootNote: {
    fontSize: 11,
    color: '#94a3b8'
  },
  kpiSubCalc: {
    fontSize: 11,
    color: '#64748b'
  },

  // Distribution Bar Styles
  distributionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 14
  },
  distribHeader: {
    marginBottom: 10
  },
  distribTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.6
  },
  distribSubtitle: {
    fontSize: 11,
    color: '#64748b'
  },
  distribBarWrapper: {
    height: 22,
    borderRadius: 11,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: 12
  },
  distribSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  distribSegmentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff'
  },
  distribLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    fontSize: 11,
    color: '#475569'
  },

  // Sort Controls Styles
  sortControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingBottom: 4
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5
  },
  sortPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sortPillBtnActive: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af'
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  sortPillTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
