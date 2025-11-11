import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Carousel, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FaRobot, FaChartLine, FaUserGraduate, FaStar, FaTrophy, FaBookOpen } from 'react-icons/fa';

// Default sample items shown when no tests are published yet
const mockTrendingTests = [
  { id: crypto.randomUUID(), title: 'Python Basics', attempts: 120 },
  { id: crypto.randomUUID(), title: 'AI Fundamentals', attempts: 95 },
  { id: crypto.randomUUID(), title: 'Data Structures', attempts: 80 },
];

const Home = () => {
  const [user, setUser] = useState(null);
  const [trendingTests, setTrendingTests] = useState([]);

  useEffect(() => {
    const init = async () => {
      // Get current session user (if any)
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);

      // Fetch latest published tests to display in carousel
      try {
        const { data, error } = await supabase
          .from('tests')
          .select('id, title, attempts')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        // Use fetched data or fallback to mock examples
        if (data && data.length > 0) {
          setTrendingTests(data);
        } else {
          setTrendingTests(mockTrendingTests);
        }
      } catch (err) {
        console.error('Failed to fetch trending tests:', err.message);
        setTrendingTests(mockTrendingTests);
      }
    };

    init();
  }, []);

  return (
    <Container>
      <Row className="my-5 text-center">
        <Col>
          <h1 className="display-4 fw-bold mb-3">AI-Powered Exam Preparation</h1>
          <p className="lead mb-1">
            {user ? (
              <>
                Welcome back, <span className="fw-semibold">{user.user_metadata?.full_name || user.email}</span>! Ready to level up?
              </>
            ) : (
              <>Create custom mock tests, practice with AI-generated questions, and track your progress.</>
            )}
          </p>
        </Col>
      </Row>

      <Row className="mb-4 justify-content-center">
        <Col md={8}>
          <Carousel fade interval={4000} className="shadow rounded">
            {trendingTests.length > 0 ? (
              trendingTests.map(test => (
                <Carousel.Item key={test.id}>
                  <div className="p-4 bg-light rounded">
                    <h4 className="mb-2"><FaStar className="text-warning mb-1" /> Trending: {test.title}</h4>
                    {/* Show attempts if column present */}
                    {test.attempts !== undefined && (
                      <p className="mb-1">Attempts: <Badge bg="info">{test.attempts}</Badge></p>
                    )}
                    <Link to={user ? `/take-test/${test.id}` : "/login"}>
                      <Button variant="outline-primary">{user ? 'Take Test' : 'Login to Try'}</Button>
                    </Link>
                  </div>
                </Carousel.Item>
              ))
            ) : (
              <Carousel.Item>
                <div className="p-4 bg-light rounded">
                  <p>No published tests available yet.</p>
                </div>
              </Carousel.Item>
            )}
          </Carousel>
        </Col>
      </Row>

      <Row className="my-5">
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm border-0 animate__animated animate__fadeInUp">
            <Card.Body>
              <FaBookOpen size={36} className="mb-2 text-primary" />
              <Card.Title>Create Custom Tests</Card.Title>
              <Card.Text>
                Design personalized mock tests by selecting topics, difficulty levels, and question types.
              </Card.Text>
              <Link to="/create-test">
                <Button variant="primary">Get Started</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm border-0 animate__animated animate__fadeInUp animate__delay-1s">
            <Card.Body>
              <FaRobot size={36} className="mb-2 text-success" />
              <Card.Title>AI-Generated Questions</Card.Title>
              <Card.Text>
                Practice with dynamically generated questions tailored to your learning needs.
              </Card.Text>
              <Link to="/login">
                <Button variant="success">Try Now</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm border-0 animate__animated animate__fadeInUp animate__delay-2s">
            <Card.Body>
              <FaChartLine size={36} className="mb-2 text-warning" />
              <Card.Title>Track Your Progress</Card.Title>
              <Card.Text>
                Monitor your performance with detailed analytics and personalized insights.
              </Card.Text>
              <Link to="/dashboard">
                <Button variant="warning">View Dashboard</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={6} className="mb-4">
          <Card className="h-100 border-0 shadow animate__animated animate__fadeInLeft">
            <Card.Body>
              <FaTrophy size={32} className="mb-2 text-danger" />
              <Card.Title>Leaderboards</Card.Title>
              <Card.Text>
                Compete with others and climb the leaderboards by scoring high on mock tests.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="h-100 border-0 shadow animate__animated animate__fadeInRight">
            <Card.Body>
              <FaUserGraduate size={32} className="mb-2 text-info" />
              <Card.Title>Personalized Recommendations</Card.Title>
              <Card.Text>
                Get AI-powered suggestions for what to study next based on your progress and interests.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;