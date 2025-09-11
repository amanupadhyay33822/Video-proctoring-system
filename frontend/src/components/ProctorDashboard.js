import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Line, Doughnut } from 'react-chartjs-2';
import { getSessionReport } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const ProctorDashboard = ({ sessionId }) => {
  const [events, setEvents] = useState([]);
  const [eventCounts, setEventCounts] = useState({
    focus_lost: 0,
    no_face: 0,
    multiple_faces: 0,
    phone_detected: 0,
    book_detected: 0,
    device_detected: 0,
    looking_away: 0
  });
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    // Fetch existing session data
    if (sessionId) {
      fetchSessionData();
    }

    socket.on('event-update', (data) => {
      if (data.sessionId === sessionId) {
        setEvents(prev => [...prev, data.event]);
        updateEventCounts(data.event.type);
      }
    });

    return () => {
      socket.off('event-update');
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const data = await getSessionReport(sessionId);
      setSessionData(data);
      
      // Process existing events
      if (data.events) {
        const counts = { ...eventCounts };
        data.events.forEach(event => {
          counts[event.eventType] = (counts[event.eventType] || 0) + 1;
        });
        setEventCounts(counts);
        
        // Convert events to display format
        const displayEvents = data.events.map(event => ({
          id: event._id,
          timestamp: new Date(event.timestamp).toLocaleTimeString(),
          type: event.eventType,
          message: event.details
        }));
        setEvents(displayEvents);
      }
    } catch (error) {
      console.error('Failed to fetch session data:', error);
    }
  };

  const updateEventCounts = (eventType) => {
    setEventCounts(prev => ({
      ...prev,
      [eventType]: (prev[eventType] || 0) + 1
    }));
  };

  const lineChartData = {
    labels: events.map(e => e.timestamp),
    datasets: [
      {
        label: 'Events Over Time',
        data: events.map((_, index) => index + 1),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Event Timeline'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Events'
        }
      }
    }
  };

  const doughnutChartData = {
    labels: Object.keys(eventCounts).map(key => key.replace(/_/g, ' ').toUpperCase()),
    datasets: [
      {
        label: 'Event Count',
        data: Object.values(eventCounts),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(199, 199, 199, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)'
        ],
        borderWidth: 1,
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Event Distribution'
      }
    }
  };

  if (!sessionId) {
    return (
      <div className="proctor-dashboard">
        <h2>Proctoring Dashboard</h2>
        <p style={{ textAlign: 'center', padding: '40px' }}>
          Please start a session first to view the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="proctor-dashboard">
      <h2>Proctoring Dashboard</h2>
      {sessionData && (
        <div className="session-info">
          <p><strong>Candidate:</strong> {sessionData.candidateName}</p>
          <p><strong>Session Start:</strong> {new Date(sessionData.startTime).toLocaleString()}</p>
        </div>
      )}
      <div className="dashboard-grid">
        <div className="chart-container">
          <h3>Event Timeline</h3>
          {events.length > 0 ? (
            <Line data={lineChartData} options={lineChartOptions} />
          ) : (
            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No events recorded yet. Try the test buttons!
            </p>
          )}
        </div>
        
        <div className="chart-container">
          <h3>Event Distribution</h3>
          {Object.values(eventCounts).some(count => count > 0) ? (
            <Doughnut data={doughnutChartData} options={doughnutOptions} />
          ) : (
            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No events to display
            </p>
          )}
        </div>

        <div className="recent-events">
          <h3>Recent Events</h3>
          <div className="events-list">
            {events.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No events yet</p>
            ) : (
              events.slice(-10).reverse().map((event, index) => (
                <div key={event.id || index} className="event-item">
                  <span className="event-time">{event.timestamp}</span>
                  <span className="event-type">{event.type.replace(/_/g, ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="summary-stats">
          <h3>Summary Statistics</h3>
          {Object.entries(eventCounts).map(([type, count]) => (
            <div key={type} className="stat-row">
              <span>{type.replace(/_/g, ' ')}:</span>
              <span>{count}</span>
            </div>
          ))}
          <div className="stat-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #eee' }}>
            <span><strong>Total Events:</strong></span>
            <span><strong>{Object.values(eventCounts).reduce((a, b) => a + b, 0)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProctorDashboard;