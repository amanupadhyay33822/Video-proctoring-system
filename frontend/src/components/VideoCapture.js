import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceDetection } from '../services/detection';
import { startSession, endSession, logEvent } from '../services/api';
import io from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

const VideoCapture = ({ candidateName, onSessionCreated, sessionId: propSessionId }) => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [sessionId, setSessionId] = useState(propSessionId);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    focusLostCount: 0,
    suspiciousEvents: 0
  });
  const [detectionStarted, setDetectionStarted] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const faceDetectionRef = useRef(null);

  useEffect(() => {
    if (candidateName && !sessionId) {
      initializeSession();
    }

    return () => {
      if (faceDetectionRef.current) {
        faceDetectionRef.current.stop();
      }
    };
  }, [candidateName]);

  const initializeSession = async () => {
    try {
      const response = await startSession(candidateName);
      const newSessionId = response.sessionId;
      setSessionId(newSessionId);
      onSessionCreated(newSessionId);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please check if the backend is running.');
    }
  };

  const startDetection = useCallback(() => {
    if (webcamRef.current && webcamRef.current.video && !detectionStarted) {
      console.log('Starting detection...');
      setDetectionStarted(true);
      setCameraError(false);
      
      faceDetectionRef.current = new FaceDetection(
        webcamRef.current.video,
        handleDetectionEvent
      );
      
      setTimeout(() => {
        faceDetectionRef.current.start().catch(console.error);
      }, 1000);
    }
  }, [detectionStarted]);

  const handleDetectionEvent = useCallback(async (event) => {
    const newAlert = {
      id: Date.now(),
      ...event,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 10));
    
    if (event.type === 'focus_lost' || event.type === 'looking_away') {
      setStats(prev => ({ ...prev, focusLostCount: prev.focusLostCount + 1 }));
    } else {
      setStats(prev => ({ ...prev, suspiciousEvents: prev.suspiciousEvents + 1 }));
    }

    if (sessionId) {
      try {
        await logEvent({
          sessionId,
          eventType: event.type,
          details: event.message,
          duration: event.duration
        });

        socket.emit('proctoring-event', {
          sessionId,
          event: newAlert
        });
      } catch (error) {
        console.error('Failed to log event:', error);
      }
    }
  }, [sessionId]);

  // Test functions to simulate events
  const simulateEvent = (type, message, severity = 'medium') => {
    handleDetectionEvent({
      type,
      severity,
      message
    });
  };

  const handleStartRecording = useCallback(() => {
    if (webcamRef.current && webcamRef.current.stream) {
      setIsRecording(true);
      setRecordedChunks([]);

      const stream = webcamRef.current.stream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      });

      mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorderRef.current.start();
    }
  }, []);

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) {
      setRecordedChunks(prev => [...prev, data]);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleEndSession = async () => {
    if (isRecording) {
      handleStopRecording();
    }

    if (faceDetectionRef.current) {
      faceDetectionRef.current.stop();
    }

    // End session in backend
    if (sessionId) {
      try {
        await endSession(sessionId);
        alert('Session ended successfully!');
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
  };

  const handleCameraError = () => {
    setCameraError(true);
    console.error('Camera error occurred');
  };

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  return (
    <div className="video-capture-container">
      <div className="video-section">
        <h2>🎥 Interview Session - {candidateName}</h2>
        <div className="video-wrapper">
          <div className="webcam-wrapper">
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              onUserMedia={startDetection}
              onUserMediaError={handleCameraError}
              mirrored={true}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
          {cameraError && (
            <div className="camera-error">
              Camera access denied or not available. Please check your camera settings.
            </div>
          )}
          <div className="video-controls">
            {!isRecording ? (
              <button onClick={handleStartRecording} className="record-btn">
                Start Recording
              </button>
            ) : (
              <button onClick={handleStopRecording} className="stop-btn">
                Stop Recording
              </button>
            )}
            <button onClick={handleEndSession} className="end-session-btn">
              End Session
            </button>
          </div>
          
          <div className="test-controls">
            <h4>🧪 Test Detection Events:</h4>
            <button onClick={() => simulateEvent('looking_away', 'Candidate looked away from screen', 'medium')}>
              👀 Simulate Looking Away
            </button>
            <button onClick={() => simulateEvent('phone_detected', 'Mobile phone detected', 'high')}>
              📱 Simulate Phone Detection
            </button>
            <button onClick={() => simulateEvent('multiple_faces', 'Multiple faces detected', 'high')}>
              👥 Simulate Multiple Faces
            </button>
            <button onClick={() => simulateEvent('no_face', 'No face detected for 10 seconds', 'high')}>
              🚫 Simulate No Face
            </button>
          </div>
        </div>
      </div>

      <div className="monitoring-section">
        <div className="stats-panel">
          <h3>📊 Session Statistics</h3>
          <div className="stat-item">
            <span className="stat-label">🎯 Focus Lost:</span>
            <span className="stat-value">{stats.focusLostCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">⚠️ Suspicious Events:</span>
            <span className="stat-value">{stats.suspiciousEvents}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">🆔 Session ID:</span>
            <span className="stat-value" style={{ fontSize: '0.8em' }}>
              {sessionId || 'Not started'}
            </span>
          </div>
        </div>

        <div className="alerts-panel">
          <h3>🚨 Real-time Alerts</h3>
          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✅</div>
                <p style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  Monitoring active - No alerts yet
                </p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`alert alert-${alert.severity}`}>
                  <span className="alert-time">⏰ {alert.timestamp}</span>
                  <span className="alert-message">🚨 {alert.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCapture;