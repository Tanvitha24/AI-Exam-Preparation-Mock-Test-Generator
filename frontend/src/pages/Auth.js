import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  
  useEffect(() => {
    // Set active tab based on route
    if (location.pathname === '/register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [location.pathname]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use backend API for login
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errorData.detail || `Login failed: ${response.status}`);
      }

      const loginData = await response.json();
      
      if (loginData.user) {
        // Also try to sync with Supabase if available
        try {
          const { data: supabaseData } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (supabaseData?.user) {
            localStorage.setItem('user', JSON.stringify({ 
              email: supabaseData.user.email, 
              id: supabaseData.user.id 
            }));
          }
        } catch (supabaseErr) {
          // Supabase sync failed, but backend login succeeded, so continue
          console.log('Supabase sync failed, but backend login succeeded');
        }
        
        localStorage.setItem('user', JSON.stringify({ 
          email: loginData.user.email, 
          id: loginData.user.id 
        }));
        navigate('/dashboard');
      } else {
        setError('Login failed: no user data returned');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.message && (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.name === 'TypeError')) {
        setError('Failed to connect to server. Please ensure the backend is running at http://localhost:8000');
      } else {
        setError(err.message || 'An unexpected error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      // Registration successful, switch to login tab
      setActiveTab('login');
      setError('');
      alert('Registration successful! Please login with your credentials.');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="justify-content-center my-5">
        <Col md={6}>
          <div className="card p-4 shadow">
            <h2 className="text-center mb-4">Welcome</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => {
                setActiveTab(k);
                setError('');
                // Update URL when switching tabs
                navigate(k === 'register' ? '/register' : '/login', { replace: true });
              }}
              className="mb-3"
            >
              <Tab eventKey="login" title="Login">
                <Form onSubmit={handleLogin} className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mt-3"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </Form>
              </Tab>

              <Tab eventKey="register" title="Sign Up">
                <Form onSubmit={handleRegister} className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Enter your full name"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Create a password"
                      minLength={6}
                    />
                    <Form.Text className="text-muted">
                      Password must be at least 6 characters long
                    </Form.Text>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mt-3"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </Form>
              </Tab>
            </Tabs>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Auth;

