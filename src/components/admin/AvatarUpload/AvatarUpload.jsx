import React, { useState, useRef } from 'react';
import { Camera, User, X, Check } from 'lucide-react';

const AvatarUpload = ({ 
  currentAvatar = '', 
  onAvatarChange = () => {}, 
  userId = '',
  disabled = false 
}) => {
  const [previewUrl, setPreviewUrl] = useState(currentAvatar);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear previous messages
    setError('');
    setSuccess('');

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, GIF)');
      return;
    }

    try {
      setIsUploading(true);
      
      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      
      // Simulate upload delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update preview
      setPreviewUrl(objectUrl);
      
      // Prepare avatar data
      const avatarData = {
        file: file,
        url: objectUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      };
      
      // Save to localStorage for persistence (optional)
      if (userId) {
        const savedAvatars = JSON.parse(localStorage.getItem('userAvatars') || '{}');
        savedAvatars[userId] = {
          url: objectUrl,
          name: file.name,
          uploadedAt: new Date().toISOString()
        };
        localStorage.setItem('userAvatars', JSON.stringify(savedAvatars));
      }
      
      // Callback to parent component
      onAvatarChange(avatarData);
      
      setSuccess('Avatar berhasil diupload!');
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Gagal mengupload avatar: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl('');
    setError('');
    setSuccess('');
    
    // Clear from localStorage
    if (userId) {
      const savedAvatars = JSON.parse(localStorage.getItem('userAvatars') || '{}');
      delete savedAvatars[userId];
      localStorage.setItem('userAvatars', JSON.stringify(savedAvatars));
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    onAvatarChange(null);
  };

  const triggerFileSelect = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Clear messages after 3 seconds
  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="avatar-upload-container">
      <div className="avatar-upload-wrapper">
        {/* Avatar Display */}
        <div className="avatar-display">
          {previewUrl ? (
            <div className="avatar-image-container">
              <img 
                src={previewUrl} 
                alt="Avatar Preview" 
                className="avatar-image"
              />
              {!disabled && (
                <button
                  type="button"
                  className="remove-avatar-btn"
                  onClick={handleRemoveAvatar}
                  title="Hapus Avatar"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="avatar-placeholder">
              <User size={40} />
            </div>
          )}
          
          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="upload-overlay">
              <div className="upload-spinner"></div>
            </div>
          )}
        </div>

        {/* Upload Info & Button */}
        <div className="avatar-info">
          <h3>Foto Profil</h3>
          <p>JPG, PNG atau GIF. Maksimal 5MB</p>
          
          <div className="upload-actions">
            <button
              type="button"
              className={`upload-btn ${isUploading ? 'uploading' : ''}`}
              onClick={triggerFileSelect}
              disabled={disabled || isUploading}
            >
              <Camera size={16} />
              {isUploading ? 'Mengupload...' : previewUrl ? 'Ganti Foto' : 'Upload Foto'}
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="message error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="message success-message">
          <Check size={16} />
          {success}
        </div>
      )}

      <style jsx>{`
        .avatar-upload-container {
          width: 100%;
        }

        .avatar-upload-wrapper {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px dashed #d1d5db;
          transition: all 0.3s ease;
        }

        .avatar-upload-wrapper:hover {
          border-color: #667eea;
          background: #f1f5f9;
        }

        .avatar-display {
          position: relative;
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }

        .avatar-image-container {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .remove-avatar-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dc2626;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .remove-avatar-btn:hover {
          background: #b91c1c;
          transform: scale(1.1);
        }

        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #ffffff30;
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .avatar-info {
          flex: 1;
        }

        .avatar-info h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .avatar-info p {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 12px 0;
        }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #667eea;
          color: white;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          font-family: inherit;
        }

        .upload-btn:hover:not(:disabled) {
          background: #5a67d8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .upload-btn.uploading {
          background: #6b7280;
        }

        .message {
          margin-top: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeIn 0.3s ease;
        }

        .success-message {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .avatar-upload-wrapper {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .avatar-display {
            width: 100px;
            height: 100px;
          }
        }
      `}</style>
    </div>
  );
};

export default AvatarUpload;