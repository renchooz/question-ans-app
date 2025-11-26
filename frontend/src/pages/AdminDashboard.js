import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

const RETENTION_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const formatDateTime = (value, options) => {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString(undefined, options);
};

const getRetentionExpiry = (question) => {
  if (!question?.deletedAt) {
    return null;
  }

  if (question.retentionExpiresAt) {
    return new Date(question.retentionExpiresAt);
  }

  return new Date(new Date(question.deletedAt).getTime() + RETENTION_DAYS * DAY_IN_MS);
};

const getRetentionCountdown = (question) => {
  const expiry = getRetentionExpiry(question);
  if (!expiry) {
    return null;
  }

  const diff = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_IN_MS));
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [loggedInCount, setLoggedInCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    category: 'General'
  });
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const activeQuestions = useMemo(
    () => questions.filter((question) => !question.deletedAt),
    [questions]
  );
  const archivedQuestions = useMemo(
    () => questions.filter((question) => question.deletedAt),
    [questions]
  );
  const groupedResults = useMemo(() => {
    if (!results.length) {
      return [];
    }

    const map = results.reduce((acc, entry) => {
      if (!entry.user) {
        return acc;
      }

      const userId = entry.user._id;
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          entries: []
        };
      }
      acc[userId].entries.push(entry);
      return acc;
    }, {});

    return Object.values(map)
      .map((group) => {
        const sortedEntries = group.entries.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        return {
          ...group,
          entries: sortedEntries,
          lastActivity: sortedEntries[0]?.createdAt
        };
      })
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }, [results]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchQuestions(),
          fetchAnalytics(),
          fetchResults(),
          fetchUsers(),
          fetchLoggedInUsers()
        ]);
      } catch (error) {
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    const interval = setInterval(fetchLoggedInUsers, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/questions`);
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/analytics`);
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/results`);
      setResults(response.data.results);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLoggedInUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/logged-in-users`);
      setLoggedInCount(response.data.loggedInUsers);
    } catch (error) {
      console.error('Failed to fetch logged in users:', error);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!questionForm.question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    
    if (questionForm.options.some(opt => !opt.trim())) {
      toast.error('Please fill all 4 options');
      return;
    }

    try {
      if (editingQuestion) {
        await axios.put(
          `${API_BASE_URL}/admin/questions/${editingQuestion._id}`,
          questionForm
        );
        toast.success('Question updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/admin/questions`, questionForm);
        toast.success('Question added successfully');
      }
      
      setShowQuestionModal(false);
      setEditingQuestion(null);
      setQuestionForm({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        category: 'General'
      });
      fetchQuestions();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save question');
    }
  };

  const handleEditQuestion = (question) => {
    if (question.deletedAt) {
      toast.error('Archived questions cannot be edited');
      return;
    }

    setEditingQuestion(question);
    setQuestionForm({
      question: question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      category: question.category || 'General'
    });
    setShowQuestionModal(true);
  };

  const handleArchiveQuestion = async (id) => {
    if (
      !window.confirm(
        `Archive this question? Users will stop seeing it immediately, but analytics stay for ${RETENTION_DAYS} days.`
      )
    ) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/admin/questions/${id}`);
      toast.success('Question archived. Analytics retained for 30 days.');
      fetchQuestions();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to archive question');
    }
  };

  const handlePurgeQuestion = async (id) => {
    if (
      !window.confirm(
        'This will permanently remove the question history, including analytics. Continue?'
      )
    ) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/admin/questions/${id}/permanent`);
      toast.success('Question history deleted');
      fetchQuestions();
      fetchAnalytics();
      fetchResults();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete history');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  if (loading && activeTab === 'questions') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.username}!</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="bg-blue-50 flex-1 sm:flex-none px-4 py-2 rounded-lg text-center sm:text-left">
                <p className="text-sm text-gray-600">Logged In Users</p>
                <p className="text-2xl font-bold text-blue-600">{loggedInCount}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 sm:px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                activeTab === 'questions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 sm:px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-4 sm:px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                activeTab === 'results'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 sm:px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Users
            </button>
          </div>
        </div>

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Manage Questions</h2>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setQuestionForm({
                      question: '',
                      options: ['', '', '', ''],
                      correctAnswer: 0,
                      category: 'General'
                    });
                    setShowQuestionModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-8">
                {activeQuestions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">Live Questions</h3>
                      <span className="text-sm text-gray-500">
                        {activeQuestions.length} active
                      </span>
                    </div>
                    <div className="space-y-4">
                      {activeQuestions.map((q) => (
                        <div
                          key={q._id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {q.question}
                              </h3>
                              <div className="space-y-1 mb-3">
                                {q.options.map((opt, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center ${
                                      idx === q.correctAnswer
                                        ? 'text-green-600 font-medium'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    <span className="mr-2">
                                      {idx === q.correctAnswer ? '✓' : '○'}
                                    </span>
                                    {opt}
                                  </div>
                                ))}
                              </div>
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {q.category}
                              </span>
                            </div>
                            <div className="flex gap-2 md:ml-4 flex-wrap">
                              <button
                                onClick={() => handleEditQuestion(q)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleArchiveQuestion(q._id)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {archivedQuestions.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Archived (auto-delete after 30 days)
                      </h3>
                      <span className="text-sm text-gray-500">
                        {archivedQuestions.length} pending removal
                      </span>
                    </div>
                    <div className="space-y-4">
                      {archivedQuestions.map((q) => {
                        const countdown = getRetentionCountdown(q);
                        const expiry = getRetentionExpiry(q);
                        return (
                          <div
                            key={q._id}
                            className="border border-dashed border-red-200 rounded-lg p-4 bg-red-50"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {q.question}
                                  </h3>
                                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                    Archived
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Archived on{' '}
                                  <span className="font-medium">
                                    {formatDateTime(q.deletedAt, {
                                      dateStyle: 'medium',
                                      timeStyle: 'short'
                                    })}
                                  </span>{' '}
                                  • Auto deletion in{' '}
                                  <span className="font-medium">{countdown} days</span> (
                                  {formatDateTime(expiry, {
                                    dateStyle: 'medium'
                                  })}
                                  )
                                </p>
                                <div className="space-y-1">
                                  {q.options.map((opt, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-center ${
                                        idx === q.correctAnswer
                                          ? 'text-green-600 font-medium'
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      <span className="mr-2">
                                        {idx === q.correctAnswer ? '✓' : '○'}
                                      </span>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2 md:ml-4 flex-wrap">
                                <button
                                  onClick={() => handlePurgeQuestion(q._id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                  Delete History
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeQuestions.length === 0 && archivedQuestions.length === 0 && (
                  <p className="text-gray-500">No questions available.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analytics.map((item) => (
              <div key={item.questionId} className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  {item.question}
                </h3>
                {item.deletedAt && (
                  <p className="mb-4 text-sm text-red-600">
                    Archived • scheduled removal on{' '}
                    <span className="font-semibold">
                      {formatDateTime(item.retentionExpiresAt, { dateStyle: 'medium' })}
                    </span>
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Answers</p>
                    <p className="text-2xl font-bold text-blue-600">{item.totalAnswers}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Correct</p>
                    <p className="text-2xl font-bold text-green-600">{item.correctAnswers}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Incorrect</p>
                    <p className="text-2xl font-bold text-red-600">{item.incorrectAnswers}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Accuracy</p>
                    <p className="text-2xl font-bold text-purple-600">{item.accuracy}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700">Option Distribution:</h4>
                  {item.optionStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-700">{stat.option}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {stat.count} ({stat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${stat.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Results by User</h2>
              <p className="text-sm text-gray-500">
                {groupedResults.length} user{groupedResults.length === 1 ? '' : 's'} with activity
              </p>
            </div>
            {groupedResults.length === 0 ? (
              <p className="text-gray-500">No answers have been submitted yet.</p>
            ) : (
              <div className="space-y-6">
                {groupedResults.map((group) => (
                  <div
                    key={group.user._id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {group.user.username}
                        </h3>
                        <p className="text-sm text-gray-500">{group.user.email}</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        Last activity:{' '}
                        <span className="font-medium">
                          {formatDateTime(group.lastActivity, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {group.entries.map((entry) => (
                        <div
                          key={entry._id}
                          className="p-4 bg-gray-50 rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{entry.question.question}</p>
                            <p className="text-sm text-gray-500">
                              Answered on{' '}
                              {formatDateTime(entry.createdAt, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <div>
                              <p className="text-xs uppercase text-gray-500 tracking-wide">
                                Selected
                              </p>
                              <p className="font-semibold text-gray-800">
                                {entry.question.options[entry.selectedOption]}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                entry.isCorrect
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {entry.isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">All Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {u.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            u.isLoggedIn
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {u.isLoggedIn ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Question Modal */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h2>
              <form onSubmit={handleQuestionSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question
                  </label>
                  <textarea
                    value={questionForm.question}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, question: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="mb-2 flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={questionForm.correctAnswer === idx}
                        onChange={() =>
                          setQuestionForm({ ...questionForm, correctAnswer: idx })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...questionForm.options];
                          newOptions[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOptions });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Option ${idx + 1}`}
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={questionForm.category}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuestionModal(false);
                      setEditingQuestion(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingQuestion ? 'Update' : 'Add'} Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

