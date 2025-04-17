import React, { useState } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import { json, ActionFunction } from '@remix-run/node';
import { useActionData, Form } from '@remix-run/react';

interface ActionData {
  success?: boolean;
  error?: string;
  sectionId?: string;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const adminToken = formData.get('adminToken');
  
  if (!adminToken) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const sectionId = formData.get('sectionId')?.toString();
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString();
    const categories = formData.get('categories')?.toString();
    const price = formData.get('price')?.toString() || 'Free';
    
    if (!sectionId || !title || !description || !categories) {
      return json({ 
        error: 'All fields are required' 
      }, { status: 400 });
    }
    
    // Process the uploaded files
    const sectionFile = formData.get('sectionFile') as File;
    const previewFile = formData.get('previewFile') as File;
    const schemaFile = formData.get('schemaFile') as File;
    const cssFile = formData.get('cssFile') as File;
    const jsFile = formData.get('jsFile') as File;
    
    if (!sectionFile || sectionFile.size === 0) {
      return json({ 
        error: 'Section file is required' 
      }, { status: 400 });
    }
    
    // Convert the section ID to a slug-friendly format
    const safeId = sectionId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Create FormData for the file upload API
    const apiFormData = new FormData();
    apiFormData.append('adminToken', adminToken as string);
    apiFormData.append('sectionId', safeId);
    apiFormData.append('title', title);
    apiFormData.append('description', description);
    apiFormData.append('categories', categories);
    apiFormData.append('price', price);
    apiFormData.append('sectionFile', sectionFile);
    
    if (previewFile && previewFile.size > 0) {
      apiFormData.append('previewFile', previewFile);
    }
    
    if (schemaFile && schemaFile.size > 0) {
      apiFormData.append('schemaFile', schemaFile);
    }
    
    if (cssFile && cssFile.size > 0) {
      apiFormData.append('cssFile', cssFile);
    }
    
    if (jsFile && jsFile.size > 0) {
      apiFormData.append('jsFile', jsFile);
    }
    
    // Call the API to handle the file upload
    const response = await fetch('/api/sections/upload', {
      method: 'POST',
      body: apiFormData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload section');
    }
    
    return json({ 
      success: true,
      sectionId: safeId
    });
  } catch (error: any) {
    console.error('Error uploading section:', error);
    return json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
};

export default function AdminUpload() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const adminToken = searchParams.get('adminToken') || '';
  const navigate = useNavigate();
  
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  
  // Auto-generate a slugified ID based on the title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (newTitle) {
      const slugId = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-');
      setSectionId(slugId);
    }
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Upload New Section</h1>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate(`/admin/sections?adminToken=${adminToken}`)}
        >
          Back to Sections
        </button>
      </div>
      
      {actionData?.success ? (
        <div className="alert alert-success" role="alert">
          <h4 className="alert-heading">Section Uploaded Successfully!</h4>
          <p>Your section "{title}" has been uploaded with ID: {actionData.sectionId}</p>
          <hr />
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/admin/sections?adminToken=${adminToken}`)}
            >
              Go to Sections List
            </button>
            <button 
              className="btn btn-outline-primary"
              onClick={() => window.location.reload()}
            >
              Upload Another Section
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h3 className="mb-0">Section Details</h3>
          </div>
          <div className="card-body">
            {actionData?.error && (
              <div className="alert alert-danger">
                {actionData.error}
              </div>
            )}
            
            <Form method="post" encType="multipart/form-data">
              <input type="hidden" name="adminToken" value={adminToken} />
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="title" className="form-label">Section Title*</label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    name="title"
                    value={title}
                    onChange={handleTitleChange}
                    required
                  />
                  <div className="form-text">A user-friendly title for the section</div>
                </div>
                
                <div className="col-md-6 mb-3">
                  <label htmlFor="sectionId" className="form-label">Section ID*</label>
                  <input
                    type="text"
                    className="form-control"
                    id="sectionId"
                    name="sectionId"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <div className="form-text">Must be lowercase letters, numbers, and hyphens only</div>
                </div>
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description*</label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  rows={3}
                  required
                ></textarea>
                <div className="form-text">A brief description of what the section does</div>
              </div>
              
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label htmlFor="categories" className="form-label">Categories*</label>
                  <input
                    type="text"
                    className="form-control"
                    id="categories"
                    name="categories"
                    placeholder="e.g. header, hero, gallery (comma-separated)"
                    required
                  />
                  <div className="form-text">Comma-separated list of categories</div>
                </div>
                
                <div className="col-md-4 mb-3">
                  <label htmlFor="price" className="form-label">Price</label>
                  <input
                    type="text"
                    className="form-control"
                    id="price"
                    name="price"
                    defaultValue="Free"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="form-label">Required Files</label>
                <div className="card">
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="sectionFile" className="form-label">Section File (section.liquid)*</label>
                      <input
                        type="file"
                        className="form-control"
                        id="sectionFile"
                        name="sectionFile"
                        accept=".liquid"
                        required
                      />
                      <div className="form-text">The main section.liquid file</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="form-label">Optional Files</label>
                <div className="card">
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="previewFile" className="form-label">Preview Image</label>
                      <input
                        type="file"
                        className="form-control"
                        id="previewFile"
                        name="previewFile"
                        accept="image/*"
                      />
                      <div className="form-text">An image preview of the section (PNG, JPG, or SVG)</div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="schemaFile" className="form-label">Schema File (schema.json)</label>
                      <input
                        type="file"
                        className="form-control"
                        id="schemaFile"
                        name="schemaFile"
                        accept=".json"
                      />
                      <div className="form-text">JSON schema for section settings</div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="cssFile" className="form-label">CSS File (style.css)</label>
                      <input
                        type="file"
                        className="form-control"
                        id="cssFile"
                        name="cssFile"
                        accept=".css"
                      />
                      <div className="form-text">CSS styles for the section</div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="jsFile" className="form-label">JavaScript File (script.js)</label>
                      <input
                        type="file"
                        className="form-control"
                        id="jsFile"
                        name="jsFile"
                        accept=".js"
                      />
                      <div className="form-text">JavaScript code for the section</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="d-flex justify-content-end">
                <button 
                  type="button" 
                  className="btn btn-secondary me-2"
                  onClick={() => navigate(`/admin/sections?adminToken=${adminToken}`)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Upload Section
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
} 