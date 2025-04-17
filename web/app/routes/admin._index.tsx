import React from 'react';
import { useLoaderData, Link } from '@remix-run/react';
import { json, LoaderFunction, redirect } from '@remix-run/node';

// Use the same password as in admin.tsx
const ADMIN_PASSWORD = "okayscale";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const adminToken = url.searchParams.get('adminToken');
  
  if (!adminToken || adminToken !== ADMIN_PASSWORD) {
    return redirect('/admin');
  }
  
  return json({ adminToken });
};

export default function AdminHome() {
  const { adminToken } = useLoaderData<{ adminToken: string }>();
  
  return (
    <div className="admin-home">
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h2 className="m-0">Section Store Admin Dashboard</h2>
        </div>
        <div className="card-body">
          <p className="lead">Welcome to the OkayScale Section Store Admin Dashboard!</p>
          <p>From here you can manage your section library and upload new sections.</p>
          
          <div className="row mt-4">
            <div className="col-md-6">
              <div className="card mb-3">
                <div className="card-header bg-info text-white">
                  <h4 className="m-0">Manage Sections</h4>
                </div>
                <div className="card-body">
                  <p>View, edit, and delete sections in your library.</p>
                  <Link to={`/admin/sections?adminToken=${adminToken}`} className="btn btn-primary">
                    Manage Sections
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="card mb-3">
                <div className="card-header bg-success text-white">
                  <h4 className="m-0">Upload New Section</h4>
                </div>
                <div className="card-body">
                  <p>Add a new section to your library.</p>
                  <Link to={`/admin/upload?adminToken=${adminToken}`} className="btn btn-primary">
                    Upload Section
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 