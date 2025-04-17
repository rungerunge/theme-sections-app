import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

interface Section {
  id: string;
  title: string;
  description: string;
  previewUrl?: string;
  price?: string;
  categories: string[];
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const adminToken = url.searchParams.get('adminToken');
  
  if (!adminToken) {
    throw new Response('Unauthorized', { status: 401 });
  }
  
  // Fetch sections from the server-side API
  try {
    const response = await fetch(`${url.origin}/api/sections`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sections: ${response.statusText}`);
    }
    
    const sections = await response.json();
    return json({ sections });
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    return json({ sections: [], error: error.message });
  }
};

export default function AdminSections() {
  const { sections } = useLoaderData<{ sections: Section[], error?: string }>();
  const [searchParams] = useSearchParams();
  const adminToken = searchParams.get('adminToken') || '';
  const navigate = useNavigate();
  
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    categories: '',
    price: 'Free'
  });
  
  // When selecting a section to edit, populate the form
  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setEditForm({
      title: section.title,
      description: section.description,
      categories: section.categories.join(', '),
      price: section.price || 'Free'
    });
  };
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Save edited section
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSection) return;
    
    try {
      const updatedSection = {
        ...editingSection,
        title: editForm.title,
        description: editForm.description,
        categories: editForm.categories.split(',').map(cat => cat.trim()),
        price: editForm.price
      };
      
      // Call the API to update the section
      const response = await fetch(`/api/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          section: updatedSection,
          adminToken
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update section: ${response.statusText}`);
      }
      
      // Refresh the page to show updated data
      navigate(`/admin/sections?adminToken=${adminToken}`);
    } catch (error) {
      console.error('Error updating section:', error);
      alert('Failed to update section. Please try again.');
    }
  };
  
  // Delete a section
  const handleDelete = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/sections/${sectionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminToken })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete section: ${response.statusText}`);
      }
      
      // Refresh the page to show updated data
      navigate(`/admin/sections?adminToken=${adminToken}`);
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Failed to delete section. Please try again.');
    }
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Manage Sections</h1>
        <button 
          className="btn btn-success"
          onClick={() => navigate(`/admin/upload?adminToken=${adminToken}`)}
        >
          Upload New Section
        </button>
      </div>
      
      {editingSection && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Edit Section: {editingSection.id}</h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={() => setEditingSection(null)}
              aria-label="Close"
            ></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label htmlFor="title" className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  id="title"
                  name="title"
                  value={editForm.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  className="form-control"
                  id="description"
                  name="description"
                  value={editForm.description}
                  onChange={handleChange}
                  rows={3}
                  required
                ></textarea>
              </div>
              <div className="mb-3">
                <label htmlFor="categories" className="form-label">Categories (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  id="categories"
                  name="categories"
                  value={editForm.categories}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="price" className="form-label">Price</label>
                <input
                  type="text"
                  className="form-control"
                  id="price"
                  name="price"
                  value={editForm.price}
                  onChange={handleChange}
                />
              </div>
              <div className="d-flex justify-content-end">
                <button type="button" className="btn btn-secondary me-2" onClick={() => setEditingSection(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Preview</th>
              <th>Title</th>
              <th>Description</th>
              <th>Categories</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4">No sections found</td>
              </tr>
            ) : (
              sections.map(section => (
                <tr key={section.id}>
                  <td>{section.id}</td>
                  <td className="text-center">
                    {section.previewUrl ? (
                      <img 
                        src={section.previewUrl} 
                        alt={section.title} 
                        className="img-thumbnail" 
                        style={{ maxWidth: '100px', maxHeight: '75px' }} 
                      />
                    ) : (
                      <div className="text-muted small">No preview</div>
                    )}
                  </td>
                  <td>{section.title}</td>
                  <td>{section.description}</td>
                  <td>
                    {section.categories.map(cat => (
                      <span key={cat} className="badge bg-secondary me-1">{cat}</span>
                    ))}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleEdit(section)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleDelete(section.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 