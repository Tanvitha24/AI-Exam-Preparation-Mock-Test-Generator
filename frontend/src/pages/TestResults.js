import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, ListGroup, Alert, Spinner, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const TestResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testResult, setTestResult] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('You must be logged in to view results');
        }
        
        // Fetch test details
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select('*')
          .eq('id', testId)
          .single();
        
        if (testError) throw testError;
        setTest(testData);
        
        // Fetch test result
        const { data: resultData, error: resultError } = await supabase
          .from('test_results')
          .select('*')
          .eq('test_id', testId)
          .eq('user_id', userData.user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        
        if (resultError) throw resultError;
        setTestResult(resultData);
        
        // Fetch questions
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .order('id');
        
        if (questionError) throw questionError;
        setQuestions(questionData);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching results:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [testId]);
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };
  
  const getAnswerStatus = (question, userAnswer) => {
    if (!userAnswer) return 'unanswered';
    if (userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) return 'correct';
    return 'incorrect';
  };
  
  if (loading) {
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
          Error: {error}
        </Alert>
      </Container>
    );
  }
  
  if (!testResult) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          No test results found. You may not have completed this test yet.
        </Alert>
        <Button variant="primary" onClick={() => navigate(`/take-test/${testId}`)}>
          Take This Test
        </Button>
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Test Results: {test.title}</h4>
        </Card.Header>
        
        <Card.Body>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="text-center h-100">
                <Card.Body>
                  <h1 className={`display-4 text-${getScoreColor(testResult.score)}`}>
                    {Math.round(testResult.score)}%
                  </h1>
                  <Card.Text>Your Score</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={8}>
              <Card className="h-100">
                <Card.Body>
                  <h5>Test Summary</h5>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Completed On</span>
                      <span>{new Date(testResult.completed_at).toLocaleString()}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Total Questions</span>
                      <span>{questions.length}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center">
                      <span>Correct Answers</span>
                      <span>
                        {questions.filter(q => 
                          getAnswerStatus(q, testResult.answers[q.id]) === 'correct'
                        ).length}
                      </span>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <h5 className="mb-3">Question Review</h5>
          
          {questions.map((question, index) => {
            const userAnswer = testResult.answers[question.id] || '';
            const status = getAnswerStatus(question, userAnswer);
            
            return (
              <Card key={question.id} className="mb-3">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>Question {index + 1}</span>
                  <Badge bg={status === 'correct' ? 'success' : status === 'incorrect' ? 'danger' : 'secondary'}>
                    {status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : 'Unanswered'}
                  </Badge>
                </Card.Header>
                
                <Card.Body>
                  <Card.Text>{question.question_text}</Card.Text>
                  
                  {question.question_type === 'multiple_choice' && (
                    <ListGroup variant="flush">
                      {['A', 'B', 'C', 'D'].map(option => (
                        <ListGroup.Item 
                          key={option}
                          className={`d-flex justify-content-between align-items-center ${
                            option === question.correct_answer ? 'bg-success bg-opacity-10' : 
                            (option === userAnswer && option !== question.correct_answer) ? 'bg-danger bg-opacity-10' : ''
                          }`}
                        >
                          <span>
                            {option}. {question[`option_${option.toLowerCase()}`]}
                          </span>
                          {option === question.correct_answer && (
                            <Badge bg="success">Correct Answer</Badge>
                          )}
                          {option === userAnswer && option !== question.correct_answer && (
                            <Badge bg="danger">Your Answer</Badge>
                          )}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                  
                  {question.question_type === 'text' && (
                    <>
                      <div className="mb-3">
                        <strong>Your Answer:</strong>
                        <p className={status === 'correct' ? 'text-success' : status === 'incorrect' ? 'text-danger' : 'text-muted'}>
                          {userAnswer || '(No answer provided)'}
                        </p>
                      </div>
                      
                      <div>
                        <strong>Correct Answer:</strong>
                        <p className="text-success">{question.correct_answer}</p>
                      </div>
                    </>
                  )}
                  
                  {question.explanation && (
                    <div className="mt-3 p-3 bg-light rounded">
                      <strong>Explanation:</strong>
                      <p className="mb-0">{question.explanation}</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
          
          <div className="d-flex justify-content-between mt-4">
            <Button variant="outline-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button variant="primary" onClick={() => navigate(`/take-test/${testId}`)}>
              Retake Test
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TestResults;