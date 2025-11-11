import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../utils/authHelpers';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const activeUser = await getCurrentUser();
      setUser(activeUser);

      if (adminOnly && activeUser && activeUser.id) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', activeUser.id)
            .maybeSingle();
          setIsAdmin(data?.is_admin || false);
        } catch (err) {
          setIsAdmin(false);
        }
      }
      setLoading(false);
    };

    checkUser();
  }, [adminOnly]);

  if (loading) {
    return <div className="text-center mt-5">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;