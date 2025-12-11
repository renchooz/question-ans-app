import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [answerFeedback, setAnswerFeedback] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Require payment for regular users
  useEffect(() => {
    if (!loading && user?.role === 'user' && localStorage.getItem('hasPaid') !== 'true') {
      navigate('/payment');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (
      !loading &&
      questions.length > 0 &&
      answeredQuestions.size === questions.length
    ) {
      navigate('/thank-you');
    }
  }, [loading, questions.length, answeredQuestions, navigate]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/questions`);
      setQuestions(response.data.questions);
      
      // Fetch user's answered questions
      const answersResponse = await axios.get(`${API_BASE_URL}/answers/my-answers`);
      const answeredIds = new Set(answersResponse.data.answers.map((a) => a.question._id));
      const feedbackMap = {};
      let correctTotal = 0;
      answersResponse.data.answers.forEach((answer) => {
        feedbackMap[answer.question._id] = {
          isCorrect: answer.isCorrect,
          correctAnswer: answer.question.correctAnswer,
          selectedOption: answer.selectedOption
        };
        if (answer.isCorrect) {
          correctTotal += 1;
        }
      });

      setAnswerFeedback(feedbackMap);
      setCorrectCount(correctTotal);
      setAnsweredQuestions(answeredIds);
    } catch (error) {
      toast.error('Failed to fetch questions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null) {
      toast.error('Please select an option');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (answeredQuestions.has(currentQuestion._id)) {
      toast.error('You have already answered this question');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/answers`, {
        questionId: currentQuestion._id,
        selectedOption
      });

      const updatedAnswered = new Set([...answeredQuestions, currentQuestion._id]);
      setAnsweredQuestions(updatedAnswered);
      setSelectedOption(null);
      setAnswerFeedback((prev) => ({
        ...prev,
        [currentQuestion._id]: {
          isCorrect: response.data.answer.isCorrect,
          correctAnswer: response.data.answer.correctAnswer,
          selectedOption
        }
      }));
      if (response.data.answer.isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }

      // Move to next question if available
      if (
        updatedAnswered.size !== questions.length &&
        currentQuestionIndex < questions.length - 1
      ) {
        setTimeout(() => {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        }, 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">No questions available</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = answeredQuestions.has(currentQuestion._id);
  const feedback = answerFeedback[currentQuestion._id];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Question Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.username}!</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                Correct Answers: {correctCount}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-purple-700">
                Chapter: {currentQuestion.chapter || 'General'}
              </span>
              <span className="text-xs text-gray-500">
                Category: {currentQuestion.category || 'General'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 leading-snug">
              {currentQuestion.question}
            </h2>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                let optionState = '';
                if (feedback) {
                  if (index === feedback.correctAnswer) {
                    optionState = 'border-green-500 bg-green-50';
                  } else if (index === feedback.selectedOption) {
                    optionState = 'border-red-500 bg-red-50';
                  } else {
                    optionState = 'border-gray-200 opacity-80';
                  }
                }

                const isSelected = selectedOption === index;
                return (
                <button
                  key={index}
                  onClick={() => !isAnswered && setSelectedOption(index)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    feedback
                      ? optionState
                      : isAnswered
                      ? 'cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  } ${feedback ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                        feedback
                          ? index === feedback.correctAnswer
                            ? 'border-green-500 bg-green-500 text-white'
                            : index === feedback.selectedOption
                            ? 'border-red-500 bg-red-500 text-white'
                            : 'border-gray-300'
                          : selectedOption === index
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {feedback ? (
                        index === feedback.correctAnswer ? (
                          <span className="text-sm font-bold">✓</span>
                        ) : index === feedback.selectedOption ? (
                          <span className="text-sm font-bold">✕</span>
                        ) : null
                      ) : (
                        selectedOption === index && <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-gray-800">{option}</span>
                  </div>
                </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="w-full sm:w-auto px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleSubmitAnswer}
              disabled={isAnswered || submitting || selectedOption === null}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : isAnswered ? 'Already Answered' : 'Submit Answer'}
            </button>
            <button
              onClick={() =>
                setCurrentQuestionIndex(
                  Math.min(questions.length - 1, currentQuestionIndex + 1)
                )
              }
              disabled={
                currentQuestionIndex === questions.length - 1 || !isAnswered
              }
              className="w-full sm:w-auto px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

