import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const CreateTest = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [useDocument, setUseDocument] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    getUser();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
      
      if (!allowedExtensions.includes(fileExtension)) {
        setError('Please upload a PDF, Word document (DOC/DOCX), or PowerPoint (PPT/PPTX) file');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const handleGenerateQuestions = async () => {
    if (useDocument) {
      if (!selectedFile) {
        setError('Please select a document file');
        return;
      }
    } else {
      if (!title || !topics) {
        setError('Please provide a title and at least one topic');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (useDocument && selectedFile) {
        // Generate questions from document
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('difficulty', difficulty);
        formData.append('count', questionCount.toString());
        formData.append('question_types', JSON.stringify(['multiple_choice', 'true_false']));
        
        const response = await fetch('http://localhost:8000/questions/generate-from-document', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to generate questions from document');
        }
        
        const data = await response.json();
        setGeneratedQuestions(data.questions);
      } else {
        // Generate questions from topics (original method)
        const topicsList = topics.split(',').map(topic => topic.trim());
        
        const response = await fetch('http://localhost:8000/questions/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topics: topicsList,
            difficulty,
            count: questionCount,
            question_types: ['multiple_choice', 'true_false']
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate questions');
        }
        
        const data = await response.json();
        setGeneratedQuestions(data.questions);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!title) {
      setError('Please provide a test title');
      return;
    }
    
    if (!useDocument && !topics) {
      setError('Please provide at least one topic or upload a document');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use document name as topic if using document, otherwise use provided topics
      const topicsList = useDocument && selectedFile
        ? [selectedFile.name.replace(/\.[^/.]+$/, '')] // Use filename without extension
        : topics.split(',').map(topic => topic.trim()).filter(t => t.length > 0);
      
      // Create test in Supabase
      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert({
          title,
          description,
          difficulty,
          question_count: questionCount,
          time_limit_minutes: timeLimit,
          is_published: true,
          user_id: user.id
        })
        .select('id')
        .single();
        
      if (testError) throw testError;

      // Update topics in a separate call to avoid schema cache issue
      const { error: updateTopicsError } = await supabase
        .from('tests')
        .update({ topics: topicsList })
        .eq('id', test.id);

      if (updateTopicsError) throw updateTopicsError;
      
      // If we have generated questions, add them to the test
      if (generatedQuestions.length > 0) {
        const questionsToInsert = generatedQuestions.map(q => ({
          test_id: test.id,
          question_text: q.content || q.question_text,
          option_a: q.options ? q.options[0] : q.option_a,
          option_b: q.options ? q.options[1] : q.option_b,
          option_c: q.options ? q.options[2] : q.option_c,
          option_d: q.options ? q.options[3] : q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || difficulty,
          question_type: q.question_type,
          approved: true
        }));
        
        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);
          
        if (questionsError) throw questionsError;
      }
      
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <h1 className="my-4">Create New Test</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Test Title</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter test title"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter test description"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="use-document-switch"
                label="Generate questions from document (PDF, PPT, Word)"
                checked={useDocument}
                onChange={(e) => {
                  setUseDocument(e.target.checked);
                  if (e.target.checked) {
                    setTopics('');
                  }
                }}
              />
            </Form.Group>

            {useDocument ? (
              <Form.Group className="mb-3">
                <Form.Label>Upload Document (PDF, PPT, Word)</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  required={useDocument}
                />
                <Form.Text className="text-muted">
                  Supported formats: PDF, DOC, DOCX, PPT, PPTX
                </Form.Text>
                {selectedFile && (
                  <div className="mt-2">
                    <small className="text-success">Selected: {selectedFile.name}</small>
                  </div>
                )}
              </Form.Group>
            ) : (
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Topics (comma-separated)</Form.Label>
                    <Form.Control
                      type="text"
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder="AI, Machine Learning, Neural Networks"
                      required={!useDocument}
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Difficulty</Form.Label>
                  <Form.Select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Number of Questions</Form.Label>
                  <Form.Control
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    min={1}
                    max={50}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Time Limit (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    min={5}
                    max={180}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <div className="d-flex justify-content-between">
              <Button
                variant="outline-primary"
                onClick={handleGenerateQuestions}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate AI Questions'}
              </Button>
              
              <Button
                variant="primary"
                onClick={handleCreateTest}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Test'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {generatedQuestions.length > 0 && (
        <Card>
          <Card.Header>
            <h4>Generated Questions Preview</h4>
          </Card.Header>
          <Card.Body>
            <p>Successfully generated {generatedQuestions.length} questions!</p>
            <p>Click "Create Test" to save this test with the generated questions.</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default CreateTest;