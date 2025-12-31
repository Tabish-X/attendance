import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Calendar, Percent, BookOpen, Users, Clock, Target, TrendingUp, TableIcon, Save } from 'lucide-react';

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [activeTab, setActiveTab] = useState('add');
  const [saveStatus, setSaveStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD format
  const [manualDate, setManualDate] = useState(''); // DD/MM/YYYY format for display
  const [attendanceStatus, setAttendanceStatus] = useState('');

  // Load data from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('attendance_tracker_data_v8');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSubjects(parsed);
          showSaveStatus('Data loaded');
        }
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }, []);

  // Save to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('attendance_tracker_data_v8', JSON.stringify(subjects));
      showSaveStatus('Data saved');
    } catch (e) {
      console.error('Failed to save data', e);
      showSaveStatus('Save failed', true);
    }
  }, [subjects]);

  const showSaveStatus = (message, isError = false) => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDisplay = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle manual date input with auto-formatting
  const handleManualDateChange = (value) => {
    const digits = value.replace(/\D/g, '');
    
    let formatted = '';
    if (digits.length >= 2) {
      formatted = digits.slice(0, 2) + '/';
      if (digits.length >= 4) {
        formatted += digits.slice(2, 4) + '/';
        if (digits.length >= 8) {
          formatted += digits.slice(4, 8);
        } else {
          formatted += digits.slice(4);
        }
      } else {
        formatted += digits.slice(2);
      }
    } else {
      formatted = digits;
    }
    
    setManualDate(formatted);
    
    // Convert to YYYY-MM-DD and validate
    if (digits.length >= 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      const isoDate = `${year}-${month}-${day}`;
      
      const date = new Date(isoDate);
      if (date.getFullYear() == year && date.getMonth() + 1 == month && date.getDate() == day) {
        setSelectedDate(isoDate);
      } else {
        setSelectedDate('');
      }
    } else {
      setSelectedDate('');
    }
  };

  // Set today's date
  const setTodayDate = () => {
    const isoDate = getTodayDate();
    const displayDate = getTodayDisplay();
    setSelectedDate(isoDate);
    setManualDate(displayDate);
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.find(s => s.name.toLowerCase() === newSubject.toLowerCase())) {
      setSubjects([...subjects, {
        id: Date.now(),
        name: newSubject.trim(),
        totalLectures: 0,
        attendedLectures: 0,
        sessions: []
      }]);
      setNewSubject('');
      showSaveStatus('Subject added successfully!');
    } else if (!newSubject.trim()) {
      showSaveStatus('Please enter a subject name', true);
    } else {
      showSaveStatus('Subject already exists', true);
    }
  };

  const deleteSubject = (id) => {
    if (deleteConfirm?.type === 'subject' && deleteConfirm.id === id) {
      setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== id));
      setDeleteConfirm(null);
      showSaveStatus('Subject deleted successfully!');
    } else {
      setDeleteConfirm({ type: 'subject', id });
    }
  };

  const saveAttendance = () => {
    if (!selectedSubjectId || !selectedDate || !attendanceStatus) {
      showSaveStatus('Please fill in all fields', true);
      return;
    }
    
    const displayDate = new Date(selectedDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    setSubjects(subjects.map(subject => {
      if (subject.id === parseInt(selectedSubjectId)) {
        const isPresent = attendanceStatus === 'present';
        return {
          ...subject,
          totalLectures: subject.totalLectures + 1,
          attendedLectures: subject.attendedLectures + (isPresent ? 1 : 0),
          sessions: [...subject.sessions, {
            id: Date.now(),
            date: displayDate,
            rawDate: selectedDate,
            status: attendanceStatus,
            locked: true
          }]
        };
      }
      return subject;
    }));

    // Reset form
    setSelectedSubjectId('');
    setSelectedDate('');
    setManualDate('');
    setAttendanceStatus('');
    showSaveStatus('Attendance saved successfully!');
  };

  const deleteSession = (subjectId, sessionId) => {
    if (deleteConfirm?.type === 'session' && deleteConfirm.id === sessionId && deleteConfirm.subjectId === subjectId) {
      setSubjects(prevSubjects => prevSubjects.map(subject => {
        if (subject.id === subjectId) {
          const updatedSessions = subject.sessions.filter(s => s.id !== sessionId);
          const attendedCount = updatedSessions.filter(s => s.status === 'present').length;
          const totalLectures = updatedSessions.length;
          
          return {
            ...subject,
            sessions: updatedSessions,
            totalLectures,
            attendedLectures: attendedCount
          };
        }
        return subject;
      }));
      setDeleteConfirm(null);
      showSaveStatus('Session deleted successfully!');
    } else {
      setDeleteConfirm({ type: 'session', id: sessionId, subjectId });
    }
  };

  const calculateOverallAttendance = () => {
    const totalLectures = subjects.reduce((sum, subject) => sum + subject.totalLectures, 0);
    const totalAttended = subjects.reduce((sum, subject) => sum + subject.attendedLectures, 0);
    return totalLectures > 0 ? Math.round((totalAttended / totalLectures) * 100) : 0;
  };

  const overallAttendance = calculateOverallAttendance();
  const totalLectures = subjects.reduce((sum, subject) => sum + subject.totalLectures, 0);
  const totalAttended = subjects.reduce((sum, subject) => sum + subject.attendedLectures, 0);

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (percentage >= 75) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getOverallColor = (percentage) => {
    if (percentage >= 90) return 'from-emerald-500 to-teal-600';
    if (percentage >= 75) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 to-pink-600';
  };

  // Sort sessions in ASCENDING order
  const allSessions = subjects.flatMap(subject => 
    subject.sessions.map(session => ({
      ...session,
      subjectName: subject.name,
      subjectId: subject.id
    }))
  ).sort((a, b) => {
    const dateA = new Date(a.rawDate);
    const dateB = new Date(b.rawDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    return a.id - b.id;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Attendance Pro</h1>
                <p className="text-xs text-gray-500">By Tabish</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">Attendance Pro</h1>
                <p className="text-xs text-gray-500">By Tabish</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {saveStatus && (
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                  saveStatus.includes('failed') || saveStatus.includes('Error') 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  <Save className="w-3 h-3" />
                  <span>{saveStatus}</span>
                </div>
              )}
              
              <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setActiveTab('add');
                    setDeleteConfirm(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                    activeTab === 'add' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Add Classes</span>
                    <span className="sm:hidden">Add</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('track');
                    setDeleteConfirm(null);
                    setSelectedSubjectId('');
                    setSelectedDate('');
                    setManualDate('');
                    setAttendanceStatus('');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                    activeTab === 'track' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Track Attendance</span>
                    <span className="sm:hidden">Track</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('table');
                    setDeleteConfirm(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm ${
                    activeTab === 'table' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <TableIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Attendance Table</span>
                    <span className="sm:hidden">Table</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'add' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Add New Subject</h2>
                <p className="text-gray-600 text-sm">Enter the name of your subject</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Subject name"
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm sm:text-base"
                  onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                />
                <button
                  onClick={addSubject}
                  disabled={!newSubject.trim()}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors text-sm sm:text-base"
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Add Subject</span>
                  </div>
                </button>
              </div>
            </div>

            {subjects.length > 0 && (
              <div className="mt-6 sm:mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Your Subjects</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="p-3 sm:p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{subject.name}</h3>
                        {deleteConfirm?.type === 'subject' && deleteConfirm.id === subject.id ? (
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <button
                              onClick={() => deleteSubject(subject.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-xs sm:text-sm"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => deleteSubject(subject.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
                        <span>{subject.attendedLectures} attended</span>
                        <span className="ml-2">{subject.totalLectures} total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'track' && (
          <div className="space-y-6 sm:space-y-8">
            {subjects.length > 0 && (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className={`bg-gradient-to-br ${getOverallColor(overallAttendance)} rounded-2xl shadow-sm p-4 sm:p-6 text-white`}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
                    <Percent className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-white/90 mb-1">Overall Attendance</h3>
                  <div className="text-xl sm:text-3xl font-bold mb-1">{overallAttendance}%</div>
                  <div className="text-xs text-white/80">{totalAttended}/{totalLectures} lectures</div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-base sm:text-lg font-bold text-blue-600">{subjects.length}</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Total Subjects</h3>
                  <p className="text-xs text-gray-600">{subjects.length} subjects tracked</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-base sm:text-lg font-bold text-purple-600">{totalLectures}</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Total Lectures</h3>
                  <p className="text-xs text-gray-600">Across all subjects</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-base sm:text-lg font-bold text-green-600">{totalAttended}</span>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-1">Lectures Attended</h3>
                  <p className="text-xs text-gray-600">Successfully completed</p>
                </div>
              </div>
            )}

            {subjects.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-16 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No subjects added yet</h3>
                <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm">
                  Add your first subject to start tracking attendance professionally.
                </p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm sm:text-base"
                >
                  Add Your First Subject
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Step-by-step Attendance Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Record New Attendance</h3>
                  
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {/* Step 1: Select Subject */}
                    <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Subject</label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs sm:text-sm"
                      >
                        <option value="">Select subject</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Step 2: Date Input with Today Button */}
                    <div className="md:col-span-2 lg:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Date</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualDate}
                          onChange={(e) => handleManualDateChange(e.target.value)}
                          placeholder="DD/MM/YYYY"
                          maxLength="10"
                          className="flex-1 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs sm:text-sm"
                        />
                        <button
                          onClick={setTodayDate}
                          disabled={!selectedSubjectId}
                          className="px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                        >
                          Today
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Enter date as DD/MM/YYYY</p>
                    </div>

                    {/* Step 3: Select Status (disabled until date is valid) */}
                    <div className="lg:col-span-1">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Attendance</label>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setAttendanceStatus('present')}
                          disabled={!selectedSubjectId || !selectedDate}
                          className={`w-full py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                            attendanceStatus === 'present'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceStatus('absent')}
                          disabled={!selectedSubjectId || !selectedDate}
                          className={`w-full py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                            attendanceStatus === 'absent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>

                    {/* Step 4: Save Button */}
                    <div className="sm:col-span-2 md:col-span-4 lg:col-span-5 flex items-end pt-2">
                      <button
                        onClick={saveAttendance}
                        disabled={!selectedSubjectId || !selectedDate || !attendanceStatus}
                        className="w-full py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base"
                      >
                        <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                        Save Attendance
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subject Session Lists */}
                {subjects.map((subject) => {
                  const attendancePercentage = subject.totalLectures > 0 
                    ? Math.round((subject.attendedLectures / subject.totalLectures) * 100)
                    : 0;
                  
                  return (
                    <div key={subject.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className={`p-4 sm:p-6 border-b ${getAttendanceColor(attendancePercentage)}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900">{subject.name}</h3>
                            <p className="text-xs sm:text-sm opacity-80 mt-1">
                              {subject.attendedLectures} of {subject.totalLectures} lectures attended
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl sm:text-2xl font-bold">{attendancePercentage}%</div>
                            <div className="text-xs sm:text-sm opacity-80">Attendance Rate</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-4 sm:mb-6 overflow-hidden">
                          <div 
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-1000 ease-out ${
                              attendancePercentage >= 90 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                              attendancePercentage >= 75 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                              'bg-gradient-to-r from-rose-400 to-pink-600'
                            }`}
                            style={{ width: `${Math.max(attendancePercentage, 5)}%` }}
                          ></div>
                        </div>

                        {subject.sessions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Sessions ({subject.sessions.length})</h4>
                            <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
                              {[...subject.sessions]
                                .sort((a, b) => {
                                  const dateA = new Date(a.rawDate);
                                  const dateB = new Date(b.rawDate);
                                  if (dateA.getTime() !== dateB.getTime()) {
                                    return dateA - dateB;
                                  }
                                  return a.id - b.id;
                                })
                                .map((session) => (
                                  <div key={session.id} className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 rounded-lg bg-white">
                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-900 text-xs sm:text-sm">{session.date}</div>
                                        <div className="text-xs text-gray-500">
                                          {session.status === 'present' ? 'Present' : 'Absent'}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                      {deleteConfirm?.type === 'session' && deleteConfirm.id === session.id ? (
                                        <div className="flex items-center space-x-1 sm:space-x-2">
                                          <button
                                            onClick={() => deleteSession(subject.id, session.id)}
                                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium"
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => deleteSession(subject.id, session.id)}
                                          className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                                          title="Delete Session"
                                        >
                                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <TableIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Attendance Records</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Complete attendance history
              </p>
            </div>
            
            {/* Overall Attendance Display */}
            {subjects.length > 0 && (
              <div className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-50 border-b border-gray-200">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Attendance:</span>
                  <span className="text-base sm:text-lg font-bold text-blue-700">{overallAttendance}%</span>
                  <span className="text-xs sm:text-sm text-gray-500">({totalAttended} of {totalLectures} lectures)</span>
                </div>
              </div>
            )}
            
            {allSessions.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
                <p className="text-gray-600 text-sm">Add lectures in the "Track Attendance" tab to see records here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-full inline-block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Subject</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Attendance %</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allSessions.map((session) => {
                        const subject = subjects.find(s => s.id === session.subjectId);
                        const subjectPct = subject && subject.totalLectures > 0 
                          ? Math.round((subject.attendedLectures / subject.totalLectures) * 100)
                          : 0;
                        
                        const subjectColor = subjectPct >= 90 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : subjectPct >= 75 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-rose-100 text-rose-800';
                        
                        return (
                          <tr key={session.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 max-w-[100px] sm:max-w-none overflow-hidden text-ellipsis">{session.subjectName}</td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600">{session.date}</td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                session.status === 'present' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {session.status === 'present' ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${subjectColor}`}>
                                {subjectPct}%
                              </span>
                            </td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              {deleteConfirm?.type === 'session' && deleteConfirm.id === session.id ? (
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <button
                                    onClick={() => deleteSession(session.subjectId, session.id)}
                                    className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => deleteSession(session.subjectId, session.id)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="text-center text-xs sm:text-sm text-gray-500">
            © 2025 Attendance Pro | Tabish
          </div>
        </div>
      </footer>
    </div>
  );
}
