// import React, { useState, useEffect } from 'react';
// import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
// import { Link } from 'react-router-dom';
// import { supabase } from '../supabaseClient';

// const Dashboard = () => {
//   const [user, setUser] = useState(null);
//   const [tests, setTests] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const getUser = async () => {
//       const { data: { session } } = await supabase.auth.getSession();
//       setUser(session?.user || null);
      
//       if (session?.user) {
//         fetchUserTests(session.user.id);
//       } else {
//         setLoading(false);
//       }
//     };
    
//     getUser();
//   }, []);

//   const fetchUserTests = async (userId) => {
//     try {
//       const { data, error } = await supabase
//         .from('tests')
//         .select('*')
//         .eq('created_by', userId)
//         .order('created_at', { ascending: false });
        
//       if (error) throw error;
//       setTests(data || []);
//     } catch (error) {
//       console.error('Error fetching tests:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return <div className="text-center mt-5">Loading...</div>;
//   }

//   return (
//     <Container>
//       <Row className="my-4">
//         <Col>
//           <h1>Dashboard</h1>
//           <p className="lead">Welcome back, {user?.user_metadata?.full_name || 'User'}</p>
//         </Col>
//         <Col xs="auto">
//           <Link to="/create-test">
//             <Button variant="primary">Create New Test</Button>
//           </Link>
//         </Col>
//       </Row>

//       <Row className="mb-4">
//         <Col md={4}>
//           <Card className="mb-4 shadow-sm">
//             <Card.Body>
//               <Card.Title>Tests Created</Card.Title>
//               <h3>{tests.length}</h3>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={4}>
//           <Card className="mb-4 shadow-sm">
//             <Card.Body>
//               <Card.Title>Tests Completed</Card.Title>
//               <h3>0</h3>
//             </Card.Body>
//           </Card>
//         </Col>
//         <Col md={4}>
//           <Card className="mb-4 shadow-sm">
//             <Card.Body>
//               <Card.Title>Average Score</Card.Title>
//               <h3>N/A</h3>
//             </Card.Body>
//           </Card>
//         </Col>
//       </Row>

//       <h2 className="mb-3">Your Tests</h2>
      
//       {tests.length === 0 ? (
//         <Card className="text-center p-5">
//           <Card.Body>
//             <Card.Title>No tests created yet</Card.Title>
//             <Card.Text>
//               Create your first test to start practicing!
//             </Card.Text>
//             <Link to="/create-test">
//               <Button variant="primary">Create Test</Button>
//             </Link>
//           </Card.Body>
//         </Card>
//       ) : (
//         <Row>
//           {tests.map((test) => (
//             <Col md={6} lg={4} key={test.id} className="mb-4">
//               <Card className="h-100 shadow-sm">
//                 <Card.Body>
//                   <Card.Title>{test.title}</Card.Title>
//                   <Card.Subtitle className="mb-2 text-muted">
//                     {test.question_count} questions · {test.time_limit_minutes} minutes
//                   </Card.Subtitle>
//                   <div className="mb-3">
//                     <Badge bg="info" className="me-1">{test.difficulty}</Badge>
//                     {test.topics.map((topic, i) => (
//                       <Badge bg="secondary" key={i} className="me-1">{topic}</Badge>
//                     ))}
//                   </div>
//                   <Card.Text>{test.description}</Card.Text>
//                 </Card.Body>
//                 <Card.Footer>
//                   <Link to={`/take-test/${test.id}`}>
//                     <Button variant="primary" className="w-100">Take Test</Button>
//                   </Link>
//                 </Card.Footer>
//               </Card>
//             </Col>
//           ))}
//         </Row>
//       )}
//     </Container>
//   );
// };

// export default Dashboard;





import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCurrentUser, clearStoredUser } from '../utils/authHelpers';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const activeSessionUser = await getCurrentUser();
    if (activeSessionUser) {
         console.log('Logged in user:', activeSessionUser);
         setUser(activeSessionUser);
         fetchUserTests(activeSessionUser.id);
       } else {
         console.log('No active session found');
         navigate('/login');
       }
     };

    getUser();
  }, [navigate]);

  const fetchUserTests = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched tests:', data);
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('tests')
          .delete()
          .eq('id', testId);

        if (error) throw error;
        setTests(tests.filter((test) => test.id !== testId));
        alert('Test deleted successfully!');
        fetchUserTests(user.id); // Re-fetch tests after successful deletion
      } catch (error) {
        console.error('Error deleting test:', error);
        alert('Failed to delete test: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut failed (possibly offline):', err.message);
    }
    localStorage.removeItem('user');
    await clearStoredUser();
     navigate('/login');
  };

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  return (
    <Container>
      <Row className="my-4 align-items-center">
        <Col>
          <h1>Dashboard</h1>
          <p className="lead">Welcome back, {user?.email || 'User'}</p>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Link to="/create-test">
              <Button variant="primary">Create New Test</Button>
            </Link>
            <Button variant="danger" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>Tests Created</Card.Title>
              <h3>{tests.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>Tests Completed</Card.Title>
              <h3>0</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="mb-4 shadow-sm">
            <Card.Body>
              <Card.Title>Average Score</Card.Title>
              <h3>N/A</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h2 className="mb-3">Your Tests</h2>

      {tests.length === 0 ? (
        <Card className="text-center p-5">
          <Card.Body>
            <Card.Title>No tests created yet</Card.Title>
            <Card.Text>Create your first test to start practicing!</Card.Text>
            <Link to="/create-test">
              <Button variant="primary">Create Test</Button>
            </Link>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {tests.map((test) => (
            <Col md={6} lg={4} key={test.id} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>{test.title}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {test.question_count} questions · {test.time_limit_minutes} minutes
                  </Card.Subtitle>
                  <div className="mb-3">
                    <Badge bg="info" className="me-1">{test.difficulty}</Badge>
                    {Array.isArray(test.topics) &&
                      test.topics.map((topic, i) => (
                        <Badge bg="secondary" key={i} className="me-1">
                          {topic}
                        </Badge>
                      ))}
                  </div>
                  <Card.Text>{test.description}</Card.Text>
                </Card.Body>
                <Card.Footer className="d-flex justify-content-between align-items-center">
                  <Link to={`/take-test/${test.id}`}>
                    <Button variant="primary" className="w-100">
                      Take Test
                    </Button>
                  </Link>
                  <Button variant="danger" onClick={() => handleDeleteTest(test.id)} className="ms-2">
                    Delete
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Dashboard;