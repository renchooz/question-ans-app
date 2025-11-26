import React from 'react';

const ThankYou = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-xl w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Thank you!</h1>
        <p className="text-gray-600">
          You&apos;ve answered every available question. We appreciate your dedication.
          Check back later—new questions will appear here as soon as they are added.
        </p>
      </div>
    </div>
  );
};

export default ThankYou;


