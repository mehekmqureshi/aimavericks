/**
 * CreateDPP Page
 * 
 * Product creation page with multi-step lifecycle form, AI autofill,
 * and confetti animation on successful save.
 * 
 * Requirements: 3.1-3.6, 7.1-7.3, 15.1-15.5, 24.6-24.11
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import Lifecycle_Form from '../components/Lifecycle_Form';
import type { LifecycleData, CreateProductResponse } from '../../../shared/types';
import apiClient, { getErrorMessage } from '../services/apiClient';
import './CreateDPP.css';

export default function CreateDPP() {
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAIAutofill = async () => {
    if (!productName || !productCategory) {
      alert('Please enter product name and category first.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await apiClient.post('/ai/generate', {
        productName,
        category: productCategory
      });

      // Extract the generated content from the response
      const generatedText = response.data.generatedContent || response.data.description || response.data;
      
      // If it's still an object, stringify it (shouldn't happen but safety check)
      if (typeof generatedText === 'object') {
        console.error('Unexpected response format:', generatedText);
        setProductDescription(JSON.stringify(generatedText));
      } else {
        setProductDescription(generatedText);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      alert(`AI generation failed: ${getErrorMessage(error)}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (lifecycleData: LifecycleData) => {
    try {
      const response = await apiClient.post<CreateProductResponse>('/products', {
        name: productName,
        description: productDescription,
        category: productCategory,
        lifecycleData
      });

      // Trigger confetti animation
      triggerConfetti();

      // Show success message with badge
      setTimeout(() => {
        alert(`Product created successfully!\n\nCarbon Footprint: ${response.data.carbonFootprint.toFixed(2)} kg CO2\nBadge: ${response.data.badge.name}`);
        navigate('/products');
      }, 1000);
    } catch (error) {
      console.error('Product creation failed:', error);
      throw error;
    }
  };

  const handleSaveDraft = async (lifecycleData: Partial<LifecycleData>) => {
    try {
      await apiClient.post('/drafts', {
        name: productName,
        description: productDescription,
        category: productCategory,
        lifecycleData
      });
    } catch (error) {
      console.error('Draft save failed:', error);
      throw error;
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  return (
    <div className="create-dpp-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="page-title-icon">📦</span>
          Create Digital Product Passport
        </h1>
        <p className="page-subtitle">
          Add comprehensive lifecycle data to create a transparent sustainability profile
        </p>
      </div>

      {!showForm ? (
        <div className="product-info-card">
          <h2 className="card-title">
            <span>📝</span>
            Product Information
          </h2>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Product Name
                <span className="required-indicator">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Organic Cotton T-Shirt"
                className="form-input"
              />
              <span className="form-hint">Enter a clear, descriptive product name</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Category
                <span className="required-indicator">*</span>
              </label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="form-select"
              >
                <option value="">Select a category</option>
                <option value="Apparel">👕 Apparel</option>
                <option value="Footwear">👟 Footwear</option>
                <option value="Accessories">👜 Accessories</option>
                <option value="Home Textiles">🏠 Home Textiles</option>
                <option value="Electronics">💻 Electronics</option>
                <option value="Other">📦 Other</option>
              </select>
              <span className="form-hint">Choose the most appropriate category</span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Description
                <button
                  onClick={handleAIAutofill}
                  disabled={isGeneratingAI || !productName || !productCategory}
                  className="ai-autofill-btn"
                  title="Generate description using AI"
                >
                  <svg className="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isGeneratingAI ? 'Generating...' : 'AI Autofill'}
                </button>
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product's features, materials, and sustainability highlights..."
                className="form-textarea"
              />
              <span className="form-hint">
                {isGeneratingAI ? '✨ AI is generating a description...' : 'Optional: Add a detailed description or use AI to generate one'}
              </span>
            </div>

            <div className="form-actions">
              <button
                onClick={() => setShowForm(true)}
                disabled={!productName || !productCategory}
                className="btn-primary"
              >
                <span className="btn-icon">→</span>
                Continue to Lifecycle Data
              </button>
              <button
                onClick={() => navigate('/products')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Lifecycle_Form
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
        />
      )}
    </div>
  );
}
