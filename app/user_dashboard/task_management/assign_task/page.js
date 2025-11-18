//app/user_dashboard/task_management/assign_task/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaTasks, FaUserPlus, FaTrash, FaPaperPlane, FaUsers, 
  FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaSpinner,
  FaArrowLeft, FaEye, FaClock, FaUserCheck, FaFilter,
  FaUserTie, FaSearch, FaLayerGroup, FaIdCard, FaUserFriends
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AssignTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rosterData, setRosterData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [internUsers, setInternUsers] = useState([]);
  const [socUsers, setSocUsers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [blockedAssignees, setBlockedAssignees] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tasks, setTasks] = useState([{ 
    taskTitle: '', 
    taskType: '', 
    remark: '', 
    individualAssignees: [],
    showIndividualDropdown: false,
    isImportant: false
  }]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch current user info, roster data, intern users, and SOC users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch current user info
        const userResponse = await fetch('/api/user_dashboard/user_info');
        const userData = await userResponse.json();
        
        if (userResponse.ok) {
          setCurrentUser(userData);
          
          // Fetch today's roster - REMOVE the date parameter to let backend handle timezone
          const rosterResponse = await fetch('/api/user_dashboard/task_management/assign_task');
          const rosterResult = await rosterResponse.json();
          
          if (rosterResponse.ok && rosterResult.success) {
            setRosterData(rosterResult.data);
            
            // Auto-select next shift persons
            const nextShiftPersons = getNextShiftPersons(rosterResult.data, userData.shortName);
            setSelectedAssignees(nextShiftPersons);

            // Calculate blocked assignees (previous shifts)
            const blockedPersons = getBlockedAssignees(rosterResult.data, userData.shortName);
            setBlockedAssignees(blockedPersons);
          } else {
            throw new Error(rosterResult.message || 'Failed to fetch roster data');
          }

          // Fetch intern users (role_type = INTERN)
          const internResponse = await fetch('/api/user_dashboard/user_info?role_type=INTERN');
          const internResult = await internResponse.json();
          console.log('Intern API Response:', internResult);
          
          if (internResponse.ok && internResult.success) {
            setInternUsers(internResult.data || []);
          }

          // Fetch SOC users (role_type = SOC)
          const socResponse = await fetch('/api/user_dashboard/user_info?role_type=SOC');
          const socResult = await socResponse.json();
          console.log('SOC API Response:', socResult);
          
          if (socResponse.ok && socResult.success) {
            setSocUsers(socResult.data || []);
          }
        } else {
          throw new Error('Failed to fetch user information');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get next shift persons based on current user's shift
  const getNextShiftPersons = (roster, currentUserShortName) => {
    if (!roster || !currentUserShortName) return [];
    
    const shiftOrder = ['MORNING', 'REGULAR', 'NOON', 'EVENING', 'NIGHT'];
    
    // Find current user's shift
    const currentUserShift = Object.entries(roster).find(([key, value]) => 
      key.toLowerCase() === currentUserShortName.toLowerCase()
    )?.[1];

    if (!currentUserShift) return [];

    const currentShiftIndex = shiftOrder.indexOf(currentUserShift.toUpperCase());
    if (currentShiftIndex === -1) return [];

    // Get next shifts
    const nextShifts = shiftOrder.slice(currentShiftIndex + 1);
    
    // Find persons in next shifts (exclude OFFDAY and empty shifts)
    const nextShiftPersons = Object.entries(roster)
      .filter(([person, shift]) => 
        nextShifts.includes(shift.toUpperCase()) && 
        shift !== 'OFFDAY' && 
        shift !== '' &&
        person.toLowerCase() !== currentUserShortName.toLowerCase()
      )
      .map(([person]) => person);

    return nextShiftPersons;
  };

  // Get blocked assignees (previous shifts)
  const getBlockedAssignees = (roster, currentUserShortName) => {
    if (!roster || !currentUserShortName) return [];
    
    const shiftOrder = ['MORNING', 'REGULAR', 'NOON', 'EVENING', 'NIGHT'];
    
    // Find current user's shift
    const currentUserShift = Object.entries(roster).find(([key, value]) => 
      key.toLowerCase() === currentUserShortName.toLowerCase()
    )?.[1];

    if (!currentUserShift) return [];

    const currentShiftIndex = shiftOrder.indexOf(currentUserShift.toUpperCase());
    if (currentShiftIndex === -1) return [];

    // Get previous shifts (blocked shifts)
    const previousShifts = shiftOrder.slice(0, currentShiftIndex);
    
    // Find persons in previous shifts (exclude OFFDAY and empty shifts)
    const blockedPersons = Object.entries(roster)
      .filter(([person, shift]) => 
        previousShifts.includes(shift.toUpperCase()) && 
        shift !== 'OFFDAY' && 
        shift !== '' &&
        person.toLowerCase() !== currentUserShortName.toLowerCase()
      )
      .map(([person]) => person);

    return blockedPersons;
  };

  // Add new task field
  const addTask = () => {
    setTasks([...tasks, { 
      taskTitle: '', 
      taskType: '', 
      remark: '', 
      individualAssignees: [],
      showIndividualDropdown: false,
      isImportant: false
    }]);
  };

  // Remove task field
  const removeTask = (index) => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
    }
  };

  // Update task field
  const updateTask = (index, field, value) => {
    const newTasks = tasks.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    );
    setTasks(newTasks);
  };

  // Toggle global assignee selection
  const toggleAssignee = (personName) => {
    // Check if person is blocked
    if (blockedAssignees.includes(personName)) {
      toast.error(`Cannot assign to ${formatName(personName)} - Previous shift member`);
      return;
    }
    
    setSelectedAssignees(prev => 
      prev.includes(personName)
        ? prev.filter(name => name !== personName)
        : [...prev, personName]
    );
  };

  // Toggle individual task assignee dropdown
  const toggleIndividualDropdown = (taskIndex) => {
    const newTasks = tasks.map((task, index) => ({
      ...task,
      showIndividualDropdown: index === taskIndex ? !task.showIndividualDropdown : false
    }));
    setTasks(newTasks);
  };

  // Add individual assignee to task
  const addIndividualAssignee = (taskIndex, personName) => {
    // Check if person is blocked
    if (blockedAssignees.includes(personName)) {
      toast.error(`Cannot assign to ${formatName(personName)} - Previous shift member`);
      return;
    }

    const newTasks = tasks.map((task, index) => {
      if (index === taskIndex) {
        const updatedAssignees = task.individualAssignees.includes(personName)
          ? task.individualAssignees.filter(name => name !== personName)
          : [...task.individualAssignees, personName];
        
        return { 
          ...task, 
          individualAssignees: updatedAssignees,
          showIndividualDropdown: false
        };
      }
      return task;
    });
    setTasks(newTasks);
  };

  // Remove individual assignee from task
  const removeIndividualAssignee = (taskIndex, personName) => {
    const newTasks = tasks.map((task, index) => {
      if (index === taskIndex) {
        return {
          ...task,
          individualAssignees: task.individualAssignees.filter(name => name !== personName)
        };
      }
      return task;
    });
    setTasks(newTasks);
  };

  // Get final assignees for a task (individual + global)
  const getFinalAssignees = (task) => {
    // If individual assignees exist, use ONLY individual assignees (override global)
    if (task.individualAssignees && task.individualAssignees.length > 0) {
      return task.individualAssignees;
    }
    // Otherwise use global assignees
    return selectedAssignees;
  };

  // Format name to proper case (Borno, Tanvir)
  const formatName = (name) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Get shift for a person from roster data
  const getPersonShift = (personName) => {
    if (!rosterData || !personName) return null;
    
    // Find the person in roster data (case insensitive)
    const rosterEntry = Object.entries(rosterData).find(([key]) => 
      key.toLowerCase() === personName.toLowerCase()
    );
    
    return rosterEntry ? rosterEntry[1] : null;
  };

  // Get available persons (exclude OFFDAY and empty shifts) - Only for roster members
  const availablePersons = rosterData ? Object.entries(rosterData)
    .filter(([person, shift]) => 
      shift !== 'OFFDAY' && 
      shift !== '' && 
      shift !== null && 
      person.toLowerCase() !== currentUser?.shortName?.toLowerCase()
    )
    .sort(([aName, aShift], [bName, bShift]) => aName.localeCompare(bName)) : [];

  // Get all interns regardless of roster
  const allInterns = internUsers.map(intern => ({
    name: intern.short_name,
    shift: getPersonShift(intern.short_name), // Get shift if they're in roster, otherwise null
    isInRoster: getPersonShift(intern.short_name) !== null
  })).filter(intern => intern.name); // Filter out any null names

  // Filter persons based on active tab and search
  const filteredPersons = activeTab === 'interns' 
    ? allInterns.filter(intern => {
        const formattedName = formatName(intern.name);
        return formattedName.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : availablePersons.filter(([personName, shift]) => {
        const formattedName = formatName(personName);
        return formattedName.toLowerCase().includes(searchTerm.toLowerCase());
      });

  // Get shift badge
  const getShiftBadge = (shift) => {
    const colors = {
      'MORNING': 'bg-blue-100 text-blue-800 border border-blue-300',
      'REGULAR': 'bg-green-100 text-green-800 border border-green-300',
      'NOON': 'bg-orange-100 text-orange-800 border border-orange-300',
      'EVENING': 'bg-purple-100 text-purple-800 border border-purple-300',
      'NIGHT': 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      'OFFDAY': 'bg-red-100 text-red-800 border border-red-300',
      'INTERN': 'bg-pink-100 text-pink-800 border border-pink-300'
    };
    
    return colors[shift?.toUpperCase()] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  // Validate form before submission
  const validateForm = () => {
    // Check if at least one task has title
    const hasValidTask = tasks.some(task => task.taskTitle.trim() !== '');
    if (!hasValidTask) {
      toast.error('At least one task title is required');
      return false;
    }

    // Check if each task has at least one assignee
    const tasksWithAssignees = tasks.filter(task => 
      task.taskTitle.trim() && getFinalAssignees(task).length > 0
    );

    if (tasksWithAssignees.length === 0) {
      toast.error('Please select assignees for tasks');
      return false;
    }

    return true;
  };
  
  // Helper function to get user's shift with case-insensitive matching
  const getUserShift = (user) => {
    if (!user || !rosterData) return null;
    
    const userName = user.shortName;
    
    // Try exact match first
    if (rosterData[userName]) {
      return rosterData[userName];
    }
    
    // Try case-insensitive match
    const rosterKey = Object.keys(rosterData).find(key => 
      key.toLowerCase() === userName.toLowerCase()
    );
    
    return rosterKey ? rosterData[rosterKey] : null;
  };

  // Helper function to get shift badge with user object
  const getUserShiftBadge = (user) => {
    const shift = getUserShift(user);
    return getShiftBadge(shift);
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare tasks with their final assignees
      const tasksWithAssignees = tasks
        .filter(task => task.taskTitle.trim() !== '')
        .map(task => ({
          taskTitle: task.taskTitle,
          taskType: task.taskType,
          remark: task.remark,
          isImportant: task.isImportant,
          assignedTo: getFinalAssignees(task)
        }))
        .filter(task => task.assignedTo.length > 0);

      const response = await fetch('/api/user_dashboard/task_management/assign_task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: tasksWithAssignees,
          assignedBy: currentUser.shortName,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Tasks assigned successfully!');
        setShowConfirmation(false);
        
        // Reset form
        setTasks([{ 
          taskTitle: '', 
          taskType: '', 
          remark: '', 
          individualAssignees: [],
          showIndividualDropdown: false,
          isImportant: false
        }]);
        setSelectedAssignees(getNextShiftPersons(rosterData, currentUser.shortName));
      } else {
        throw new Error(result.message || 'Failed to assign tasks');
      }
    } catch (error) {
      console.error('Assignment failed:', error);
      toast.error(error.message || 'Failed to assign tasks');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !rosterData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-800">Loading Assignment Panel...</h3>
          <p className="text-gray-600 mt-2">Preparing your task management interface</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Enhanced Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded shadow-lg p-6 mb-6 border border-gray-200 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 rounded-full translate-y-16 -translate-x-16"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex items-center mb-4 lg:mb-0">                
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded mr-4 shadow-md">
                    <FaTasks className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Assignment</h1>
                    <p className="text-gray-600">Distribute operational tasks among team members</p>
                  </div>
                </div>
              </div>
              
              {/* Current User Info */}
              {currentUser && (
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded p-3 border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 flex items-center">
                        <FaIdCard className="mr-1" />
                        Task Coordinator
                      </div>
                      <div className="font-semibold text-gray-900">{formatName(currentUser.shortName)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-700">Current Shift</div>
                      <div
                        className={`px-0.5 py-0.5 rounded text-xs font-semibold text-center flex items-center justify-center ${getUserShiftBadge(currentUser)}`}
                      >
                        {getUserShift(currentUser) || 'Not Assigned'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-blue-50 rounded p-2 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaLayerGroup className="text-blue-500" />
                    <div className="text-sm font-medium text-blue-600">Total Tasks</div>
                  </div>
                  <div className="text-lg font-bold text-blue-800">{tasks.length}</div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded p-2 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaUsers className="text-green-500" />
                    <div className="text-sm font-medium text-green-600">Global Assignees</div>
                  </div>
                  <div className="text-lg font-bold text-green-800">{selectedAssignees.length}</div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded p-2 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaUserTie className="text-purple-500" />
                    <div className="text-sm font-medium text-purple-600">Intern Members</div>
                  </div>
                  <div className="text-lg font-bold text-purple-800">{allInterns.length}</div>
                </div>
              </div>
              
              <div className="bg-orange-50 rounded p-2 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaUserCheck className="text-orange-500" />
                    <div className="text-sm font-medium text-orange-600">Available Today</div>
                  </div>
                  <div className="text-lg font-bold text-orange-800">
                    {rosterData ? Object.keys(rosterData).filter(name => 
                      rosterData[name] && rosterData[name] !== 'OFFDAY'
                    ).length : 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Task Assignment Form */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Task Details Section */}
            <div className="bg-white rounded shadow-md p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center mb-3 sm:mb-0">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded mr-3 shadow-md">
                    <FaTasks className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
                    <p className="text-gray-600 text-sm">Add and configure tasks for assignment</p>
                  </div>
                </div>
                
                <button
                  onClick={addTask}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded hover:shadow-md transition-all duration-200 font-semibold text-sm"
                >
                  <FaUserPlus className="mr-2" />
                  Add Task
                </button>
              </div>

              {/* Task List */}
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded p-4 border shadow-sm ${
                      task.isImportant 
                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
                        : 'bg-gradient-to-br from-gray-50 to-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900 flex items-center">
                        <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center mr-2 shadow-md ${
                          task.isImportant
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}>
                          {index + 1}
                        </span>
                        Task {index + 1}
                        {task.isImportant && (
                          <span className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded-full text-xs font-bold flex items-center">
                            <FaExclamationTriangle className="mr-1" />
                            IMPORTANT
                          </span>
                        )}
                      </h3>
                      
                      {tasks.length > 1 && (
                        <button
                          onClick={() => removeTask(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      )}
                    </div>

                    {/* Task Input Fields */}
                    <div className="space-y-3 mb-3">
                      {/* Task Title - Full Width */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1">
                          Task Title *
                        </label>
                        <input
                          type="text"
                          value={task.taskTitle}
                          onChange={(e) => updateTask(index, 'taskTitle', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                          placeholder="Enter task title..."
                        />
                      </div>

                      {/* Task Type and Remark - Side by side */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {/* Task Type - 1/3 width */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">
                            Task Type
                          </label>
                          <input
                            type="text"
                            value={task.taskType}
                            onChange={(e) => updateTask(index, 'taskType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                            placeholder="e.g., Operational, Technical"
                          />
                        </div>

                        {/* Remark - 2/3 width */}
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-semibold text-gray-800 mb-1">
                            Remark
                          </label>
                          <input
                            type="text"
                            value={task.remark}
                            onChange={(e) => updateTask(index, 'remark', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                            placeholder="Additional notes..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Important Flag */}
                    <div className="flex items-center justify-between mt-3 p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded border border-yellow-200">
                      <div>
                        <label className="block text-sm font-semibold text-yellow-800 mb-1">
                          <FaExclamationTriangle className="inline mr-1 text-yellow-600" />
                          Important Task
                        </label>
                        <p className="text-xs text-yellow-600">
                          {task.isImportant 
                            ? 'This task is marked as important and will be highlighted'
                            : 'Mark this task as important for priority attention'
                          }
                        </p>
                      </div>
                      
                      <button
                        onClick={() => updateTask(index, 'isImportant', !task.isImportant)}
                        className={`flex items-center px-3 py-2 rounded font-semibold text-sm transition-all duration-200 ${
                          task.isImportant
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        <FaExclamationTriangle className="mr-1" />
                        {task.isImportant ? 'Important' : 'Mark Important'}
                      </button>
                    </div>

                    {/* Individual Assignment Section */}
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded border border-blue-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-1">
                            Individual Assignment
                          </label>
                          <p className="text-xs text-gray-600">
                            {task.individualAssignees.length > 0 
                              ? `${task.individualAssignees.length} individual assignee(s) selected`
                              : 'No individual assignees. Will use global assignees.'
                            }
                          </p>
                        </div>
                        
                        <button
                          onClick={() => toggleIndividualDropdown(index)}
                          className="flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded hover:shadow-md transition-all duration-200 mt-2 sm:mt-0 text-sm"
                        >
                          <FaUserFriends className="mr-1" />
                          Individual Assign
                        </button>
                      </div>

                      {/* Individual Assignees Display */}
                      {task.individualAssignees.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {task.individualAssignees.map(person => (
                              <span 
                                key={person}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium border border-blue-200 flex items-center"
                              >
                                {formatName(person)}
                                <button
                                  onClick={() => removeIndividualAssignee(index, person)}
                                  className="ml-1 text-blue-600 hover:text-blue-800 font-bold text-xs"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Assignees Dropdown */}
                      <AnimatePresence>
                        {task.showIndividualDropdown && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 border border-gray-300 rounded bg-white shadow-md overflow-hidden"
                          >
                            <div className="max-h-40 overflow-y-auto p-1">
                              {socUsers
                                .filter(user => {
                                  const isBlocked = blockedAssignees.includes(user.short_name);
                                  const isCurrentUser = user.short_name === currentUser?.shortName;
                                  return !isCurrentUser && !isBlocked;
                                })
                                .map(user => {
                                  const isBlocked = blockedAssignees.includes(user.short_name);
                                  return (
                                    <div
                                      key={user.short_name}
                                      onClick={() => !isBlocked && addIndividualAssignee(index, user.short_name)}
                                      className={`p-2 rounded cursor-pointer transition-colors text-sm ${
                                        isBlocked
                                          ? 'bg-red-50 text-red-700 cursor-not-allowed opacity-60'
                                          : task.individualAssignees.includes(user.short_name)
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'hover:bg-gray-100 text-gray-800'
                                      }`}
                                      title={isBlocked ? 'Cannot assign to previous shift member' : ''}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">
                                          {formatName(user.short_name)}
                                          {isBlocked && (
                                            <span className="ml-1 text-red-500 text-xs">(Previous Shift)</span>
                                          )}
                                        </span>
                                        {task.individualAssignees.includes(user.short_name) && !isBlocked && (
                                          <FaCheckCircle className="text-blue-500 text-sm" />
                                        )}
                                        {isBlocked && (
                                          <FaExclamationTriangle className="text-red-500 text-sm" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              }
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Final Assignees Preview */}
                    <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                      <div className="text-xs font-semibold text-gray-800 mb-1">
                        Final Assignees for this task:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getFinalAssignees(task).length > 0 ? (
                          getFinalAssignees(task).map(person => (
                            <span 
                              key={person}
                              className="px-1 py-1 bg-green-100 text-green-800 rounded text-xs font-medium border border-green-200"
                            >
                              {formatName(person)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-xs">No assignees selected</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Assignees Section */}
            <div className="bg-white rounded shadow-md p-6 border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex items-center mb-3 lg:mb-0">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded mr-3 shadow-md">
                    <FaUsers className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {activeTab === 'interns' ? 'Intern Assignees' : 'Global Assignees'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {activeTab === 'interns' 
                        ? `Select interns to assign all tasks (${selectedAssignees.length} selected)`
                        : `Select team members to assign all tasks (${selectedAssignees.length} selected)`
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <FaSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs for All Members vs Interns */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors text-sm ${
                    activeTab === 'all' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All Members ({availablePersons.length})
                </button>
                <button
                  onClick={() => setActiveTab('interns')}
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors flex items-center text-sm ${
                    activeTab === 'interns' 
                      ? 'border-purple-500 text-purple-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FaUserTie className="mr-1" />
                  Interns ({allInterns.length})
                </button>
              </div>

              {/* Available Persons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {activeTab === 'interns' ? (
                  allInterns.length > 0 ? (
                    allInterns
                      .filter(intern => 
                        formatName(intern.name).toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(intern => {
                        const formattedName = formatName(intern.name);
                        const isGloballySelected = selectedAssignees.includes(intern.name);
                        const isBlocked = blockedAssignees.includes(intern.name);
                        const shift = intern.shift || 'INTERN';
                        
                        return (
                          <motion.div
                            key={intern.name}
                            whileHover={{ scale: isBlocked ? 1 : 1.02 }}
                            whileTap={{ scale: isBlocked ? 1 : 0.98 }}
                            onClick={() => !isBlocked && toggleAssignee(intern.name)}
                            className={`p-2 rounded border cursor-pointer transition-all duration-200 relative overflow-hidden ${
                              isBlocked
                                ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60'
                                : isGloballySelected
                                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                            } ring-1 ring-purple-200`}
                            title={isBlocked ? 'Cannot assign to previous shift member' : ''}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                                  isBlocked
                                    ? 'bg-red-300 border-red-400'
                                    : isGloballySelected 
                                      ? 'bg-purple-500 border-purple-500' 
                                      : 'bg-white border-gray-300'
                                }`}></div>
                                <div className="flex items-center space-x-1 min-w-0 flex-1">
                                  <FaUserTie className="text-purple-500 text-xs flex-shrink-0" />
                                  <span className={`font-bold text-sm truncate ${
                                    isBlocked ? 'text-red-700' : 'text-gray-900'
                                  }`}>
                                    {formattedName}
                                    {isBlocked && (
                                      <span className="ml-1 text-red-500 text-xs">(Previous Shift)</span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <span className={`px-1 py-0.5 rounded-full text-xs font-bold ${
                                  intern.isInRoster 
                                    ? getShiftBadge(shift)
                                    : 'bg-pink-100 text-pink-800 border border-pink-300'
                                }`}>
                                  {intern.isInRoster ? shift : 'INTERN'}
                                </span>
                                {isGloballySelected && !isBlocked ? (
                                  <FaCheckCircle className="text-purple-500 text-sm flex-shrink-0" />
                                ) : isBlocked ? (
                                  <FaExclamationTriangle className="text-red-500 text-sm flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 flex-shrink-0"></div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                  ) : (
                    <div className="col-span-full text-center py-6 text-gray-500">
                      <FaUserTie className="text-2xl mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No intern members found</p>
                    </div>
                  )
                ) : (
                  filteredPersons.length > 0 ? (
                    filteredPersons.map(([personName, shift]) => {
                      const formattedName = formatName(personName);
                      const isGloballySelected = selectedAssignees.includes(personName);
                      const isBlocked = blockedAssignees.includes(personName);
                      
                      return (
                        <motion.div
                          key={personName}
                          whileHover={{ scale: isBlocked ? 1 : 1.02 }}
                          whileTap={{ scale: isBlocked ? 1 : 0.98 }}
                          onClick={() => !isBlocked && toggleAssignee(personName)}
                          className={`p-2 rounded border cursor-pointer transition-all duration-200 ${
                            isBlocked
                              ? 'border-red-300 bg-red-50 cursor-not-allowed opacity-60'
                              : isGloballySelected
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          title={isBlocked ? `Cannot assign to previous shift member (${shift})` : ''}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                                isBlocked
                                  ? 'bg-red-300 border-red-400'
                                  : isGloballySelected 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'bg-white border-gray-300'
                              }`}></div>
                              <span className={`font-bold text-sm truncate ${
                                isBlocked ? 'text-red-700' : 'text-gray-900'
                              }`}>
                                {formattedName}
                                {isBlocked && (
                                  <span className="ml-1 text-red-500 text-xs">(Previous Shift)</span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <span className={`px-1 py-1 rounded text-xs font-bold ${getShiftBadge(shift)}`}>
                                {shift}
                              </span>
                              {isGloballySelected && !isBlocked ? (
                                <FaCheckCircle className="text-blue-500 text-sm flex-shrink-0" />
                              ) : isBlocked ? (
                                <FaExclamationTriangle className="text-red-500 text-sm flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-6 text-gray-500">
                      <FaFilter className="text-2xl mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No team members found matching your criteria</p>
                    </div>
                  )
                )}
              </div>

              {/* Selection Summary */}
              {selectedAssignees.length > 0 && (
                <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FaUserCheck className="text-green-600 mr-2" />
                      <div>
                        <span className="font-semibold text-green-800 text-sm">
                          {selectedAssignees.length} person(s) selected globally
                        </span>
                        <p className="text-green-600 text-xs">
                          {activeTab === 'interns' 
                            ? 'These interns will receive all tasks without individual assignees'
                            : 'These members will receive all tasks without individual assignees'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-700 font-medium">
                        {selectedAssignees.map(name => formatName(name)).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Blocked Assignees Warning */}
              {blockedAssignees.length > 0 && (
                <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded border border-red-200">
                  <div className="flex items-center">
                    <FaExclamationTriangle className="text-red-600 mr-2" />
                    <div>
                      <span className="font-semibold text-red-800 text-sm">
                        {blockedAssignees.length} previous shift member(s) blocked from assignment
                      </span>
                      <p className="text-red-600 text-xs">
                        You cannot assign tasks to team members from previous shifts
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={loading || !tasks.some(t => t.taskTitle.trim())}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded font-bold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="mr-2" />
                    Assign Tasks
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Today's Roster Summary */}
            <div className="bg-white rounded shadow-md p-4 border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded mr-3 shadow-md">
                  <FaCalendarAlt className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Today&apos;s Roster</h2>
                  <p className="text-gray-600 text-sm">
                    {rosterData && rosterData.date ? 
                      new Date(rosterData.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 
                      new Date().toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })
                    }
                  </p>
                </div>
              </div>

              {/* Shift Summary */}
              <div className="space-y-2">
                {['MORNING', 'REGULAR', 'NOON', 'EVENING', 'NIGHT', 'OFFDAY'].map(shift => {
                  const personsInShift = rosterData ? Object.entries(rosterData)
                    .filter(([_, s]) => s?.toUpperCase() === shift)
                    .map(([name]) => formatName(name)) : [];
                  
                  if (personsInShift.length === 0) return null;

                  return (
                    <div key={shift} className="border border-gray-200 rounded p-2 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getShiftBadge(shift)}`}>
                          {shift}
                        </span>
                        <span className="text-xs text-gray-600 bg-white px-1 py-0.5 rounded border">
                          {personsInShift.length} Person(s)
                        </span>
                      </div>
                      <div className="text-xs text-gray-800 font-medium">
                        {personsInShift.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interns Section in Roster */}
              <div className="mt-3">
                <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center">
                  <FaUserTie className="mr-1 text-purple-500 text-sm" />
                  Intern Members ({allInterns.length})
                </h4>
                <div className="space-y-1">
                  {allInterns.map(intern => (
                    <div key={intern.name} className="flex items-center justify-between p-1 bg-purple-50 rounded border border-purple-200">
                      <span className="font-medium text-gray-800 text-sm">{formatName(intern.name)}</span>
                      <span className={`px-1.5 py-1 m-1 rounded text-xs font-bold ${
                        intern.isInRoster 
                          ? getShiftBadge(intern.shift)
                          : 'bg-pink-100 text-pink-800 border border-pink-300'
                      }`}>
                        {intern.isInRoster ? intern.shift : 'Not in Roster'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roster Statistics */}
              <div className="mt-3 p-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded border border-gray-300">
                <h4 className="font-semibold text-gray-800 text-sm mb-1 text-center">Roster Overview</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-1 bg-white rounded border border-gray-200">
                    <div className="text-lg font-bold text-blue-600">
                      {rosterData ? Object.keys(rosterData).filter(name => 
                        rosterData[name] && rosterData[name] !== 'OFFDAY'
                      ).length : 0}
                    </div>
                    <div className="text-gray-600">Available</div>
                  </div>
                  <div className="text-center p-1 bg-white rounded border border-gray-200">
                    <div className="text-lg font-bold text-red-600">
                      {rosterData ? Object.keys(rosterData).filter(name => 
                        rosterData[name] === 'OFFDAY'
                      ).length : 0}
                    </div>
                    <div className="text-gray-600">Off Day</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded shadow-md p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center">
                <FaClock className="mr-1 text-blue-500 text-sm" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const nextShiftPersons = getNextShiftPersons(rosterData, currentUser?.shortName);
                    setSelectedAssignees(nextShiftPersons);
                    toast.success('Auto-selected next shift members');
                  }}
                  className="w-full text-left p-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-all duration-200 hover:shadow-sm text-sm"
                >
                  <div className="font-semibold text-blue-800">Select Next Shift</div>
                  <div className="text-xs text-blue-600 mt-0.5">Auto-select from upcoming shifts</div>
                </button>
                
                <button
                  onClick={() => {
                    const allAvailable = availablePersons
                      .filter(([name]) => !blockedAssignees.includes(name))
                      .map(([name]) => name);
                    setSelectedAssignees(allAvailable);
                    toast.success('Selected all available team members');
                  }}
                  className="w-full text-left p-2 bg-green-50 hover:bg-green-100 rounded border border-green-200 transition-all duration-200 hover:shadow-sm text-sm"
                >
                  <div className="font-semibold text-green-800">Select All Available</div>
                  <div className="text-xs text-green-600 mt-0.5">Select all except Off Day & Previous Shifts</div>
                </button>

                <button
                  onClick={() => {
                    const internNames = allInterns
                      .filter(intern => !blockedAssignees.includes(intern.name))
                      .map(intern => intern.name);
                    setSelectedAssignees(internNames);
                    toast.success('Selected all available interns');
                  }}
                  className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-all duration-200 hover:shadow-sm text-sm"
                >
                  <div className="font-semibold text-purple-800">Select All Interns</div>
                  <div className="text-xs text-purple-600 mt-0.5">Select all available intern members</div>
                </button>
                
                <button
                  onClick={() => setSelectedAssignees([])}
                  className="w-full text-left p-2 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-all duration-200 hover:shadow-sm text-sm"
                >
                  <div className="font-semibold text-red-800">Clear Selection</div>
                  <div className="text-xs text-red-600 mt-0.5">Deselect all team members</div>
                </button>
              </div>
            </div>

            {/* Instructions Panel */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded shadow-md p-4 border border-indigo-200">
              <h3 className="font-bold text-indigo-900 text-base mb-2 flex items-center">
                <FaExclamationTriangle className="mr-1 text-indigo-600 text-sm" />
                How to Assign Tasks
              </h3>
              <div className="space-y-2 text-xs text-indigo-800">
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">1</div>
                  <p><strong>Global Assignees:</strong> Selected members receive ALL tasks</p>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">2</div>
                  <p><strong>Individual Assignees:</strong> Use &quot;Individual Assign&quot; for specific tasks</p>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">3</div>
                  <p><strong>Priority:</strong> Individual assignees override global assignees</p>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">4</div>
                  <p><strong>Shift Rules:</strong> Cannot assign to previous shift members</p>
                </div>
                <div className="flex items-start">
                  <div className="w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">5</div>
                  <p><strong>Important Tasks:</strong> Mark critical tasks for priority attention</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-300"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-white/20 rounded mr-3">
                    <FaCheckCircle className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Confirm Task Assignment</h3>
                    <p className="text-green-100 text-sm">Review assignment details before confirming</p>
                  </div>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {/* Tasks Summary */}
                <div className="mb-4">
                  <h4 className="font-bold text-gray-900 text-base mb-2 flex items-center">
                    <FaTasks className="mr-2 text-blue-500" />
                    Tasks to Assign ({tasks.filter(t => t.taskTitle.trim() && getFinalAssignees(t).length > 0).length})
                  </h4>
                  <div className="space-y-2">
                    {tasks
                      .filter(task => task.taskTitle.trim() && getFinalAssignees(task).length > 0)
                      .map((task, index) => {
                        const finalAssignees = getFinalAssignees(task);
                        const assignmentType = task.individualAssignees.length > 0 ? 'Individual' : 'Global';
                        const isIndividualAssignment = task.individualAssignees.length > 0;
                        
                        return (
                          <div key={index} className={`rounded p-2 border ${
                            task.isImportant 
                              ? 'bg-yellow-50 border-yellow-300' 
                              : 'bg-gray-50 border-gray-300'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {index + 1}. {task.taskTitle}
                                </span>
                                {task.isImportant && (
                                  <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white rounded-full text-xs font-bold flex items-center">
                                    <FaExclamationTriangle className="mr-1" />
                                    IMPORTANT
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                isIndividualAssignment 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-green-100 text-green-800 border border-green-300'
                              }`}>
                                {assignmentType}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700 mb-1">
                              <div>
                                <strong className="text-gray-800">Type:</strong> {task.taskType || 'Not specified'}
                              </div>
                              <div>
                                <strong className="text-gray-800">Remark:</strong> {task.remark || 'None'}
                              </div>
                            </div>
                            <div>
                              <strong className="text-gray-800 text-xs">
                                Assigned to ({finalAssignees.length}) - {isIndividualAssignment ? 'Individual' : 'Global'}:
                              </strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {finalAssignees.map(assignee => (
                                  <span 
                                    key={assignee}
                                    className={`px-1 py-0.5 rounded text-xs font-medium border ${
                                      isIndividualAssignment
                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                        : 'bg-green-100 text-green-800 border-green-200'
                                    }`}
                                  >
                                    {formatName(assignee)}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {isIndividualAssignment && (
                              <div className="mt-1 text-xs text-blue-600">
                                <FaExclamationTriangle className="inline mr-1" />
                                Individual assignment overrides global assignees
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Assignment Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded p-3 border border-blue-200">
                  <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center">
                    <FaUsers className="mr-1 text-blue-500" />
                    Assignment Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong className="text-gray-800">Assigned By:</strong>
                      <div className="text-gray-700">{formatName(currentUser?.shortName)}</div>
                    </div>
                    <div>
                      <strong className="text-gray-800">Date & Time:</strong>
                      <div className="text-gray-700">
                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-800">Total Tasks:</strong>
                      <div className="text-gray-700">
                        {tasks.filter(t => t.taskTitle.trim() && getFinalAssignees(t).length > 0).length}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-800">Global Assignees:</strong>
                      <div className="text-gray-700">
                        {selectedAssignees.length > 0 
                          ? `${selectedAssignees.length} persons` 
                          : 'None'
                        }
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-800">Important Tasks:</strong>
                      <div className="text-gray-700">
                        {tasks.filter(t => t.isImportant).length}
                      </div>
                    </div>
                    <div>
                      <strong className="text-gray-800">Blocked Assignees:</strong>
                      <div className="text-gray-700">
                        {blockedAssignees.length} previous shift members
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors font-semibold w-full sm:w-auto text-sm"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleAssign}
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded hover:shadow-md transition-all duration-200 disabled:opacity-50 font-semibold w-full sm:w-auto text-sm"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin mr-1" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="mr-1" />
                        Confirm Assignment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}