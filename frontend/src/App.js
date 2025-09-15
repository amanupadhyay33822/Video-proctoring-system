import React, { useState } from 'react';
import VideoCapture from './components/VideoCapture';
import ProctorDashboard from './components/ProctorDashboard';
import Report from './components/Report';
import './styles/App.css';

function App() {
  const [currentView, setCurrentView] = useState('capture');
  const [sessionId, setSessionId] = useState(null);
  const [candidateName, setCandidateName] = useState('');
  const [showStartForm, setShowStartForm] = useState(true);

  const handleStartSession = (name) => {
    setCandidateName(name);
    setShowStartForm(false);
  };

  const handleSessionCreated = (id) => {
    setSessionId(id);
  };

  const renderView = () => {
    if (showStartForm) {
      return (
        <div className="start-form">
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎥</div>
          <h2>🚀 Start Proctoring Session</h2>
          <input
            type="text"
            placeholder="👤 Enter candidate name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
          />
          <button onClick={() => handleStartSession(candidateName)} disabled={!candidateName}>
            🎯 Start Session
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'capture':
        return (
          <VideoCapture 
            candidateName={candidateName}
            onSessionCreated={handleSessionCreated}
            sessionId={sessionId}
          />
        );
      case 'dashboard':
        return <ProctorDashboard sessionId={sessionId} />;
      case 'report':
        return <Report sessionId={sessionId} />;
      default:
        return <VideoCapture />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎥 Video Proctoring System</h1>
        {!showStartForm && (
          <nav>
            <button onClick={() => setCurrentView('capture')}>📹 Video Capture</button>
            <button onClick={() => setCurrentView('dashboard')}>📊 Dashboard</button>
            <button onClick={() => setCurrentView('report')}>📋 Report</button>
          </nav>
        )}
      </header>
      <main>
        {renderView()}
      </main>
    </div>
  );
}

export default App;