import React, { useState, useEffect } from 'react';
import { Container, Tabs, Tab, Table, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('You must be logged in to access this page');
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userData.user.id)
          .single();

        if (profileError) throw profileError;
        
        if (!profileData.is_admin) {
          throw new Error('You do not have admin privileges');
        }
        
        setIsAdmin(true);
        fetchData();
      } catch (error) {
        console.error('Error checking admin status:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*, auth_users:auth.users(email)')
        .order('created_at', { ascending: false });
      
      if (userError) throw userError;
      setUsers(userData);
      
      // Fetch tests
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false });
      
      if (testError) throw testError;
      setTests(testData);
      
      // Fetch pending questions
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*, tests(title)')
        .eq('approved', false)
        .order('created_at', { ascending: false });
      
      if (questionError) throw questionError;
      setPendingQuestions(questionData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleApproveQuestion = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ approved: true })
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Refresh questions
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Error approving question:', error);
      setError(error.message);
    }
  };

  const handleRejectQuestion = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Refresh questions
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Error rejecting question:', error);
      setError(error.message);
    }
  };

  const handlePublishTest = async (testId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_published: !currentStatus })
        .eq('id', testId);
      
      if (error) throw error;
      
      // Refresh tests
      setTests(prev => prev.map(test => 
        test.id === testId ? { ...test, is_published: !currentStatus } : test
      ));
    } catch (error) {
      console.error('Error publishing test:', error);
      setError(error.message);
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Refresh users
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_admin: !currentStatus } : user
      ));
    } catch (error) {
      console.error('Error toggling admin status:', error);
      setError(error.message);
    }
  };

  const openQuestionModal = (question) => {
    setCurrentQuestion(question);
    setShowQuestionModal(true);
  };

  if (loading && !isAdmin) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Admin Panel</h2>
      
      <Tabs defaultActiveKey="questions" className="mb-4">
        <Tab eventKey="questions" title="Pending Questions">
          {pendingQuestions.length === 0 ? (
            <Alert variant="info">No pending questions to review</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingQuestions.map(question => (
                  <tr key={question.id}>
                    <td>{question.tests?.title}</td>
                    <td>
                      <Button 
                        variant="link" 
                        onClick={() => openQuestionModal(question)}
                        className="p-0 text-decoration-none"
                      >
                        {question.question_text.substring(0, 50)}...
                      </Button>
                    </td>
                    <td>{question.question_type}</td>
                    <td>{new Date(question.created_at).toLocaleString()}</td>
                    <td>
                      <Button 
                        variant="success" 
                        size="sm" 
                        className="me-2"
                        onClick={() => handleApproveQuestion(question.id)}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleRejectQuestion(question.id)}
                      >
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Tab>
        
        <Tab eventKey="tests" title="Tests">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id}>
                  <td>{test.title}</td>
                  <td>{test.subject}</td>
                  <td>{test.profiles?.full_name}</td>
                  <td>{new Date(test.created_at).toLocaleString()}</td>
                  <td>
                    <Badge bg={test.is_published ? 'success' : 'secondary'}>
                      {test.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td>
                    <Button 
                      variant={test.is_published ? 'warning' : 'success'} 
                      size="sm"
                      onClick={() => handlePublishTest(test.id, test.is_published)}
                    >
                      {test.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        
        <Tab eventKey="users" title="Users">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.auth_users?.email}</td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                  <td>
                    <Badge bg={user.is_admin ? 'primary' : 'secondary'}>
                      {user.is_admin ? 'Admin' : 'User'}
                    </Badge>
                  </td>
                  <td>
                    <Button 
                      variant={user.is_admin ? 'warning' : 'primary'} 
                      size="sm"
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                    >
                      {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
      
      {/* Question Review Modal */}
      <Modal show={showQuestionModal} onHide={() => setShowQuestionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Review Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentQuestion && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Question Text</Form.Label>
                <Form.Control as="textarea" rows={3} value={currentQuestion.question_text} readOnly />
              </Form.Group>
              
              {currentQuestion.question_type === 'multiple_choice' && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Options</Form.Label>
                    <Table bordered>
                      <tbody>
                        <tr>
                          <td width="50">A</td>
                          <td>{currentQuestion.option_a}</td>
                        </tr>
                        <tr>
                          <td>B</td>
                          <td>{currentQuestion.option_b}</td>
                        </tr>
                        <tr>
                          <td>C</td>
                          <td>{currentQuestion.option_c}</td>
                        </tr>
                        <tr>
                          <td>D</td>
                          <td>{currentQuestion.option_d}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Form.Group>
                </>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Correct Answer</Form.Label>
                <Form.Control value={currentQuestion.correct_answer} readOnly />
              </Form.Group>
              
              {currentQuestion.explanation && (
                <Form.Group className="mb-3">
                  <Form.Label>Explanation</Form.Label>
                  <Form.Control as="textarea" rows={2} value={currentQuestion.explanation} readOnly />
                </Form.Group>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Difficulty</Form.Label>
                <Form.Control value={currentQuestion.difficulty || 'Not specified'} readOnly />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQuestionModal(false)}>
            Close
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              handleRejectQuestion(currentQuestion.id);
              setShowQuestionModal(false);
            }}
          >
            Reject
          </Button>
          <Button 
            variant="success" 
            onClick={() => {
              handleApproveQuestion(currentQuestion.id);
              setShowQuestionModal(false);
            }}
          >
            Approve
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminPanel;