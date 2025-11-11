import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Form, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Fetch test and questions
  useEffect(() => {
    const fetchTestAndQuestions = async () => {
      try {
        setLoading(true);
        
        // Fetch test details
        // Get current user (may be null for anonymous access)
        const { data: userData } = await supabase.auth.getUser();
        
        // Determine access rules based on user role
        let testQuery = supabase
          .from('tests')
          .select('*')
          .eq('id', testId);

        if (userData?.user?.id) {
          // Check if current user is admin
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', userData.user.id)
            .maybeSingle();

          const isAdmin = !!profileData?.is_admin;

          if (!isAdmin) {
            // Non-admin logged-in users: allow if published OR owner
            testQuery = testQuery.or(`is_published.eq.true,user_id.eq.${userData.user.id}`);
          }
          // For admin we leave the query as is (they can access any test)
        } else {
          // Anonymous access: only published tests are visible
          testQuery = testQuery.eq('is_published', true);
        }
        
        const { data: testData, error: testError } = await testQuery.maybeSingle();
        
        if (testError) throw testError;
        if (!testData) throw new Error('Test not found');
        
        setTest(testData);
        
        // Set timer if test has time limit
        if (testData.time_limit) {
          setTimeLeft(testData.time_limit * 60); // Convert minutes to seconds
        }
        
        // Fetch questions for this test
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', testId)
          .eq('approved', true)
          .order('id');
        
        if (questionError) throw questionError;
        
        setQuestions(questionData);
        
        // Initialize answers object
        const initialAnswers = {};
        questionData.forEach(q => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching test:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchTestAndQuestions();
  }, [testId]);
  
  // Timer countdown
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0 || testSubmitted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    if (timeLeft <= 0) {
      handleSubmitTest();
    }
    
    return () => clearInterval(timer);
  }, [timeLeft, testSubmitted]);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Navigate to next/previous question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  // Submit test
  const handleSubmitTest = async () => {
    try {
      setLoading(true);
      
      // Calculate score
      let correctAnswers = 0;
      let totalQuestions = questions.length;
      
      questions.forEach(question => {
        if (answers[question.id]?.toLowerCase() === question.correct_answer?.toLowerCase()) {
          correctAnswers++;
        }
      });
      
      const score = (correctAnswers / totalQuestions) * 100;
      
      // Save test result to database
      const { data: user } = await supabase.auth.getUser();
      
      const { error: resultError } = await supabase
        .from('test_results')
        .insert({
          test_id: testId,
          user_id: user.user.id,
          score: score,
          answers: answers,
          completed_at: new Date().toISOString()
        });
      
      if (resultError) throw resultError;
      
      setTestSubmitted(true);
      setLoading(false);
      
      // Navigate to results page
      navigate(`/test-results/${testId}`);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      setError(error.message);
      setLoading(false);
    }
  };
  
  if (loading && !test) {
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
  
  if (!test || questions.length === 0) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          This test has no questions or is not available.
        </Alert>
      </Container>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <h4 className="mb-0">{test.title}</h4>
          {timeLeft && (
            <div className="bg-light text-dark px-3 py-1 rounded">
              Time: {formatTime(timeLeft)}
            </div>
          )}
        </Card.Header>
        
        <Card.Body>
          <div className="mb-3">
            <ProgressBar now={progress} label={`${Math.round(progress)}%`} />
            <div className="text-muted mt-1">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Question {currentQuestionIndex + 1}</Card.Title>
              <Card.Text>{currentQuestion.question_text}</Card.Text>
              
              {currentQuestion.question_type === 'multiple_choice' ? (
                <Form>
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <Form.Check
                      key={option}
                      type="radio"
                      id={`option-${option}`}
                      label={currentQuestion[`option_${option.toLowerCase()}`]}
                      name={`question-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id] === option}
                      onChange={() => handleAnswerChange(currentQuestion.id, option)}
                      className="mb-2"
                    />
                  ))}
                </Form>
              ) : (
                <Form.Group>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  />
                </Form.Group>
              )}
            </Card.Body>
          </Card>
          
          <div className="d-flex justify-content-between">
            <Button 
              variant="outline-secondary" 
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            {currentQuestionIndex < questions.length - 1 ? (
              <Button 
                variant="primary" 
                onClick={goToNextQuestion}
              >
                Next
              </Button>
            ) : (
              <Button 
                variant="success" 
                onClick={handleSubmitTest}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Submit Test'}
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TakeTest;