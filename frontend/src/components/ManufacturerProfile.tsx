/**
 * Manufacturer Profile Component
 * 
 * Displays and allows editing of manufacturer profile information.
 * Supports updating name, location, certifications, and contact email.
 * 
 * Requirements: 2.2, 2.3
 */

import React, { useState, useEffect } from 'react';
import apiClient, { getErrorMessage } from '../services/apiClient';
import type { Manufacturer } from '../../../shared/types';
import './ManufacturerProfile.css';

// ============================================================================
// Types
// ============================================================================

interface ManufacturerProfileProps {
  manufacturerId: string;
}

interface UpdateManufacturerRequest {
  name?: string;
  location?: string;
  certifications?: string[];
  contactEmail?: string;
}

// ============================================================================
// Component
// ============================================================================

export const ManufacturerProfile: React.FC<ManufacturerProfileProps> = ({ manufacturerId }) => {
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    certifications: [] as string[],
    contactEmail: '',
  });

  // Certification input state
  const [newCertification, setNewCertification] = useState('');

  /**
   * Fetch manufacturer profile data
   */
  const fetchManufacturer = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get<Manufacturer>(`/manufacturers/${manufacturerId}`);
      const data = response.data;

      setManufacturer(data);
      setFormData({
        name: data.name,
        location: data.location,
        certifications: [...data.certifications],
        contactEmail: data.contactEmail,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update manufacturer profile
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Validate form
      if (!formData.name.trim()) {
        setError('Manufacturer name is required');
        return;
      }

      if (!formData.location.trim()) {
        setError('Location is required');
        return;
      }

      if (!formData.contactEmail.trim()) {
        setError('Contact email is required');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail)) {
        setError('Please enter a valid email address');
        return;
      }

      const updateData: UpdateManufacturerRequest = {
        name: formData.name,
        location: formData.location,
        certifications: formData.certifications,
        contactEmail: formData.contactEmail,
      };

      const response = await apiClient.put<Manufacturer>(
        `/manufacturers/${manufacturerId}`,
        updateData
      );

      setManufacturer(response.data);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel editing and reset form
   */
  const handleCancel = () => {
    if (manufacturer) {
      setFormData({
        name: manufacturer.name,
        location: manufacturer.location,
        certifications: [...manufacturer.certifications],
        contactEmail: manufacturer.contactEmail,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  /**
   * Add certification to the list
   */
  const handleAddCertification = () => {
    const trimmed = newCertification.trim();
    if (trimmed && !formData.certifications.includes(trimmed)) {
      setFormData({
        ...formData,
        certifications: [...formData.certifications, trimmed],
      });
      setNewCertification('');
    }
  };

  /**
   * Remove certification from the list
   */
  const handleRemoveCertification = (index: number) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index),
    });
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  /**
   * Load manufacturer data on mount
   */
  useEffect(() => {
    fetchManufacturer();
  }, [manufacturerId]);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="manufacturer-profile">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  if (error && !manufacturer) {
    return (
      <div className="manufacturer-profile">
        <div className="error-message">
          <p>Failed to load profile: {error}</p>
          <button onClick={fetchManufacturer} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="manufacturer-profile">
        <div className="error-message">Manufacturer not found</div>
      </div>
    );
  }

  return (
    <div className="manufacturer-profile">
      <div className="profile-header">
        <h2>Manufacturer Profile</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="edit-button"
          >
            Edit Profile
          </button>
        )}
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="profile-content">
        {/* Manufacturer Name */}
        <div className="form-group">
          <label htmlFor="name">Manufacturer Name</label>
          {isEditing ? (
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter manufacturer name"
              className="form-input"
            />
          ) : (
            <div className="form-value">{manufacturer.name}</div>
          )}
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location</label>
          {isEditing ? (
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter location (e.g., City, Country)"
              className="form-input"
            />
          ) : (
            <div className="form-value">{manufacturer.location}</div>
          )}
        </div>

        {/* Contact Email */}
        <div className="form-group">
          <label htmlFor="contactEmail">Contact Email</label>
          {isEditing ? (
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              placeholder="Enter contact email"
              className="form-input"
            />
          ) : (
            <div className="form-value">{manufacturer.contactEmail}</div>
          )}
        </div>

        {/* Certifications */}
        <div className="form-group">
          <label>Certifications</label>
          {isEditing ? (
            <div className="certifications-edit">
              <div className="certifications-list">
                {formData.certifications.length === 0 ? (
                  <div className="no-certifications">No certifications added</div>
                ) : (
                  formData.certifications.map((cert, index) => (
                    <div key={index} className="certification-tag">
                      <span>{cert}</span>
                      <button
                        onClick={() => handleRemoveCertification(index)}
                        className="remove-cert-button"
                        aria-label="Remove certification"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="add-certification">
                <input
                  type="text"
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCertification();
                    }
                  }}
                  placeholder="Add certification (e.g., ISO 9001)"
                  className="form-input"
                />
                <button
                  onClick={handleAddCertification}
                  className="add-cert-button"
                  disabled={!newCertification.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <div className="certifications-display">
              {manufacturer.certifications.length === 0 ? (
                <div className="no-certifications">No certifications</div>
              ) : (
                manufacturer.certifications.map((cert, index) => (
                  <div key={index} className="certification-badge">
                    {cert}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="profile-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Created:</span>
            <span className="metadata-value">
              {new Date(manufacturer.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Last Updated:</span>
            <span className="metadata-value">
              {new Date(manufacturer.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="form-actions">
            <button
              onClick={handleCancel}
              className="cancel-button"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="save-button"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManufacturerProfile;
