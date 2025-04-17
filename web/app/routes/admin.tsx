import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

// This is a simple in-memory auth check - in production, you'd use a more secure method
// like storing a secure session token in a cookie with proper encryption
const ADMIN_PASSWORD = "your-secure-password"; // Change this to your own secure password

// Check if the user is authenticated
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const adminToken = url.searchParams.get('adminToken');
  
  // If it's the login page, just render it
  if (url.pathname === '/admin' && !adminToken) {
    return json({ isAuthenticated: false });
  }
  
  // For any other admin routes, verify the token
  if (!adminToken || adminToken !== ADMIN_PASSWORD) {
    return redirect('/admin');
  }
  
  return json({ isAuthenticated: true, adminToken });
};

export default function AdminLayout() {
  const { isAuthenticated, adminToken } = useLoaderData<{ isAuthenticated: boolean, adminToken?: string }>();
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      navigate(`/admin/sections?adminToken=${password}`);
    } else {
      alert('Incorrect password');
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h2 className="mb-0">Admin Login</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Admin Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      id="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Login</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="admin-container">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
        <div className="container">
          <Link to={`/admin/sections?adminToken=${adminToken}`} className="navbar-brand">OkayScale Admin</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNavbar">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="adminNavbar">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link to={`/admin/sections?adminToken=${adminToken}`} className="nav-link">Sections</Link>
              </li>
              <li className="nav-item">
                <Link to={`/admin/upload?adminToken=${adminToken}`} className="nav-link">Upload</Link>
              </li>
            </ul>
            <div className="d-flex">
              <Link to="/app" className="btn btn-outline-light">Back to App</Link>
            </div>
          </div>
        </div>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
} 