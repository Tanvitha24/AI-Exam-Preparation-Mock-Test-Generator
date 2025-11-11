import React, { useState, useRef } from 'react';
import { Container, Card, Button, Alert, Form, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './QuestionGenerator.css';

const QuestionGenerator = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [questionType, setQuestionType] = useState('multiple_choice');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editModalShow, setEditModalShow] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      setError(`Unsupported file type. Supported formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG`);
      return;
    }

    if (file.size > maxFileSize) {
      setError('File size exceeds 10MB limit');
      return;
    }

    setSelectedFile(file);
    setError('');
    setGeneratedQuestions([]);
    setRevealedAnswers({});
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleGenerateQuestions = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('difficulty', 'medium');
      formData.append('count', '10');
      formData.append('question_types', JSON.stringify([questionType]));
      
      const response = await fetch('http://localhost:8000/questions/generate-from-document', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate questions');
      }
      
      const data = await response.json();
      setGeneratedQuestions(data.questions || []);
      setRevealedAnswers({});
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAnswer = (index) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleEditQuestion = (question, index) => {
    setEditingQuestion({ ...question, index });
    setEditModalShow(true);
  };

  const handleSaveEdit = () => {
    if (editingQuestion) {
      const updated = [...generatedQuestions];
      updated[editingQuestion.index] = editingQuestion;
      setGeneratedQuestions(updated);
      setEditModalShow(false);
      setEditingQuestion(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Container className="question-generator-container">
      <div className="text-center mb-5">
        <h1 className="display-4 mb-3">AI Question Generator</h1>
        <p className="lead text-muted">
          Upload your document and instantly generate multiple-choice, true-or-false, or open-ended questions
        </p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Card className="upload-card mb-4">
        <Card.Body className="p-5">
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            
            {!selectedFile ? (
              <>
                <div className="upload-icon mb-3">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <h4 className="mb-2">Choose Files</h4>
                <p className="text-muted mb-3">or drop files here</p>
                <p className="text-muted small">
                  Add PDF, image, Word, Excel, and PowerPoint files
                </p>
                <div className="supported-formats mt-3">
                  <Badge bg="secondary" className="me-2">PDF</Badge>
                  <Badge bg="secondary" className="me-2">DOC</Badge>
                  <Badge bg="secondary" className="me-2">XLS</Badge>
                  <Badge bg="secondary" className="me-2">PPT</Badge>
                  <Badge bg="secondary" className="me-2">PNG</Badge>
                  <Badge bg="secondary" className="me-2">JPG</Badge>
                </div>
              </>
            ) : (
              <div className="file-selected">
                <div className="file-icon mb-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <h5>{selectedFile.name}</h5>
                <p className="text-muted small">{formatFileSize(selectedFile.size)}</p>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setGeneratedQuestions([]);
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="mt-4">
              <Form.Group className="mb-3">
                <Form.Label>Question Type</Form.Label>
                <Form.Select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True or False</option>
                  <option value="open_ended">Open Ended</option>
                </Form.Select>
              </Form.Group>

              <Button
                variant="primary"
                size="lg"
                className="w-100"
                onClick={handleGenerateQuestions}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generating questions...
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {generatedQuestions.length > 0 && (
        <Card className="questions-card">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">Generated Questions ({generatedQuestions.length})</h4>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                setGeneratedQuestions([]);
                setRevealedAnswers({});
              }}
            >
              Clear All
            </Button>
          </Card.Header>
          <Card.Body>
            {generatedQuestions.map((question, index) => (
              <div key={index} className="question-item mb-4 p-3 border rounded">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="mb-0">Question {index + 1}</h5>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleEditQuestion(question, index)}
                  >
                    Edit
                  </Button>
                </div>
                
                <p className="question-text mb-3">{question.content || question.question_text}</p>
                
                {question.options && question.options.length > 0 && (
                  <div className="options-list mb-3">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`option-item p-2 mb-2 rounded ${
                          question.correct_answer === option ? 'correct-answer' : ''
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </div>
                    ))}
                  </div>
                )}

                <div className="answer-section">
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => toggleAnswer(index)}
                    className="mb-2"
                  >
                    {revealedAnswers[index] ? 'Hide' : 'Reveal'} Answer
                  </Button>
                  
                  {revealedAnswers[index] && (
                    <div className="answer-reveal p-3 bg-light rounded">
                      <strong>Correct Answer:</strong> {question.correct_answer}
                      {question.explanation && (
                        <div className="mt-2">
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal show={editModalShow} onHide={() => setEditModalShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingQuestion && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Question</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editingQuestion.content || editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    content: e.target.value,
                    question_text: e.target.value
                  })}
                />
              </Form.Group>
              
              {editingQuestion.options && (
                <Form.Group className="mb-3">
                  <Form.Label>Options</Form.Label>
                  {editingQuestion.options.map((option, idx) => (
                    <Form.Control
                      key={idx}
                      className="mb-2"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[idx] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                      }}
                    />
                  ))}
                </Form.Group>
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Correct Answer</Form.Label>
                <Form.Control
                  value={editingQuestion.correct_answer || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    correct_answer: e.target.value
                  })}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Explanation</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    explanation: e.target.value
                  })}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditModalShow(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default QuestionGenerator;

