import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Payment = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleProceed = () => {
    localStorage.setItem('hasPaid', 'true');
    navigate('/dashboard');
  };

  // If somehow an admin lands here, skip to dashboard
  if (user?.role === 'admin') {
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Required</h1>
          <p className="text-gray-600">Pay ₹10 to proceed to the test (demo).</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-blue-700">₹10</p>
          <p className="text-sm text-gray-600 mt-1">One-time access fee (demo)</p>
        </div>
        <button
          onClick={handleProceed}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Pay &amp; Proceed
        </button>
      </div>
    </div>
  );
};

export default Payment;

