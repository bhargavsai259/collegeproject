import React, { useState } from 'react';
import ThreeDView from '../ThreeDView';

export default function ThreeDViewRoute() {
  const [rooms, setRooms] = useState([]);

  const handleUpload = async (event) => {
    const files = event.target.files;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    try {
      const res = await fetch('http://localhost:8000/upload', {
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
    <div>
      <h2>3D Room View</h2>
      <input type="file" multiple onChange={handleUpload} />
      <ThreeDView rooms={rooms} />
    </div>
  );
}
