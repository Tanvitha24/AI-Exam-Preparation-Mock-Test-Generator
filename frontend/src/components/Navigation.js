import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import DarkModeToggle from './DarkModeToggle';
import { getCurrentUser, clearStoredUser } from '../utils/authHelpers';

const Navigation = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for active session
    const checkSession = async () => {
      const activeUser = await getCurrentUser();
      setUser(activeUser);
       // Determine admin status only if we have a real Supabase session
       if (activeUser && activeUser.id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', activeUser.id)
            .maybeSingle();
          setIsAdmin(profileData?.is_admin || false);
        } catch (err) {
          // If the query fails (e.g., offline mode) just assume not admin
          setIsAdmin(false);
        }
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setIsAdmin(session?.user?.user_metadata?.is_admin || false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await clearStoredUser();
    setUser(null);
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">AI Exam Prep</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            {user && (
              <>
                <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/question-generator">Question Generator</Nav.Link>
                <Nav.Link as={Link} to="/create-test">Create Test</Nav.Link>
                {isAdmin && (
                  <Nav.Link as={Link} to="/admin">Admin Panel</Nav.Link>
                )}
              </>
            )}
          </Nav>
          <Nav className="d-flex align-items-center">
            <div className="me-3">
              <DarkModeToggle />
            </div>
            {user ? (
              <Button variant="outline-light" onClick={handleLogout}>Logout</Button>
            ) : (
              <Nav.Link as={Link} to="/login">Login / Sign Up</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;