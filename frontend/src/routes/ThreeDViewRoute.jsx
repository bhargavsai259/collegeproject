import React, { useState } from 'react';
import ThreeDView from '../ThreeDView';

export default function ThreeDViewRoute() {
  const [rooms, setRooms] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleUpload = async (event) => {
    const files = event.target.files;
    setSelectedFiles(Array.from(files));
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        setRooms([]);
        alert('Upload failed: ' + res.status);
        return;
      }
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      setRooms([]);
      alert('Error uploading images: ' + err);
    }
  };

  return (
    <div style={{ display: 'flex', height: '80vh', gap: 24 }}>
      {/* Left side: Upload */}
      <div style={{ flex: '0 0 320px', background: '#fafbfc', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px #0001', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: 24 }}>Upload Room Images</h2>
        <input type="file" multiple accept="image/*" onChange={handleUpload} style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>Select one or more images to generate a 3D view.</div>
        {selectedFiles.length > 0 && (
          <div style={{ marginTop: 16, width: '100%' }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>Preview:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selectedFiles.map((file, idx) => (
                <img
                  key={idx}
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Right side: 3D View */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: 16 }}>3D Room View</h2>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ThreeDView rooms={rooms} />
        </div>
      </div>
    </div>
  );
}
